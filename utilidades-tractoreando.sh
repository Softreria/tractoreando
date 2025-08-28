#!/bin/bash

# Script de Utilidades Integral - Tractoreando
# Combina funcionalidades de acceso-inmediato.sh, solucion-rapida.sh y force-rebuild-frontend.sh
# Uso: ./utilidades-tractoreando.sh [--quick-fix|--immediate-access|--rebuild-frontend|--help]

set -e

echo "🛠️ Utilidades Integrales de Tractoreando"
echo "========================================"
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
BACKUP_DIR="$APP_DIR/backups"
DATE=$(date +"%Y%m%d_%H%M%S")

# Función para verificar permisos
check_permissions() {
    local mode=$1
    
    if [[ "$mode" == "--immediate-access" ]]; then
        if [[ $EUID -ne 0 ]]; then
            log_error "El modo de acceso inmediato requiere permisos de root"
            log_info "Ejecuta: sudo $0 --immediate-access"
            exit 1
        fi
    fi
}

# Función para verificar directorio del proyecto
check_project_directory() {
    if [[ ! -f "package.json" ]] && [[ ! -f "$APP_DIR/package.json" ]]; then
        log_error "No se encontró package.json. Ejecuta desde el directorio del proyecto o verifica $APP_DIR"
        exit 1
    fi
    
    # Determinar directorio de trabajo
    if [[ -f "package.json" ]]; then
        WORK_DIR=$(pwd)
        log_info "Trabajando desde directorio actual: $WORK_DIR"
    else
        WORK_DIR="$APP_DIR"
        log_info "Trabajando desde directorio de aplicación: $WORK_DIR"
    fi
}

# Función para verificar y reparar MongoDB
fix_mongodb() {
    log_info "🔧 Verificando y reparando MongoDB..."
    
    # Verificar si MongoDB está ejecutándose
    if pgrep -f mongod >/dev/null 2>&1; then
        log_success "✓ MongoDB está ejecutándose"
        return 0
    fi
    
    log_warning "MongoDB no está ejecutándose, intentando iniciar..."
    
    # Intentar iniciar con diferentes métodos
    if command -v brew &> /dev/null; then
        # macOS con Homebrew
        brew services start mongodb-community
        sleep 3
    elif command -v systemctl &> /dev/null; then
        # Linux con systemd
        if [[ $EUID -eq 0 ]]; then
            systemctl start mongod || {
                log_info "MongoDB no instalado, instalando..."
                install_mongodb_linux
            }
        else
            log_warning "Se requieren permisos de root para iniciar MongoDB en Linux"
            return 1
        fi
    else
        log_error "No se encontró método para iniciar MongoDB"
        return 1
    fi
    
    # Verificar que se inició correctamente
    sleep 3
    if pgrep -f mongod >/dev/null 2>&1; then
        log_success "✓ MongoDB iniciado correctamente"
        return 0
    else
        log_error "✗ No se pudo iniciar MongoDB"
        return 1
    fi
}

# Función para instalar MongoDB en Linux (solo con root)
install_mongodb_linux() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Se requieren permisos de root para instalar MongoDB"
        return 1
    fi
    
    log_info "Instalando MongoDB en Linux..."
    
    # Detectar distribución
    if [[ -f /etc/debian_version ]]; then
        # Ubuntu/Debian
        wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
        echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
        apt update && apt install -y mongodb-org
        systemctl enable mongod && systemctl start mongod
    elif [[ -f /etc/redhat-release ]]; then
        # CentOS/RHEL
        cat > /etc/yum.repos.d/mongodb-org-7.0.repo << EOF
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-7.0.asc
EOF
        yum install -y mongodb-org
        systemctl enable mongod && systemctl start mongod
    else
        log_error "Distribución no soportada para instalación automática"
        return 1
    fi
    
    log_success "MongoDB instalado y configurado"
}

# Función para verificar y reparar Nginx (solo con root)
fix_nginx() {
    if [[ $EUID -ne 0 ]]; then
        log_warning "Se requieren permisos de root para gestionar Nginx"
        return 0
    fi
    
    log_info "🔧 Verificando y reparando Nginx..."
    
    if ! systemctl is-active --quiet nginx; then
        log_warning "Nginx no está ejecutándose, iniciando..."
        systemctl start nginx || {
            log_info "Nginx no instalado, instalando..."
            apt install -y nginx
            systemctl enable nginx && systemctl start nginx
        }
    fi
    
    log_success "✓ Nginx verificado"
}

# Función para instalar dependencias del sistema
install_system_dependencies() {
    if [[ $EUID -ne 0 ]]; then
        log_warning "Se requieren permisos de root para instalar dependencias del sistema"
        return 0
    fi
    
    log_info "📦 Instalando dependencias del sistema..."
    
    # Instalar Node.js si no está instalado
    if ! command -v node &> /dev/null; then
        log_info "Instalando Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt install -y nodejs
    fi
    
    # Instalar PM2 si no está instalado
    if ! command -v pm2 &> /dev/null; then
        log_info "Instalando PM2..."
        npm install -g pm2
    fi
    
    log_success "Dependencias del sistema verificadas"
}

# Función para configurar aplicación (modo acceso inmediato)
setup_application() {
    log_info "📦 Configurando aplicación..."
    
    # Crear usuario si no existe (solo con root)
    if [[ $EUID -eq 0 ]] && ! id "$APP_USER" &>/dev/null; then
        useradd -r -s /bin/bash -d "$APP_DIR" "$APP_USER"
        log_success "Usuario $APP_USER creado"
    fi
    
    # Crear directorio y copiar archivos
    if [[ $EUID -eq 0 ]]; then
        mkdir -p "$APP_DIR"
        if [[ -f "package.json" && "$(pwd)" != "$APP_DIR" ]]; then
            cp -r . "$APP_DIR/"
            chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
            log_success "Archivos copiados a $APP_DIR"
        fi
    fi
    
    # Cambiar al directorio de trabajo
    cd "$WORK_DIR"
    
    # Instalar dependencias del backend
    log_info "Instalando dependencias del backend..."
    if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
        sudo -u "$APP_USER" npm install
    else
        npm install
    fi
    
    # Instalar dependencias del frontend
    if [[ -d "frontend" ]]; then
        log_info "Instalando dependencias del frontend..."
        cd frontend
        if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
            sudo -u "$APP_USER" npm install
        else
            npm install
        fi
        cd ..
    fi
    
    log_success "Aplicación configurada"
}

# Función para configurar variables de entorno optimizadas
setup_optimized_env() {
    log_info "⚙️ Configurando variables de entorno optimizadas..."
    
    local env_file="$WORK_DIR/.env"
    
    # Generar secretos seguros
    local jwt_secret=$(openssl rand -hex 32)
    local session_secret=$(openssl rand -hex 32)
    
    # Crear archivo .env optimizado
    local env_content="# CONFIGURACIÓN OPTIMIZADA PARA TRACTOREANDO
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

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

# SESIÓN
SESSION_SECRET=$session_secret
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_HTTP_ONLY=true
SESSION_COOKIE_MAX_AGE=86400000

# URLS PARA PROXY MANAGER
BASE_URL=https://tractoreando.softreria.com
FRONTEND_URL=https://tractoreando.softreria.com
BACKEND_URL=https://tractoreando.softreria.com/api
API_URL=https://tractoreando.softreria.com/api

# CORS OPTIMIZADO
CORS_ORIGIN=https://tractoreando.softreria.com
CORS_CREDENTIALS=true
TRUST_PROXY=true

# ARCHIVOS
UPLOAD_PATH=$WORK_DIR/uploads
MAX_FILE_SIZE=10485760

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
    else
        echo "$env_content" > "$env_file"
        mkdir -p "$WORK_DIR/uploads" "$WORK_DIR/logs"
    fi
    
    log_success "Variables de entorno configuradas en $env_file"
}

# Función para configurar frontend de producción
setup_frontend_env() {
    log_info "🎨 Configurando entorno del frontend..."
    
    local frontend_env="$WORK_DIR/frontend/.env.production"
    
    if [[ ! -f "$frontend_env" ]]; then
        local frontend_content="# Variables de entorno para producción - Frontend Tractoreando
REACT_APP_API_URL=https://tractoreando.softreria.com/api
REACT_APP_ENV=production
GENERATE_SOURCEMAP=false"
        
        if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
            echo "$frontend_content" | sudo -u "$APP_USER" tee "$frontend_env" > /dev/null
        else
            echo "$frontend_content" > "$frontend_env"
        fi
        
        log_success "Archivo .env.production del frontend creado"
    else
        log_success "Archivo .env.production del frontend ya existe"
    fi
}

# Función para construir frontend
build_frontend() {
    log_info "🏗️ Construyendo frontend..."
    
    if [[ ! -d "$WORK_DIR/frontend" ]]; then
        log_warning "Directorio frontend no encontrado"
        return 0
    fi
    
    cd "$WORK_DIR/frontend"
    
    # Verificar si necesita construcción
    if [[ ! -d "build" ]]; then
        log_info "Directorio build no existe, construyendo..."
    else
        log_info "Reconstruyendo frontend..."
    fi
    
    if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
        sudo -u "$APP_USER" npm run build
    else
        npm run build
    fi
    
    cd "$WORK_DIR"
    
    # Verificar construcción exitosa
    if [[ -f "$WORK_DIR/frontend/build/index.html" ]]; then
        log_success "Frontend construido exitosamente"
    else
        log_error "Error al construir el frontend"
        return 1
    fi
}

# Función para reconstruir frontend forzadamente
force_rebuild_frontend() {
    log_info "🔄 FORZANDO RECONSTRUCCIÓN DEL FRONTEND"
    
    # Crear backup si existe build anterior
    if [[ -d "$WORK_DIR/frontend/build" ]]; then
        log_info "Creando backup del build actual..."
        mkdir -p "$BACKUP_DIR"
        
        if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
            sudo -u "$APP_USER" tar -czf "$BACKUP_DIR/frontend-build-backup-$DATE.tar.gz" -C "$WORK_DIR/frontend" build/
        else
            tar -czf "$BACKUP_DIR/frontend-build-backup-$DATE.tar.gz" -C "$WORK_DIR/frontend" build/
        fi
        
        log_success "Backup creado: frontend-build-backup-$DATE.tar.gz"
    fi
    
    # Detener aplicación
    log_info "Deteniendo aplicación..."
    if command -v pm2 &> /dev/null; then
        if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
            sudo -u "$APP_USER" pm2 stop all || true
        else
            pm2 stop all || true
        fi
    fi
    
    # Limpiar completamente
    log_info "Limpiando build y dependencias anteriores..."
    if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
        sudo -u "$APP_USER" rm -rf "$WORK_DIR/frontend/build"
        sudo -u "$APP_USER" rm -rf "$WORK_DIR/frontend/node_modules"
        sudo -u "$APP_USER" npm cache clean --force
    else
        rm -rf "$WORK_DIR/frontend/build"
        rm -rf "$WORK_DIR/frontend/node_modules"
        npm cache clean --force
    fi
    
    # Reinstalar dependencias
    log_info "Reinstalando dependencias del frontend..."
    cd "$WORK_DIR/frontend"
    if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
        sudo -u "$APP_USER" npm install
    else
        npm install
    fi
    
    # Configurar entorno de producción
    setup_frontend_env
    
    # Construir con configuración de producción
    log_info "Construyendo frontend para producción..."
    if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
        sudo -u "$APP_USER" NODE_ENV=production npm run build
    else
        NODE_ENV=production npm run build
    fi
    
    cd "$WORK_DIR"
    
    # Verificar construcción
    if [[ ! -f "$WORK_DIR/frontend/build/index.html" ]]; then
        log_error "Error al construir el frontend"
        
        # Restaurar backup si existe
        if [[ -f "$BACKUP_DIR/frontend-build-backup-$DATE.tar.gz" ]]; then
            log_info "Restaurando backup anterior..."
            cd "$WORK_DIR/frontend"
            if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
                sudo -u "$APP_USER" tar -xzf "$BACKUP_DIR/frontend-build-backup-$DATE.tar.gz"
            else
                tar -xzf "$BACKUP_DIR/frontend-build-backup-$DATE.tar.gz"
            fi
            cd "$WORK_DIR"
            log_warning "Backup restaurado"
        fi
        
        return 1
    fi
    
    # Verificar rutas duplicadas
    log_info "Verificando rutas duplicadas..."
    local duplicate_routes=$(find "$WORK_DIR/frontend/build/static/js" -name "*.js" -exec grep -l "/api/api" {} \; 2>/dev/null | wc -l)
    
    if [[ $duplicate_routes -gt 0 ]]; then
        log_error "¡ATENCIÓN! Se encontraron rutas duplicadas /api/api en $duplicate_routes archivos"
        log_error "El problema persiste. Revisa la configuración del frontend."
        return 1
    else
        log_success "No se encontraron rutas duplicadas /api/api"
    fi
    
    log_success "Frontend reconstruido exitosamente"
}

# Función para gestionar PM2
manage_pm2() {
    local action=$1
    
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 no está instalado"
        return 1
    fi
    
    case $action in
        "start")
            log_info "Iniciando aplicación con PM2..."
            
            # Limpiar procesos existentes
            if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
                sudo -u "$APP_USER" pm2 delete all 2>/dev/null || true
                sudo -u "$APP_USER" pm2 kill 2>/dev/null || true
            else
                pm2 delete all 2>/dev/null || true
                pm2 kill 2>/dev/null || true
            fi
            
            # Iniciar aplicación
            cd "$WORK_DIR"
            if [[ -f "ecosystem.config.js" ]]; then
                if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
                    sudo -u "$APP_USER" pm2 start ecosystem.config.js
                else
                    pm2 start ecosystem.config.js
                fi
            else
                log_error "No se encontró ecosystem.config.js"
                return 1
            fi
            ;;
        "restart")
            log_info "Reiniciando aplicación..."
            if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
                sudo -u "$APP_USER" pm2 restart all
            else
                pm2 restart all
            fi
            ;;
        "stop")
            log_info "Deteniendo aplicación..."
            if [[ $EUID -eq 0 && -d "$APP_DIR" ]]; then
                sudo -u "$APP_USER" pm2 stop all
            else
                pm2 stop all
            fi
            ;;
    esac
}

# Función para verificar estado final
verify_status() {
    log_info "=== VERIFICACIÓN FINAL ==="
    
    # Verificar MongoDB
    if pgrep -f mongod >/dev/null 2>&1; then
        log_success "✓ MongoDB está ejecutándose"
    else
        log_error "✗ MongoDB no está ejecutándose"
    fi
    
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
                sudo -u "$APP_USER" pm2 status
            else
                pm2 status
            fi
        fi
    fi
    
    # Verificar puertos
    for port in 5000 27017; do
        if command -v lsof &> /dev/null && lsof -i :$port >/dev/null 2>&1; then
            log_success "✓ Puerto $port está en uso"
        else
            log_warning "⚠ Puerto $port no detectado"
        fi
    done
    
    # Verificar conectividad
    if command -v curl &> /dev/null; then
        log_info "Verificando conectividad..."
        sleep 2
        
        local http_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null || echo "000")
        if [[ $http_status =~ ^(200|404)$ ]]; then
            log_success "✓ Backend accesible en http://localhost:5000"
        else
            log_error "✗ Backend no accesible (HTTP $http_status)"
        fi
    fi
}

# Función para mostrar información de acceso
show_access_info() {
    echo ""
    echo "🎯 INFORMACIÓN DE ACCESO"
    echo "========================"
    echo "Backend API: http://localhost:5000"
    echo "Frontend: Servido por el backend en http://localhost:5000"
    echo "Producción: https://tractoreando.softreria.com"
    echo ""
    echo "📋 COMANDOS ÚTILES:"
    echo "- Ver estado PM2: pm2 status"
    echo "- Ver logs: pm2 logs"
    echo "- Reiniciar app: pm2 restart tractoreando"
    echo "- Detener app: pm2 stop tractoreando"
    echo "- Diagnóstico: ./diagnostico-integral.sh"
    echo ""
}

# Función de solución rápida (sin root)
quick_fix() {
    log_info "🔧 SOLUCIÓN RÁPIDA (sin permisos de root)"
    
    check_project_directory
    
    # Verificar y reparar MongoDB
    fix_mongodb
    
    # Instalar dependencias si es necesario
    log_info "Verificando dependencias..."
    if [[ ! -d "$WORK_DIR/node_modules" ]]; then
        log_info "Instalando dependencias del backend..."
        cd "$WORK_DIR"
        npm install
    fi
    
    if [[ -d "$WORK_DIR/frontend" && ! -d "$WORK_DIR/frontend/node_modules" ]]; then
        log_info "Instalando dependencias del frontend..."
        cd "$WORK_DIR/frontend"
        npm install
        cd "$WORK_DIR"
    fi
    
    # Construir frontend si es necesario
    if [[ -d "$WORK_DIR/frontend" && ! -d "$WORK_DIR/frontend/build" ]]; then
        build_frontend
    fi
    
    # Verificar archivo .env
    if [[ ! -f "$WORK_DIR/.env" ]]; then
        if [[ -f "$WORK_DIR/.env.production" ]]; then
            log_info "Copiando .env.production a .env..."
            cp "$WORK_DIR/.env.production" "$WORK_DIR/.env"
        else
            log_warning "No se encontró archivo .env, creando configuración básica..."
            setup_optimized_env
        fi
    fi
    
    # Gestionar PM2
    manage_pm2 "start"
    
    sleep 5
    verify_status
    show_access_info
    
    # Verificar éxito
    local pm2_online=$(pm2 jlist | grep '"status":"online"' | wc -l)
    if [[ $pm2_online -gt 0 ]] && pgrep -f mongod >/dev/null 2>&1; then
        log_success "🎉 ¡Aplicación lista! Accede en http://localhost:5000"
        return 0
    else
        log_error "🚨 Algunos componentes no están funcionando correctamente"
        return 1
    fi
}

# Función de acceso inmediato (con root)
immediate_access() {
    log_info "🚀 ACCESO INMEDIATO (con permisos de root)"
    
    check_project_directory
    install_system_dependencies
    fix_mongodb
    fix_nginx
    setup_application
    setup_optimized_env
    setup_frontend_env
    build_frontend
    manage_pm2 "start"
    
    sleep 5
    verify_status
    show_access_info
    
    log_success "🎉 ¡Instalación completa! Aplicación lista para usar."
}

# Función principal
main() {
    local mode=${1:-"--quick-fix"}
    
    check_permissions "$mode"
    
    case $mode in
        "--quick-fix")
            quick_fix
            ;;
        "--immediate-access")
            immediate_access
            ;;
        "--rebuild-frontend")
            check_project_directory
            force_rebuild_frontend
            manage_pm2 "restart"
            sleep 5
            verify_status
            log_success "🎉 Frontend reconstruido y aplicación reiniciada"
            ;;
        "--help")
            echo "Uso: $0 [--quick-fix|--immediate-access|--rebuild-frontend|--help]"
            echo ""
            echo "Opciones:"
            echo "  --quick-fix         Solución rápida sin permisos de root (por defecto)"
            echo "  --immediate-access  Instalación completa con permisos de root"
            echo "  --rebuild-frontend  Reconstruir frontend forzadamente"
            echo "  --help              Mostrar esta ayuda"
            echo ""
            echo "Ejemplos:"
            echo "  $0                           # Solución rápida"
            echo "  $0 --quick-fix               # Solución rápida explícita"
            echo "  sudo $0 --immediate-access   # Instalación completa"
            echo "  $0 --rebuild-frontend        # Reconstruir frontend"
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