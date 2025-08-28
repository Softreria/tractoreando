#!/bin/bash

# Script de Mantenimiento Integral - Tractoreando
# Combina funcionalidades de clean-for-git.sh, preparar-despliegue.sh y update.sh
# Uso: ./mantenimiento-integral.sh [--clean|--prepare-deploy|--update|--full-maintenance|--help]

set -e

echo "🛠️ Mantenimiento Integral - Tractoreando"
echo "======================================="
echo "Fecha: $(date)"
echo "Usuario: $(whoami)"
echo ""

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

# Configuración
APP_NAME="tractoreando"
APP_DIR="/opt/$APP_NAME"
APP_USER="$APP_NAME"
BACKUP_DIR="/opt/$APP_NAME/backups"
BRANCH="main"
MAX_BACKUPS=5
DATE=$(date +"%Y%m%d_%H%M%S")

# Detectar si se ejecuta como root
if [[ $EUID -eq 0 ]]; then
    log_warning "Ejecutándose como root"
    SUDO_CMD=""
else
    log_info "Ejecutándose como usuario normal"
    SUDO_CMD="sudo"
fi

# Función para verificar directorio del proyecto
check_project_directory() {
    local work_dir
    
    if [[ -f "package.json" ]]; then
        work_dir=$(pwd)
        log_info "Trabajando desde directorio actual: $work_dir"
    elif [[ -f "$APP_DIR/package.json" ]]; then
        work_dir="$APP_DIR"
        log_info "Trabajando desde directorio de aplicación: $work_dir"
        cd "$work_dir"
    else
        log_error "No se encontró package.json. Ejecuta desde el directorio del proyecto o verifica $APP_DIR"
        exit 1
    fi
    
    WORK_DIR="$work_dir"
}

# Función para obtener tamaño de directorio
get_size() {
    if [[ -d "$1" ]]; then
        du -sh "$1" 2>/dev/null | cut -f1
    else
        echo "0B"
    fi
}

# Función para detectar repositorio Git automáticamente
detect_git_repo() {
    local detected_repo=""
    
    # Intentar detectar desde el directorio actual si existe .git
    if [[ -d ".git" ]]; then
        detected_repo=$(git remote get-url origin 2>/dev/null || echo "")
    fi
    
    # Si no se detectó, intentar desde el directorio de la aplicación
    if [[ -z "$detected_repo" && -d "$APP_DIR/.git" ]]; then
        cd "$APP_DIR"
        detected_repo=$(git remote get-url origin 2>/dev/null || echo "")
    fi
    
    # Si aún no se detectó, buscar en el directorio actual del script
    if [[ -z "$detected_repo" ]]; then
        local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        if [[ -d "$script_dir/.git" ]]; then
            cd "$script_dir"
            detected_repo=$(git remote get-url origin 2>/dev/null || echo "")
        fi
    fi
    
    echo "$detected_repo"
}

# Función para limpiar proyecto (clean-for-git)
clean_project() {
    log_info "🧹 LIMPIANDO PROYECTO PARA GIT"
    
    check_project_directory
    
    # Mostrar tamaño inicial
    log_info "Tamaño inicial del proyecto:"
    echo "   • Directorio raíz: $(get_size .)"
    echo "   • node_modules: $(get_size node_modules)"
    echo "   • frontend/node_modules: $(get_size frontend/node_modules)"
    echo "   • frontend/build: $(get_size frontend/build)"
    echo ""
    
    # Limpiar node_modules
    log_info "Eliminando node_modules..."
    if [[ -d "node_modules" ]]; then
        rm -rf node_modules
        log_success "node_modules eliminado"
    else
        log_warning "node_modules no encontrado"
    fi
    
    if [[ -d "frontend/node_modules" ]]; then
        rm -rf frontend/node_modules
        log_success "frontend/node_modules eliminado"
    else
        log_warning "frontend/node_modules no encontrado"
    fi
    
    # Limpiar archivos de build
    log_info "Eliminando archivos de build..."
    for build_dir in "frontend/build" "frontend/dist" "build" "dist"; do
        if [[ -d "$build_dir" ]]; then
            rm -rf "$build_dir"
            log_success "$build_dir eliminado"
        fi
    done
    
    # Limpiar logs
    log_info "Eliminando archivos de log..."
    find . -name "*.log" -type f -delete 2>/dev/null || true
    find . -name "npm-debug.log*" -type f -delete 2>/dev/null || true
    find . -name "yarn-debug.log*" -type f -delete 2>/dev/null || true
    find . -name "yarn-error.log*" -type f -delete 2>/dev/null || true
    log_success "Logs eliminados"
    
    # Limpiar archivos temporales
    log_info "Eliminando archivos temporales..."
    find . -name "*.tmp" -type f -delete 2>/dev/null || true
    find . -name "*.temp" -type f -delete 2>/dev/null || true
    find . -name "*~" -type f -delete 2>/dev/null || true
    log_success "Archivos temporales eliminados"
    
    # Limpiar archivos de sistema
    log_info "Eliminando archivos de sistema..."
    find . -name ".DS_Store" -type f -delete 2>/dev/null || true
    find . -name ".DS_Store?" -type f -delete 2>/dev/null || true
    find . -name "._*" -type f -delete 2>/dev/null || true
    find . -name "Thumbs.db" -type f -delete 2>/dev/null || true
    find . -name "ehthumbs.db" -type f -delete 2>/dev/null || true
    log_success "Archivos de sistema eliminados"
    
    # Limpiar cache
    log_info "Eliminando archivos de cache..."
    for cache_dir in ".cache" ".parcel-cache" "coverage" ".nyc_output"; do
        if [[ -d "$cache_dir" ]]; then
            rm -rf "$cache_dir"
            log_success "$cache_dir eliminado"
        fi
    done
    
    # Mostrar tamaño final
    echo ""
    log_info "Tamaño final del proyecto:"
    echo "   • Directorio raíz: $(get_size .)"
    echo ""
    
    log_success "¡Proyecto limpiado exitosamente!"
    echo ""
    log_info "Pasos siguientes:"
    echo "   1. Verificar que .gitignore esté actualizado"
    echo "   2. Hacer commit de los cambios"
    echo "   3. Subir al repositorio Git"
    echo "   4. En el servidor, ejecutar 'npm install' para restaurar dependencias"
    echo ""
    log_warning "Recuerda: Después de clonar el repositorio, ejecuta 'npm run install:all' para instalar todas las dependencias"
}

# Función para preparar despliegue
prepare_deployment() {
    log_info "🚀 PREPARANDO ARCHIVOS PARA DESPLIEGUE"
    log_info "📍 Servidor: tractoreando.softreria.com"
    
    check_project_directory
    
    # Verificar que estamos en el directorio correcto
    if [[ ! -f "server.js" ]] || [[ ! -d "frontend" ]]; then
        log_error "Este script debe ejecutarse desde el directorio raíz del proyecto"
        exit 1
    fi
    
    # Limpiar builds anteriores
    log_info "Limpiando builds anteriores..."
    rm -rf frontend/build
    rm -f tractoreando-deploy.tar.gz
    
    # Instalar dependencias del frontend
    log_info "Instalando dependencias del frontend..."
    cd frontend
    if [[ ! -d "node_modules" ]]; then
        npm install
    else
        log_success "Dependencias del frontend ya instaladas"
    fi
    
    # Construir frontend
    log_info "Construyendo frontend para producción..."
    npm run build
    
    if [[ ! -d "build" ]]; then
        log_error "Error: No se pudo construir el frontend"
        exit 1
    fi
    
    log_success "Frontend construido exitosamente"
    cd ..
    
    # Instalar dependencias del backend
    log_info "Verificando dependencias del backend..."
    if [[ ! -d "node_modules" ]]; then
        npm install
    else
        log_success "Dependencias del backend ya instaladas"
    fi
    
    # Verificar archivos de configuración
    log_info "Verificando archivos de configuración..."
    
    local required_files=(".env.production" "frontend/.env.production" "ecosystem.config.js")
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            missing_files+=("$file")
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log_error "Archivos de configuración faltantes:"
        for file in "${missing_files[@]}"; do
            echo "   • $file"
        done
        exit 1
    fi
    
    log_success "Todos los archivos de configuración están presentes"
    
    # Crear archivo comprimido para despliegue
    log_info "Creando archivo comprimido para despliegue..."
    
    tar -czf tractoreando-deploy.tar.gz \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='.gitignore' \
        --exclude='frontend/node_modules' \
        --exclude='frontend/src' \
        --exclude='frontend/public' \
        --exclude='*.log' \
        --exclude='*.tmp' \
        --exclude='.DS_Store' \
        --exclude='mantenimiento-integral.sh' \
        --exclude='DESPLIEGUE-SERVIDOR-PRODUCCION.md' \
        .
    
    if [[ ! -f "tractoreando-deploy.tar.gz" ]]; then
        log_error "Error al crear archivo comprimido"
        exit 1
    fi
    
    log_success "Archivo comprimido creado: tractoreando-deploy.tar.gz"
    
    # Mostrar información del archivo
    local file_size=$(du -h tractoreando-deploy.tar.gz | cut -f1)
    log_info "Tamaño del archivo: $file_size"
    
    # Mostrar resumen
    echo ""
    echo "📦 RESUMEN DEL DESPLIEGUE"
    echo "========================"
    echo "✓ Frontend construido en: frontend/build/"
    echo "✓ Archivo de despliegue: tractoreando-deploy.tar.gz ($file_size)"
    echo "✓ Configuración de producción verificada"
    echo ""
    echo "📋 PRÓXIMOS PASOS:"
    echo "1. Subir tractoreando-deploy.tar.gz al servidor de producción"
    echo "2. Seguir la guía en DESPLIEGUE-SERVIDOR-PRODUCCION.md"
    echo "3. Configurar Nginx, MongoDB y PM2 en el servidor"
    echo ""
    echo "🌐 Servidor de destino: https://tractoreando.softreria.com"
    echo "🔧 Puerto del backend: 5001"
    echo ""
    log_success "¡Preparación completada! Archivos listos para despliegue."
    
    # Mostrar comandos para subir al servidor
    echo ""
    echo "💡 COMANDOS SUGERIDOS PARA SUBIR AL SERVIDOR:"
    echo ""
    echo "# Opción 1: SCP"
    echo "scp tractoreando-deploy.tar.gz usuario@tractoreando.softreria.com:/opt/"
    echo ""
    echo "# Opción 2: RSYNC"
    echo "rsync -avz tractoreando-deploy.tar.gz usuario@tractoreando.softreria.com:/opt/"
    echo ""
    echo "# Opción 3: FTP/SFTP"
    echo "sftp usuario@tractoreando.softreria.com"
    echo "put tractoreando-deploy.tar.gz /opt/"
    echo ""
}

# Función para crear backup
create_backup() {
    log_info "Creando backup de la aplicación actual..."
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_name="tractoreando_backup_$timestamp"
    
    # Crear directorio de backups si no existe
    if [[ $EUID -eq 0 ]]; then
        mkdir -p "$BACKUP_DIR"
        chown "$APP_USER:$APP_USER" "$BACKUP_DIR"
    else
        $SUDO_CMD mkdir -p "$BACKUP_DIR"
        $SUDO_CMD chown "$APP_USER:$APP_USER" "$BACKUP_DIR"
    fi
    
    # Crear backup
    if [[ $EUID -eq 0 ]]; then
        sudo -u "$APP_USER" tar -czf "$BACKUP_DIR/$backup_name.tar.gz" \
            -C "$APP_DIR" \
            --exclude="node_modules" \
            --exclude="frontend/node_modules" \
            --exclude="frontend/build" \
            --exclude="logs" \
            --exclude="uploads" \
            --exclude="backups" \
            --exclude=".git" \
            .
    else
        $SUDO_CMD -u "$APP_USER" tar -czf "$BACKUP_DIR/$backup_name.tar.gz" \
            -C "$APP_DIR" \
            --exclude="node_modules" \
            --exclude="frontend/node_modules" \
            --exclude="frontend/build" \
            --exclude="logs" \
            --exclude="uploads" \
            --exclude="backups" \
            --exclude=".git" \
            .
    fi
    
    log_success "Backup creado: $BACKUP_DIR/$backup_name.tar.gz"
    
    # Limpiar backups antiguos
    cleanup_old_backups
    
    echo "$backup_name" > /tmp/tractoreando_last_backup
}

# Función para limpiar backups antiguos
cleanup_old_backups() {
    log_info "Limpiando backups antiguos (manteniendo últimos $MAX_BACKUPS)..."
    
    cd "$BACKUP_DIR"
    local backup_count=$(ls -1 tractoreando_backup_*.tar.gz 2>/dev/null | wc -l || echo 0)
    
    if [[ $backup_count -gt $MAX_BACKUPS ]]; then
        local excess=$((backup_count - MAX_BACKUPS))
        ls -1t tractoreando_backup_*.tar.gz | tail -n $excess | xargs rm -f
        log_success "Eliminados $excess backups antiguos"
    fi
}

# Función para verificar estado de la aplicación
check_app_health() {
    log_info "Verificando estado de la aplicación..."
    
    # Verificar PM2
    local pm2_check
    if [[ $EUID -eq 0 ]]; then
        pm2_check=$(sudo -u "$APP_USER" pm2 list | grep -q "online" && echo "ok" || echo "fail")
    else
        pm2_check=$($SUDO_CMD -u "$APP_USER" pm2 list | grep -q "online" && echo "ok" || echo "fail")
    fi
    
    if [[ "$pm2_check" != "ok" ]]; then
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

# Función para actualizar aplicación
update_application() {
    log_info "🔄 ACTUALIZANDO APLICACIÓN"
    
    # Detectar repositorio Git automáticamente
    local git_repo=$(detect_git_repo)
    
    if [[ -z "$git_repo" ]]; then
        log_warning "No se pudo detectar el repositorio Git automáticamente"
        log_info "Asegúrate de que el directorio actual o $APP_DIR sea un repositorio Git válido"
        return 1
    else
        log_info "Repositorio Git detectado automáticamente: $git_repo"
    fi
    
    # Verificar que la aplicación esté instalada
    if [[ ! -d "$APP_DIR" ]]; then
        log_error "La aplicación no está instalada en $APP_DIR"
        log_info "Ejecuta primero el script de instalación"
        exit 1
    fi
    
    # Crear backup antes de actualizar
    create_backup
    
    # Actualizar código desde repositorio
    log_info "Actualizando código desde repositorio..."
    cd "$APP_DIR"
    
    if [[ $EUID -eq 0 ]]; then
        sudo -u "$APP_USER" git fetch origin
        sudo -u "$APP_USER" git pull origin "$BRANCH"
    else
        $SUDO_CMD -u "$APP_USER" git fetch origin
        $SUDO_CMD -u "$APP_USER" git pull origin "$BRANCH"
    fi
    
    log_success "Código actualizado desde repositorio"
    
    # Instalar dependencias del backend
    log_info "Instalando dependencias del backend..."
    if [[ $EUID -eq 0 ]]; then
        sudo -u "$APP_USER" npm install --production
    else
        $SUDO_CMD -u "$APP_USER" npm install --production
    fi
    
    # Instalar dependencias y construir frontend
    if [[ -d "frontend" ]]; then
        log_info "Instalando dependencias del frontend..."
        cd frontend
        if [[ $EUID -eq 0 ]]; then
            sudo -u "$APP_USER" npm install
            sudo -u "$APP_USER" npm run build
        else
            $SUDO_CMD -u "$APP_USER" npm install
            $SUDO_CMD -u "$APP_USER" npm run build
        fi
        cd ..
    fi
    
    # Reiniciar aplicación
    log_info "Reiniciando aplicación..."
    if [[ $EUID -eq 0 ]]; then
        sudo -u "$APP_USER" pm2 restart all
    else
        $SUDO_CMD -u "$APP_USER" pm2 restart all
    fi
    
    # Verificar que la aplicación esté funcionando
    if check_app_health; then
        log_success "🎉 Actualización completada exitosamente"
        
        # Mostrar información de la versión
        if [[ -f "package.json" ]]; then
            local version=$(grep '"version"' package.json | cut -d'"' -f4)
            log_info "Versión actual: $version"
        fi
        
        # Mostrar último commit
        local last_commit=$(git log -1 --pretty=format:"%h - %s (%cr)" 2>/dev/null || echo "No disponible")
        log_info "Último commit: $last_commit"
    else
        log_error "❌ La actualización falló. Restaurando backup..."
        restore_backup
        return 1
    fi
}

# Función para restaurar backup
restore_backup() {
    if [[ ! -f "/tmp/tractoreando_last_backup" ]]; then
        log_error "No se encontró información del último backup"
        return 1
    fi
    
    local backup_name=$(cat /tmp/tractoreando_last_backup)
    local backup_file="$BACKUP_DIR/$backup_name.tar.gz"
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "No se encontró el archivo de backup: $backup_file"
        return 1
    fi
    
    log_warning "Restaurando backup: $backup_name"
    
    # Detener aplicación
    if [[ $EUID -eq 0 ]]; then
        sudo -u "$APP_USER" pm2 stop all || true
    else
        $SUDO_CMD -u "$APP_USER" pm2 stop all || true
    fi
    
    # Limpiar directorio actual (excepto uploads y logs)
    cd "$APP_DIR"
    if [[ $EUID -eq 0 ]]; then
        sudo -u "$APP_USER" find . -maxdepth 1 -type f -not -name ".*" -delete
        sudo -u "$APP_USER" find . -maxdepth 1 -type d -not -name "." -not -name "uploads" -not -name "logs" -not -name "backups" -exec rm -rf {} + || true
    else
        $SUDO_CMD -u "$APP_USER" find . -maxdepth 1 -type f -not -name ".*" -delete
        $SUDO_CMD -u "$APP_USER" find . -maxdepth 1 -type d -not -name "." -not -name "uploads" -not -name "logs" -not -name "backups" -exec rm -rf {} + || true
    fi
    
    # Restaurar backup
    if [[ $EUID -eq 0 ]]; then
        sudo -u "$APP_USER" tar -xzf "$backup_file" -C "$APP_DIR"
    else
        $SUDO_CMD -u "$APP_USER" tar -xzf "$backup_file" -C "$APP_DIR"
    fi
    
    # Reinstalar dependencias
    if [[ $EUID -eq 0 ]]; then
        sudo -u "$APP_USER" npm install --production
        if [[ -d "frontend" ]]; then
            cd frontend
            sudo -u "$APP_USER" npm install
            sudo -u "$APP_USER" npm run build
            cd ..
        fi
    else
        $SUDO_CMD -u "$APP_USER" npm install --production
        if [[ -d "frontend" ]]; then
            cd frontend
            $SUDO_CMD -u "$APP_USER" npm install
            $SUDO_CMD -u "$APP_USER" npm run build
            cd ..
        fi
    fi
    
    # Reiniciar aplicación
    if [[ $EUID -eq 0 ]]; then
        sudo -u "$APP_USER" pm2 start ecosystem.config.js
    else
        $SUDO_CMD -u "$APP_USER" pm2 start ecosystem.config.js
    fi
    
    log_success "Backup restaurado exitosamente"
}

# Función para mantenimiento completo
full_maintenance() {
    log_info "🔧 MANTENIMIENTO COMPLETO"
    
    echo "Este proceso realizará:"
    echo "1. Limpieza del proyecto"
    echo "2. Actualización desde repositorio"
    echo "3. Preparación para despliegue"
    echo "4. Verificación de estado"
    echo ""
    
    read -p "¿Deseas continuar? (s/N): " response
    if [[ "$response" != "s" && "$response" != "S" ]]; then
        log_info "Mantenimiento cancelado por el usuario"
        exit 0
    fi
    
    # Ejecutar mantenimiento completo
    clean_project
    echo ""
    update_application
    echo ""
    prepare_deployment
    
    log_success "🎉 ¡Mantenimiento completo finalizado!"
}

# Función principal
main() {
    local mode=${1:-"--help"}
    
    case $mode in
        "--clean")
            clean_project
            ;;
        "--prepare-deploy")
            prepare_deployment
            ;;
        "--update")
            update_application
            ;;
        "--full-maintenance")
            full_maintenance
            ;;
        "--help")
            echo "Uso: $0 [--clean|--prepare-deploy|--update|--full-maintenance|--help]"
            echo ""
            echo "Opciones:"
            echo "  --clean             Limpiar proyecto para Git (eliminar node_modules, builds, etc.)"
            echo "  --prepare-deploy    Preparar archivos para despliegue en producción"
            echo "  --update            Actualizar aplicación desde repositorio Git"
            echo "  --full-maintenance  Ejecutar mantenimiento completo (todas las opciones)"
            echo "  --help              Mostrar esta ayuda"
            echo ""
            echo "Ejemplos:"
            echo "  $0 --clean                    # Limpiar proyecto"
            echo "  $0 --prepare-deploy           # Preparar despliegue"
            echo "  sudo $0 --update              # Actualizar aplicación (requiere permisos)"
            echo "  sudo $0 --full-maintenance    # Mantenimiento completo (requiere permisos)"
            exit 0
            ;;
        *)
            log_error "Opción no válida: $mode"
            log_info "Usa --help para ver las opciones disponibles"
            exit 1
            ;;
    esac
}

# Ejecutar función principal
main "$@"