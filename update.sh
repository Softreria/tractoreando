#!/bin/bash

# Tractoreando - Script de Actualización
# Actualiza la aplicación manteniendo la configuración y datos existentes
# Uso: ./update.sh [--backup] [--force]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Funciones de logging
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🚛 Tractoreando - Actualización"
echo "=============================="
echo "Fecha: $(date)"
echo "Usuario: $(whoami)"
echo ""

# Verificar si se ejecuta como root
if [[ $EUID -eq 0 ]]; then
    SUDO_CMD=""
else
    SUDO_CMD="sudo"
fi

# Configuración
APP_DIR="/opt/tractoreando"
APP_USER="tractoreando"
BACKUP_DIR="$APP_DIR/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/tractoreando_backup_$DATE.tar.gz"
TEMP_DIR="/tmp/tractoreando_update_$DATE"

# Procesar argumentos
CREATE_BACKUP=false
FORCE_UPDATE=false

for arg in "$@"; do
    case $arg in
        --backup)
            CREATE_BACKUP=true
            shift
            ;;
        --force)
            FORCE_UPDATE=true
            shift
            ;;
        --help)
            echo "Uso: $0 [opciones]"
            echo ""
            echo "Opciones:"
            echo "  --backup    Crear backup antes de actualizar"
            echo "  --force     Forzar actualización sin confirmación"
            echo "  --help      Mostrar esta ayuda"
            exit 0
            ;;
        *)
            log_error "Opción desconocida: $arg"
            exit 1
            ;;
    esac
done

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Función para verificar prerrequisitos
check_prerequisites() {
    log_info "Verificando prerrequisitos..."
    
    # Verificar si la aplicación está instalada
    if [[ ! -d "$APP_DIR" ]]; then
        log_error "Tractoreando no está instalado en $APP_DIR"
        log_info "Ejecuta ./install.sh primero"
        exit 1
    fi
    
    # Verificar si PM2 está instalado
    if ! command_exists pm2; then
        log_error "PM2 no está instalado"
        exit 1
    fi
    
    # Verificar si el usuario de aplicación existe
    if ! id "$APP_USER" &>/dev/null; then
        log_error "Usuario $APP_USER no existe"
        exit 1
    fi
    
    log_success "Prerrequisitos verificados"
}

# Función para crear backup
create_backup() {
    if [[ "$CREATE_BACKUP" == "true" ]]; then
        log_info "Creando backup..."
        
        # Crear directorio de backup si no existe
        $SUDO_CMD mkdir -p "$BACKUP_DIR"
        
        # Crear backup de la aplicación (excluyendo node_modules y logs)
        $SUDO_CMD tar -czf "$BACKUP_FILE" \
            --exclude="$APP_DIR/node_modules" \
            --exclude="$APP_DIR/frontend/node_modules" \
            --exclude="$APP_DIR/frontend/build" \
            --exclude="$APP_DIR/logs" \
            --exclude="$APP_DIR/backups" \
            -C "$(dirname $APP_DIR)" "$(basename $APP_DIR)"
        
        log_success "Backup creado: $BACKUP_FILE"
    else
        log_warning "Saltando creación de backup (usa --backup para crear uno)"
    fi
}

# Función para obtener confirmación del usuario
get_confirmation() {
    if [[ "$FORCE_UPDATE" == "true" ]]; then
        return 0
    fi
    
    echo ""
    log_warning "Esta operación actualizará Tractoreando"
    log_warning "La aplicación se detendrá temporalmente durante la actualización"
    echo ""
    read -p "¿Continuar con la actualización? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Actualización cancelada por el usuario"
        exit 0
    fi
}

# Función para detener la aplicación
stop_application() {
    log_info "Deteniendo aplicación..."
    
    cd "$APP_DIR"
    
    # Detener PM2
    $SUDO_CMD -u "$APP_USER" pm2 stop all || true
    
    log_success "Aplicación detenida"
}

# Función para preparar actualización
prepare_update() {
    log_info "Preparando actualización..."
    
    # Crear directorio temporal
    mkdir -p "$TEMP_DIR"
    
    # Copiar archivos actuales al directorio temporal
    cp -r . "$TEMP_DIR/"
    
    log_success "Preparación completada"
}

# Función para actualizar código
update_code() {
    log_info "Actualizando código..."
    
    cd "$APP_DIR"
    
    # Si hay un repositorio git, hacer pull
    if [[ -d ".git" ]]; then
        log_info "Actualizando desde repositorio git..."
        $SUDO_CMD -u "$APP_USER" git pull origin main || $SUDO_CMD -u "$APP_USER" git pull origin master
    else
        log_info "Copiando nuevos archivos desde directorio temporal..."
        
        # Preservar archivos de configuración importantes
        if [[ -f ".env.production" ]]; then
            cp ".env.production" "$TEMP_DIR/.env.production.backup"
        fi
        
        # Copiar nuevos archivos (excluyendo ciertos directorios)
        rsync -av --exclude='node_modules' --exclude='logs' --exclude='backups' --exclude='.env.production' "$TEMP_DIR/" .
        
        # Restaurar configuración si existe backup
        if [[ -f "$TEMP_DIR/.env.production.backup" ]]; then
            cp "$TEMP_DIR/.env.production.backup" ".env.production"
        fi
        
        # Establecer permisos
        $SUDO_CMD chown -R "$APP_USER:$APP_USER" .
    fi
    
    log_success "Código actualizado"
}

# Función para actualizar dependencias
update_dependencies() {
    log_info "Actualizando dependencias..."
    
    cd "$APP_DIR"
    
    # Actualizar dependencias del backend
    log_info "Actualizando dependencias del backend..."
    $SUDO_CMD -u "$APP_USER" npm install --production
    
    # Actualizar dependencias del frontend
    log_info "Actualizando dependencias del frontend..."
    cd frontend
    $SUDO_CMD -u "$APP_USER" npm install
    
    # Reconstruir frontend
    log_info "Reconstruyendo frontend..."
    $SUDO_CMD -u "$APP_USER" npm run build
    
    cd ..
    
    log_success "Dependencias actualizadas"
}

# Función para ejecutar migraciones de base de datos
run_migrations() {
    log_info "Ejecutando migraciones de base de datos..."
    
    cd "$APP_DIR"
    
    # Si existe un script de migración, ejecutarlo
    if [[ -f "migrate.js" ]]; then
        $SUDO_CMD -u "$APP_USER" node migrate.js
        log_success "Migraciones ejecutadas"
    else
        log_info "No se encontraron migraciones"
    fi
}

# Función para actualizar configuración de Nginx
update_nginx() {
    log_info "Actualizando configuración de Nginx..."
    
    if [[ -f "$APP_DIR/nginx.conf" ]]; then
        # Verificar si la configuración ha cambiado
        if ! diff -q "$APP_DIR/nginx.conf" "/etc/nginx/sites-available/tractoreando" >/dev/null 2>&1; then
            log_info "Configuración de Nginx actualizada, aplicando cambios..."
            
            $SUDO_CMD cp "$APP_DIR/nginx.conf" "/etc/nginx/sites-available/tractoreando"
            
            # Probar configuración
            $SUDO_CMD nginx -t
            
            # Recargar Nginx
            $SUDO_CMD systemctl reload nginx
            
            log_success "Configuración de Nginx actualizada"
        else
            log_info "Configuración de Nginx sin cambios"
        fi
    fi
}

# Función para iniciar la aplicación
start_application() {
    log_info "Iniciando aplicación..."
    
    cd "$APP_DIR"
    
    # Iniciar aplicación con PM2
    $SUDO_CMD -u "$APP_USER" pm2 start ecosystem.config.js
    
    # Guardar configuración
    $SUDO_CMD -u "$APP_USER" pm2 save
    
    log_success "Aplicación iniciada"
}

# Función para verificar que la aplicación esté funcionando
verify_application() {
    log_info "Verificando que la aplicación esté funcionando..."
    
    # Esperar un momento para que la aplicación inicie
    sleep 5
    
    # Verificar estado de PM2
    if $SUDO_CMD -u "$APP_USER" pm2 list | grep -q "online"; then
        log_success "Aplicación funcionando correctamente"
    else
        log_error "La aplicación no está funcionando correctamente"
        log_info "Verificando logs..."
        $SUDO_CMD -u "$APP_USER" pm2 logs --lines 10
        return 1
    fi
}

# Función para limpiar archivos temporales
cleanup() {
    log_info "Limpiando archivos temporales..."
    
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
    
    log_success "Limpieza completada"
}

# Función principal de actualización
main() {
    log_info "Iniciando actualización de Tractoreando..."
    
    # Verificar prerrequisitos
    check_prerequisites
    
    # Obtener confirmación del usuario
    get_confirmation
    
    # Crear backup si se solicita
    create_backup
    
    # Preparar actualización
    prepare_update
    
    # Detener aplicación
    stop_application
    
    # Actualizar código
    update_code
    
    # Actualizar dependencias
    update_dependencies
    
    # Ejecutar migraciones
    run_migrations
    
    # Actualizar configuración de Nginx
    update_nginx
    
    # Iniciar aplicación
    start_application
    
    # Verificar que funcione
    if verify_application; then
        echo ""
        log_success "¡Actualización completada exitosamente!"
        echo ""
        echo "🌐 La aplicación está disponible en:"
        echo "   - http://$(hostname -I | awk '{print $1}')"
        echo "   - http://localhost (si estás en el servidor)"
        echo ""
        echo "📋 Comandos útiles:"
        echo "   - Ver estado: pm2 status"
        echo "   - Ver logs: pm2 logs"
        echo "   - Reiniciar: pm2 restart all"
        echo ""
        
        if [[ "$CREATE_BACKUP" == "true" ]]; then
            echo "💾 Backup creado en: $BACKUP_FILE"
            echo ""
        fi
    else
        log_error "La actualización falló"
        
        if [[ "$CREATE_BACKUP" == "true" && -f "$BACKUP_FILE" ]]; then
            log_info "Puedes restaurar el backup con:"
            echo "   sudo tar -xzf $BACKUP_FILE -C $(dirname $APP_DIR)"
        fi
        
        exit 1
    fi
    
    # Limpiar archivos temporales
    cleanup
}

# Manejo de errores
trap 'log_error "Error durante la actualización"; cleanup; exit 1' ERR

# Verificar si el script se ejecuta directamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi