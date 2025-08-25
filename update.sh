#!/bin/bash

# Script de actualización automática para Tractoreando - Producción
# Similar al sistema de Herluent
# Autor: Sistema de Deployment Automático
# Fecha: $(date)

set -e  # Salir si cualquier comando falla

echo "🔄 Iniciando actualización de Tractoreando..."
echo "============================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuración
APP_NAME="tractoreando"
APP_DIR="/opt/$APP_NAME"
APP_USER="$APP_NAME"
BACKUP_DIR="/opt/$APP_NAME/backups"
BRANCH="main"
MAX_BACKUPS=5

# Función para detectar repositorio Git automáticamente
detect_git_repo() {
    local DETECTED_REPO=""
    
    # Intentar detectar desde el directorio actual si existe .git
    if [[ -d ".git" ]]; then
        DETECTED_REPO=$(git remote get-url origin 2>/dev/null || echo "")
    fi
    
    # Si no se detectó, intentar desde el directorio de la aplicación
    if [[ -z "$DETECTED_REPO" && -d "$APP_DIR/.git" ]]; then
        cd "$APP_DIR"
        DETECTED_REPO=$(git remote get-url origin 2>/dev/null || echo "")
    fi
    
    # Si aún no se detectó, buscar en el directorio actual del script
    if [[ -z "$DETECTED_REPO" ]]; then
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        if [[ -d "$SCRIPT_DIR/.git" ]]; then
            cd "$SCRIPT_DIR"
            DETECTED_REPO=$(git remote get-url origin 2>/dev/null || echo "")
        fi
    fi
    
    echo "$DETECTED_REPO"
}

# Detectar repositorio automáticamente
GIT_REPO=$(detect_git_repo)

if [[ -z "$GIT_REPO" ]]; then
    log_warning "No se pudo detectar el repositorio Git automáticamente"
    log_info "Asegúrate de que el directorio actual o $APP_DIR sea un repositorio Git válido"
else
    log_info "Repositorio Git detectado automáticamente: $GIT_REPO"
fi

# Verificar si se ejecuta como root
if [[ $EUID -eq 0 ]]; then
   log_warning "Estás ejecutando este script como root. Aunque es posible continuar, se recomienda ejecutarlo como un usuario normal con permisos sudo."
   read -p "¿Deseas continuar de todos modos? (s/N): " response
   if [[ "$response" != "s" && "$response" != "S" ]]; then
      log_error "Actualización cancelada por el usuario"
      exit 1
   fi
   log_warning "Continuando la actualización como root..."
fi

# Verificar que la aplicación esté instalada
if [[ ! -d "$APP_DIR" ]]; then
    log_error "La aplicación no está instalada en $APP_DIR"
    log_info "Ejecuta primero el script de instalación: ./install.sh"
    exit 1
fi

# Función para crear backup
create_backup() {
    log_info "Creando backup de la aplicación actual..."
    
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_NAME="tractoreando_backup_$TIMESTAMP"
    
    # Crear directorio de backups si no existe
    sudo mkdir -p $BACKUP_DIR
    sudo chown $APP_USER:$APP_USER $BACKUP_DIR
    
    # Crear backup
    sudo -u $APP_USER tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" \
        -C "$APP_DIR" \
        --exclude="node_modules" \
        --exclude="frontend/node_modules" \
        --exclude="frontend/build" \
        --exclude="logs" \
        --exclude="uploads" \
        --exclude="backups" \
        --exclude=".git" \
        .
    
    log_success "Backup creado: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
    
    # Limpiar backups antiguos
    cleanup_old_backups
    
    echo "$BACKUP_NAME" > /tmp/tractoreando_last_backup
}

# Función para limpiar backups antiguos
cleanup_old_backups() {
    log_info "Limpiando backups antiguos (manteniendo últimos $MAX_BACKUPS)..."
    
    cd $BACKUP_DIR
    BACKUP_COUNT=$(ls -1 tractoreando_backup_*.tar.gz 2>/dev/null | wc -l || echo 0)
    
    if [[ $BACKUP_COUNT -gt $MAX_BACKUPS ]]; then
        EXCESS=$((BACKUP_COUNT - MAX_BACKUPS))
        ls -1t tractoreando_backup_*.tar.gz | tail -n $EXCESS | xargs rm -f
        log_success "Eliminados $EXCESS backups antiguos"
    fi
}

# Función para restaurar backup
restore_backup() {
    if [[ ! -f "/tmp/tractoreando_last_backup" ]]; then
        log_error "No se encontró información del último backup"
        return 1
    fi
    
    BACKUP_NAME=$(cat /tmp/tractoreando_last_backup)
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_NAME.tar.gz"
    
    if [[ ! -f "$BACKUP_FILE" ]]; then
        log_error "No se encontró el archivo de backup: $BACKUP_FILE"
        return 1
    fi
    
    log_warning "Restaurando backup: $BACKUP_NAME"
    
    # Detener aplicación
    sudo -u $APP_USER pm2 stop all || true
    
    # Limpiar directorio actual (excepto uploads y logs)
    cd $APP_DIR
    sudo -u $APP_USER find . -maxdepth 1 -type f -not -name ".*" -delete
    sudo -u $APP_USER find . -maxdepth 1 -type d -not -name "." -not -name "uploads" -not -name "logs" -not -name "backups" -exec rm -rf {} + || true
    
    # Restaurar backup
    sudo -u $APP_USER tar -xzf "$BACKUP_FILE" -C "$APP_DIR"
    
    # Reinstalar dependencias
    sudo -u $APP_USER npm install --production
    cd frontend && sudo -u $APP_USER npm install && sudo -u $APP_USER npm run build
    cd ..
    
    # Reiniciar aplicación
    sudo -u $APP_USER pm2 start ecosystem.config.js
    
    log_success "Backup restaurado exitosamente"
}

# Función para verificar estado de la aplicación
check_app_health() {
    log_info "Verificando estado de la aplicación..."
    
    # Verificar PM2
    if ! sudo -u $APP_USER pm2 list | grep -q "online"; then
        log_error "La aplicación no está ejecutándose correctamente"
        return 1
    fi
    
    # Verificar respuesta HTTP (esperar hasta 30 segundos)
    for i in {1..30}; do
        if curl -s -f http://localhost:5000/api/health > /dev/null 2>&1; then
            log_success "Aplicación respondiendo correctamente"
            return 0
        fi
        sleep 1
    done
    
    log_error "La aplicación no responde después de 30 segundos"
    return 1
}

# Función para actualizar desde Git
update_from_git() {
    log_info "Actualizando desde repositorio Git..."
    
    # Verificar que se detectó un repositorio
    if [[ -z "$GIT_REPO" ]]; then
        log_error "No se pudo detectar el repositorio Git automáticamente"
        log_error "Opciones:"
        log_error "1. Ejecuta este script desde un directorio con repositorio Git"
        log_error "2. Asegúrate de que $APP_DIR sea un repositorio Git válido"
        log_error "3. Usa 'update_from_local' en su lugar"
        return 1
    fi
    
    log_info "Usando repositorio: $GIT_REPO"
    
    cd $APP_DIR
    
    # Verificar si es un repositorio Git
    if [[ ! -d ".git" ]]; then
        log_info "Inicializando repositorio Git en $APP_DIR..."
        sudo -u $APP_USER git init
        sudo -u $APP_USER git remote add origin "$GIT_REPO"
        
        # Primera descarga
        log_info "Descargando código por primera vez..."
        sudo -u $APP_USER git fetch origin
        sudo -u $APP_USER git checkout -b $BRANCH origin/$BRANCH
    else
        # Verificar/actualizar remote origin
        CURRENT_REMOTE=$(sudo -u $APP_USER git remote get-url origin 2>/dev/null || echo "")
        if [[ "$CURRENT_REMOTE" != "$GIT_REPO" ]]; then
            log_info "Actualizando URL del repositorio remoto..."
            sudo -u $APP_USER git remote set-url origin "$GIT_REPO"
        fi
        
        # Guardar cambios locales si los hay
        if ! sudo -u $APP_USER git diff --quiet 2>/dev/null; then
            log_info "Guardando cambios locales..."
            sudo -u $APP_USER git add . || true
            sudo -u $APP_USER git stash push -m "Auto-stash before update $(date)" || true
        fi
        
        # Actualizar desde remoto
        log_info "Descargando últimos cambios..."
        sudo -u $APP_USER git fetch origin
        sudo -u $APP_USER git reset --hard origin/$BRANCH
    fi
    
    # Mostrar información del commit actual
    CURRENT_COMMIT=$(sudo -u $APP_USER git rev-parse --short HEAD)
    COMMIT_MESSAGE=$(sudo -u $APP_USER git log -1 --pretty=format:"%s")
    log_success "Código actualizado a commit $CURRENT_COMMIT: $COMMIT_MESSAGE"
}

# Función para actualizar desde archivo local
update_from_local() {
    local SOURCE_DIR=$1
    
    if [[ ! -d "$SOURCE_DIR" ]]; then
        log_error "Directorio fuente no encontrado: $SOURCE_DIR"
        return 1
    fi
    
    log_info "Actualizando desde directorio local: $SOURCE_DIR"
    
    # Copiar archivos (excluyendo ciertos directorios)
    sudo rsync -av \
        --exclude="node_modules" \
        --exclude="frontend/node_modules" \
        --exclude="frontend/build" \
        --exclude="logs" \
        --exclude="uploads" \
        --exclude="backups" \
        --exclude=".git" \
        --exclude=".env" \
        "$SOURCE_DIR/" "$APP_DIR/"
    
    sudo chown -R $APP_USER:$APP_USER $APP_DIR
    
    log_success "Archivos copiados desde directorio local"
}

# Función para instalar dependencias
install_dependencies() {
    log_info "Instalando dependencias..."
    
    cd $APP_DIR
    
    # Backend
    log_info "Instalando dependencias del backend..."
    sudo -u $APP_USER npm install --production
    
    # Frontend
    log_info "Instalando dependencias del frontend..."
    cd frontend
    sudo -u $APP_USER npm install
    
    # Build del frontend
    log_info "Construyendo frontend para producción..."
    sudo -u $APP_USER npm run build
    
    cd $APP_DIR
    
    log_success "Dependencias instaladas correctamente"
}

# Función para ejecutar migraciones de base de datos
run_migrations() {
    log_info "Ejecutando migraciones de base de datos..."
    
    cd $APP_DIR
    
    # Ejecutar script de migración si existe
    if [[ -f "migrate.js" ]]; then
        sudo -u $APP_USER node migrate.js
        log_success "Migraciones ejecutadas"
    else
        log_info "No se encontraron migraciones"
    fi
}

# Función para reiniciar servicios
restart_services() {
    log_info "Reiniciando servicios..."
    
    # Reiniciar aplicación con PM2
    sudo -u $APP_USER pm2 restart all
    
    # Recargar Nginx
    sudo systemctl reload nginx
    
    log_success "Servicios reiniciados"
}

# Función principal de actualización
update_app() {
    local UPDATE_SOURCE=$1
    local SOURCE_PATH=$2
    
    log_info "Iniciando proceso de actualización..."
    
    # Crear backup
    create_backup
    
    # Detener aplicación
    log_info "Deteniendo aplicación..."
    sudo -u $APP_USER pm2 stop all
    
    # Actualizar código
    case $UPDATE_SOURCE in
        "git")
            update_from_git
            ;;
        "local")
            update_from_local "$SOURCE_PATH"
            ;;
        *)
            log_error "Fuente de actualización no válida: $UPDATE_SOURCE"
            exit 1
            ;;
    esac
    
    # Instalar dependencias
    install_dependencies
    
    # Ejecutar migraciones
    run_migrations
    
    # Reiniciar servicios
    restart_services
    
    # Verificar estado
    if check_app_health; then
        log_success "¡Actualización completada exitosamente!"
        
        # Limpiar backup temporal
        rm -f /tmp/tractoreando_last_backup
        
        echo ""
        echo "============================================"
        echo "🎉 Tractoreando actualizado correctamente"
        echo "============================================"
        echo ""
        echo "📍 URL: http://$(hostname -I | awk '{print $1}' || echo 'localhost')"
        echo "📋 Estado: sudo -u $APP_USER pm2 status"
        echo "📄 Logs: sudo -u $APP_USER pm2 logs"
        echo ""
    else
        log_error "La actualización falló. Restaurando backup..."
        restore_backup
        
        if check_app_health; then
            log_success "Backup restaurado exitosamente"
        else
            log_error "Error crítico: No se pudo restaurar el backup"
            log_error "Intervención manual requerida"
        fi
        
        exit 1
    fi
}

# Función para mostrar ayuda
show_help() {
    echo "Script de actualización de Tractoreando"
    echo ""
    echo "Uso:"
    echo "  $0 git                    # Actualizar desde repositorio Git"
    echo "  $0 local <directorio>     # Actualizar desde directorio local"
    echo "  $0 status                 # Mostrar estado actual"
    echo "  $0 backup                 # Crear backup manual"
    echo "  $0 restore                # Restaurar último backup"
    echo "  $0 logs                   # Mostrar logs de la aplicación"
    echo "  $0 restart                # Reiniciar aplicación"
    echo "  $0 --help                 # Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 git                                    # Actualizar desde Git"
    echo "  $0 local /home/user/tractoreando-new     # Actualizar desde directorio"
    echo ""
}

# Función para mostrar estado
show_status() {
    echo "Estado de Tractoreando"
    echo "====================="
    echo ""
    echo "📁 Directorio: $APP_DIR"
    echo "👤 Usuario: $APP_USER"
    echo ""
    echo "🔄 Estado PM2:"
    sudo -u $APP_USER pm2 list
    echo ""
    echo "🌐 Estado Nginx:"
    sudo systemctl status nginx --no-pager -l
    echo ""
    echo "💾 Backups disponibles:"
    ls -la $BACKUP_DIR/*.tar.gz 2>/dev/null || echo "No hay backups"
}

# Función para mostrar logs
show_logs() {
    echo "Logs de Tractoreando"
    echo "==================="
    echo ""
    echo "Presiona Ctrl+C para salir"
    echo ""
    sudo -u $APP_USER pm2 logs --lines 50
}

# Función para reiniciar
restart_app() {
    log_info "Reiniciando Tractoreando..."
    sudo -u $APP_USER pm2 restart all
    sudo systemctl reload nginx
    
    if check_app_health; then
        log_success "Aplicación reiniciada correctamente"
    else
        log_error "Error al reiniciar la aplicación"
        exit 1
    fi
}

# Procesar argumentos
case "${1:-}" in
    "git")
        update_app "git"
        ;;
    "local")
        if [[ -z "${2:-}" ]]; then
            log_error "Debes especificar el directorio fuente"
            echo "Uso: $0 local <directorio>"
            exit 1
        fi
        update_app "local" "$2"
        ;;
    "status")
        show_status
        ;;
    "backup")
        create_backup
        ;;
    "restore")
        restore_backup
        ;;
    "logs")
        show_logs
        ;;
    "restart")
        restart_app
        ;;
    "--help"|"-h"|"help")
        show_help
        ;;
    "")
        log_error "Debes especificar una acción"
        show_help
        exit 1
        ;;
    *)
        log_error "Acción no reconocida: $1"
        show_help
        exit 1
        ;;
esac