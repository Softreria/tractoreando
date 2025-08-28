#!/bin/bash

# Script de Gestión Integral de Producción - Tractoreando
# Combina funcionalidades de build-production.sh, fix-api-routes-production.sh y fix-production-login.sh
# Uso: ./gestion-produccion.sh [--build|--fix-routes|--fix-login|--full-deploy|--help]

set -e

echo "🚀 Gestión Integral de Producción - Tractoreando"
echo "==============================================="
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
APP_DIR="/opt/tractoreando"
APP_USER="tractoreando"
BACKUP_DIR="/opt/tractoreando/backups"
DATE=$(date +"%Y%m%d_%H%M%S")

# Detectar si se ejecuta como root
if [[ $EUID -eq 0 ]]; then
    log_warning "Ejecutándose como root - usando comandos directos"
    SUDO_CMD=""
else
    log_info "Ejecutándose como usuario normal - usando sudo cuando sea necesario"
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

# Función para crear backup
create_backup() {
    local backup_type=$1
    
    log_info "Creando backup ($backup_type)..."
    
    if [[ $EUID -eq 0 ]]; then
        mkdir -p "$BACKUP_DIR"
    else
        $SUDO_CMD mkdir -p "$BACKUP_DIR"
    fi
    
    case $backup_type in
        "frontend")
            if [[ -d "$WORK_DIR/frontend/src" ]]; then
                if [[ $EUID -eq 0 ]]; then
                    cp -r "$WORK_DIR/frontend/src" "$BACKUP_DIR/frontend_src_backup_$DATE"
                else
                    $SUDO_CMD cp -r "$WORK_DIR/frontend/src" "$BACKUP_DIR/frontend_src_backup_$DATE"
                fi
                log_success "Backup del frontend creado: frontend_src_backup_$DATE"
            fi
            ;;
        "env")
            if [[ -f "$WORK_DIR/.env" ]]; then
                if [[ $EUID -eq 0 ]]; then
                    cp "$WORK_DIR/.env" "$BACKUP_DIR/.env.backup.$DATE"
                else
                    $SUDO_CMD cp "$WORK_DIR/.env" "$BACKUP_DIR/.env.backup.$DATE"
                fi
                log_success "Backup del .env creado: .env.backup.$DATE"
            fi
            ;;
        "build")
            if [[ -d "$WORK_DIR/frontend/build" ]]; then
                if [[ $EUID -eq 0 ]]; then
                    tar -czf "$BACKUP_DIR/build_backup_$DATE.tar.gz" -C "$WORK_DIR/frontend" build/
                else
                    $SUDO_CMD tar -czf "$BACKUP_DIR/build_backup_$DATE.tar.gz" -C "$WORK_DIR/frontend" build/
                fi
                log_success "Backup del build creado: build_backup_$DATE.tar.gz"
            fi
            ;;
    esac
}

# Función para actualizar código desde repositorio
update_from_repository() {
    log_info "Actualizando código desde repositorio..."
    
    if [[ -d "$WORK_DIR/.git" ]]; then
        cd "$WORK_DIR"
        git fetch origin
        git pull origin main
        log_success "Código actualizado desde repositorio"
    else
        log_warning "No es un repositorio Git, saltando actualización"
    fi
}

# Función para instalar dependencias
install_dependencies() {
    local mode=${1:-"production"}
    
    log_info "Instalando dependencias del backend ($mode)..."
    cd "$WORK_DIR"
    
    if [[ "$mode" == "production" ]]; then
        if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
            sudo -u "$APP_USER" npm ci --production
        else
            npm ci --production
        fi
    else
        if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
            sudo -u "$APP_USER" npm install
        else
            npm install
        fi
    fi
    
    log_success "Dependencias del backend instaladas"
    
    # Instalar dependencias del frontend
    if [[ -d "$WORK_DIR/frontend" ]]; then
        log_info "Instalando dependencias del frontend ($mode)..."
        cd "$WORK_DIR/frontend"
        
        if [[ "$mode" == "production" ]]; then
            if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
                sudo -u "$APP_USER" npm ci --production
            else
                npm ci --production
            fi
        else
            if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
                sudo -u "$APP_USER" npm install
            else
                npm install
            fi
        fi
        
        cd "$WORK_DIR"
        log_success "Dependencias del frontend instaladas"
    fi
}

# Función para corregir rutas API duplicadas
fix_api_routes() {
    log_info "🔧 Corrigiendo rutas API duplicadas..."
    
    create_backup "frontend"
    
    # Verificar y corregir api.js
    local api_file="$WORK_DIR/frontend/src/utils/api.js"
    if [[ -f "$api_file" ]] && grep -q "'/api/auth/login'" "$api_file"; then
        log_info "Aplicando correcciones en api.js..."
        
        # Crear archivo temporal con correcciones
        local temp_file="/tmp/api_fixed.js"
        sed "s|'/api/auth/|'/auth/|g; s|'/api/companies|'/companies|g; s|'/api/branches|'/branches|g; s|'/api/vehicles|'/vehicles|g; s|'/api/maintenance|'/maintenance|g; s|'/api/users|'/users|g; s|'/api/reports|'/reports|g; s|'/api/settings|'/settings|g; s|'/api/notifications|'/notifications|g; s|'/api/files|'/files|g" "$api_file" > "$temp_file"
        
        # Aplicar correcciones
        if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
            sudo -u "$APP_USER" cp "$temp_file" "$api_file"
        else
            cp "$temp_file" "$api_file"
        fi
        
        rm "$temp_file"
        log_success "Correcciones aplicadas en api.js"
    else
        log_success "Las correcciones ya están aplicadas en api.js"
    fi
    
    # Verificar archivos de páginas
    for file in "$WORK_DIR/frontend/src/pages/"*.js; do
        if [[ -f "$file" ]] && grep -q "'/api/" "$file"; then
            log_info "Corrigiendo rutas en $(basename "$file")..."
            
            local temp_file="/tmp/$(basename "$file")_fixed"
            sed "s|'/api/|'/|g" "$file" > "$temp_file"
            
            if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
                sudo -u "$APP_USER" cp "$temp_file" "$file"
            else
                cp "$temp_file" "$file"
            fi
            
            rm "$temp_file"
            log_success "Correcciones aplicadas en $(basename "$file")"
        fi
    done
    
    log_success "Corrección de rutas API completada"
}

# Función para construir frontend
build_frontend() {
    log_info "🏗️ Construyendo frontend para producción..."
    
    if [[ ! -d "$WORK_DIR/frontend" ]]; then
        log_error "Directorio frontend no encontrado"
        return 1
    fi
    
    create_backup "build"
    
    cd "$WORK_DIR/frontend"
    
    # Verificar archivo .env.production
    if [[ ! -f ".env.production" ]]; then
        log_info "Creando archivo .env.production..."
        local frontend_env_content="# Variables de entorno para producción - Frontend Tractoreando
REACT_APP_API_URL=https://tractoreando.softreria.com/api
REACT_APP_ENV=production
GENERATE_SOURCEMAP=false"
        
        if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
            echo "$frontend_env_content" | sudo -u "$APP_USER" tee ".env.production" > /dev/null
        else
            echo "$frontend_env_content" > ".env.production"
        fi
        
        log_success "Archivo .env.production creado"
    fi
    
    # Construir aplicación
    if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
        sudo -u "$APP_USER" NODE_ENV=production npm run build
    else
        NODE_ENV=production npm run build
    fi
    
    cd "$WORK_DIR"
    
    # Verificar construcción exitosa
    if [[ -f "$WORK_DIR/frontend/build/index.html" ]]; then
        log_success "Frontend construido exitosamente"
        
        # Verificar rutas duplicadas en el build
        local duplicate_routes=$(find "$WORK_DIR/frontend/build/static/js" -name "*.js" -exec grep -l "/api/api" {} \; 2>/dev/null | wc -l)
        
        if [[ $duplicate_routes -gt 0 ]]; then
            log_error "¡ATENCIÓN! Se encontraron rutas duplicadas /api/api en $duplicate_routes archivos"
            return 1
        else
            log_success "No se encontraron rutas duplicadas /api/api"
        fi
    else
        log_error "Error al construir el frontend"
        return 1
    fi
}

# Función para configurar variables de entorno de producción
setup_production_env() {
    log_info "⚙️ Configurando variables de entorno de producción..."
    
    create_backup "env"
    
    local env_file="$WORK_DIR/.env"
    
    # Generar secretos seguros
    local jwt_secret=$(openssl rand -base64 64 | tr -d "\n")
    local session_secret=$(openssl rand -hex 32)
    
    # Crear archivo .env optimizado para producción
    local env_content="# Variables de entorno para producción - Tractoreando
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# URLs base de la aplicación
BASE_URL=https://tractoreando.softreria.com
FRONTEND_URL=https://tractoreando.softreria.com
BACKEND_URL=https://tractoreando.softreria.com/api
API_URL=https://tractoreando.softreria.com/api

# MONGODB - CONFIGURACIÓN ROBUSTA
MONGODB_URI=mongodb://127.0.0.1:27017/tractoreando_prod
MONGODB_CONNECT_TIMEOUT=30000
MONGODB_SERVER_SELECTION_TIMEOUT=30000
MONGODB_SOCKET_TIMEOUT=45000
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2

# AUTENTICACIÓN
JWT_SECRET=$jwt_secret
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d
BCRYPT_ROUNDS=12

# SESIÓN
SESSION_SECRET=$session_secret
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTP_ONLY=true
SESSION_COOKIE_MAX_AGE=86400000

# CORS OPTIMIZADO
CORS_ORIGIN=https://tractoreando.softreria.com
CORS_CREDENTIALS=true
TRUST_PROXY=true

# ARCHIVOS Y UPLOADS
UPLOAD_PATH=$WORK_DIR/uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx

# LOGGING
LOG_LEVEL=info
LOG_FILE=$WORK_DIR/logs/app.log

# CONFIGURACIÓN REGIONAL
TZ=Europe/Madrid
DEFAULT_CURRENCY=EUR
DATE_FORMAT=DD/MM/YYYY"
    
    if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
        echo "$env_content" | sudo -u "$APP_USER" tee "$env_file" > /dev/null
        sudo -u "$APP_USER" mkdir -p "$WORK_DIR/uploads" "$WORK_DIR/logs"
        chown "$APP_USER:$APP_USER" "$env_file"
        chmod 600 "$env_file"
    else
        echo "$env_content" > "$env_file"
        mkdir -p "$WORK_DIR/uploads" "$WORK_DIR/logs"
        chmod 600 "$env_file"
    fi
    
    log_success "Variables de entorno configuradas en $env_file"
}

# Función para gestionar PM2
manage_pm2() {
    local action=$1
    
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 no está instalado. Instálalo con: npm install -g pm2"
        return 1
    fi
    
    case $action in
        "restart")
            log_info "Reiniciando aplicación con PM2..."
            
            # Detener aplicación existente
            if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
                sudo -u "$APP_USER" pm2 stop tractoreando 2>/dev/null || true
                sudo -u "$APP_USER" pm2 delete tractoreando 2>/dev/null || true
            else
                pm2 stop tractoreando 2>/dev/null || true
                pm2 delete tractoreando 2>/dev/null || true
            fi
            
            # Iniciar aplicación
            cd "$WORK_DIR"
            if [[ -f "ecosystem.config.js" ]]; then
                if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
                    sudo -u "$APP_USER" pm2 start ecosystem.config.js
                    sudo -u "$APP_USER" pm2 save
                else
                    pm2 start ecosystem.config.js
                    pm2 save
                fi
                log_success "Aplicación reiniciada con PM2"
            else
                log_error "No se encontró ecosystem.config.js"
                return 1
            fi
            ;;
    esac
}

# Función para verificar estado de la aplicación
verify_application() {
    log_info "=== VERIFICACIÓN DE LA APLICACIÓN ==="
    
    sleep 5
    
    # Verificar PM2
    if command -v pm2 &> /dev/null; then
        local pm2_status
        if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
            pm2_status=$(sudo -u "$APP_USER" pm2 jlist | grep '"status":"online"' | wc -l)
        else
            pm2_status=$(pm2 jlist | grep '"status":"online"' | wc -l)
        fi
        
        if [[ $pm2_status -gt 0 ]]; then
            log_success "✓ Aplicación PM2 está online"
        else
            log_error "✗ Aplicación PM2 no está online"
            if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
                sudo -u "$APP_USER" pm2 logs tractoreando --lines 10
            else
                pm2 logs tractoreando --lines 10
            fi
            return 1
        fi
    fi
    
    # Verificar puerto
    if command -v lsof &> /dev/null && lsof -i :5000 >/dev/null 2>&1; then
        log_success "✓ Puerto 5000 está en uso"
    else
        log_error "✗ Puerto 5000 no está en uso"
        return 1
    fi
    
    # Verificar endpoint de salud
    if command -v curl &> /dev/null; then
        log_info "Verificando endpoint de salud..."
        local health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")
        
        if [[ $health_status == "200" ]]; then
            log_success "✓ API respondiendo correctamente (HTTP 200)"
        else
            log_warning "⚠ API responde con código HTTP: $health_status"
        fi
    fi
    
    log_success "Verificación completada"
}

# Función para mostrar información de despliegue
show_deployment_info() {
    echo ""
    echo "🎯 INFORMACIÓN DE DESPLIEGUE"
    echo "============================"
    echo "Aplicación: Tractoreando"
    echo "Entorno: Producción"
    echo "Puerto: 5000"
    echo "URL: https://tractoreando.softreria.com"
    echo ""
    echo "📋 ARCHIVOS IMPORTANTES:"
    echo "- Configuración: $WORK_DIR/.env"
    echo "- Frontend build: $WORK_DIR/frontend/build/"
    echo "- Logs: $WORK_DIR/logs/"
    echo "- Backups: $BACKUP_DIR"
    echo ""
    echo "🔧 COMANDOS ÚTILES:"
    echo "- Ver estado: pm2 status"
    echo "- Ver logs: pm2 logs tractoreando"
    echo "- Reiniciar: pm2 restart tractoreando"
    echo "- Diagnóstico: ./diagnostico-integral.sh --production"
    echo ""
}

# Función para construcción completa
full_build() {
    log_info "🚀 CONSTRUCCIÓN COMPLETA PARA PRODUCCIÓN"
    
    check_project_directory
    update_from_repository
    fix_api_routes
    install_dependencies "production"
    build_frontend
    
    log_success "🎉 Construcción completa finalizada"
    
    echo ""
    echo "📋 Pasos para desplegar:"
    echo "1. Copia todos los archivos del proyecto al servidor"
    echo "2. Ejecuta: $0 --fix-login (para configurar variables de entorno)"
    echo "3. Ejecuta: pm2 start ecosystem.config.js"
    echo "4. La aplicación estará disponible en el puerto 5000"
}

# Función para despliegue completo
full_deploy() {
    log_info "🚀 DESPLIEGUE COMPLETO EN PRODUCCIÓN"
    
    check_project_directory
    update_from_repository
    fix_api_routes
    install_dependencies "production"
    build_frontend
    setup_production_env
    manage_pm2 "restart"
    verify_application
    show_deployment_info
    
    log_success "🎉 ¡Despliegue completo finalizado exitosamente!"
}

# Función principal
main() {
    local mode=${1:-"--help"}
    
    case $mode in
        "--build")
            full_build
            ;;
        "--fix-routes")
            check_project_directory
            fix_api_routes
            log_success "🎉 Rutas API corregidas"
            ;;
        "--fix-login")
            check_project_directory
            setup_production_env
            manage_pm2 "restart"
            verify_application
            log_success "🎉 Login de producción reparado"
            ;;
        "--full-deploy")
            full_deploy
            ;;
        "--help")
            echo "Uso: $0 [--build|--fix-routes|--fix-login|--full-deploy|--help]"
            echo ""
            echo "Opciones:"
            echo "  --build         Construir aplicación para producción (sin desplegar)"
            echo "  --fix-routes    Corregir rutas API duplicadas"
            echo "  --fix-login     Reparar configuración de login en producción"
            echo "  --full-deploy   Despliegue completo en producción"
            echo "  --help          Mostrar esta ayuda"
            echo ""
            echo "Ejemplos:"
            echo "  $0 --build                    # Solo construir"
            echo "  $0 --fix-routes               # Corregir rutas API"
            echo "  sudo $0 --fix-login           # Reparar login (requiere root)"
            echo "  sudo $0 --full-deploy         # Despliegue completo (requiere root)"
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