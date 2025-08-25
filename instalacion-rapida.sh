#!/bin/bash

# Script de Instalación Rápida - Tractoreando
# Resuelve problemas de acceso y configura todo correctamente
# Para usar con Nginx Proxy Manager

set -e

echo "🚀 Instalación Rápida de Tractoreando"
echo "====================================="

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuración
APP_DIR="/opt/tractoreando"
APP_USER="tractoreando"
DOMAIN="tractoreando.softreria.com"

# Función para verificar si se ejecuta como root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script debe ejecutarse como root"
        log_info "Ejecuta: sudo ./instalacion-rapida.sh"
        exit 1
    fi
}

# Función para instalar dependencias del sistema
install_system_deps() {
    log_info "Instalando dependencias del sistema..."
    
    # Actualizar repositorios
    apt update
    
    # Instalar dependencias básicas
    apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release
    
    log_success "Dependencias del sistema instaladas"
}

# Función para instalar Node.js
install_nodejs() {
    log_info "Instalando Node.js 18..."
    
    # Verificar si Node.js ya está instalado
    if command -v node &> /dev/null; then
        local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $node_version -ge 18 ]]; then
            log_success "Node.js $node_version ya está instalado"
            return 0
        fi
    fi
    
    # Instalar Node.js 18
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    
    # Verificar instalación
    node --version
    npm --version
    
    log_success "Node.js instalado correctamente"
}

# Función para instalar MongoDB
install_mongodb() {
    log_info "Instalando MongoDB..."
    
    # Verificar si MongoDB ya está instalado
    if systemctl is-active --quiet mongod; then
        log_success "MongoDB ya está instalado y ejecutándose"
        return 0
    fi
    
    # Instalar MongoDB
    wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    
    apt update
    apt install -y mongodb-org
    
    # Configurar MongoDB
    systemctl enable mongod
    systemctl start mongod
    
    # Esperar a que MongoDB esté listo
    sleep 5
    
    # Verificar que MongoDB esté funcionando
    if systemctl is-active --quiet mongod; then
        log_success "MongoDB instalado y ejecutándose"
    else
        log_error "Error al iniciar MongoDB"
        exit 1
    fi
}

# Función para instalar PM2
install_pm2() {
    log_info "Instalando PM2..."
    
    npm install -g pm2
    
    # Configurar PM2 para arranque automático
    pm2 startup
    
    log_success "PM2 instalado correctamente"
}

# Función para instalar Nginx
install_nginx() {
    log_info "Instalando Nginx..."
    
    # Verificar si Nginx ya está instalado
    if systemctl is-active --quiet nginx; then
        log_success "Nginx ya está instalado y ejecutándose"
        return 0
    fi
    
    apt install -y nginx
    
    # Habilitar y iniciar Nginx
    systemctl enable nginx
    systemctl start nginx
    
    log_success "Nginx instalado correctamente"
}

# Función para crear usuario de aplicación
create_app_user() {
    log_info "Creando usuario de aplicación..."
    
    if id "$APP_USER" &>/dev/null; then
        log_success "Usuario $APP_USER ya existe"
    else
        useradd -r -s /bin/bash -d "$APP_DIR" "$APP_USER"
        log_success "Usuario $APP_USER creado"
    fi
}

# Función para configurar directorio de aplicación
setup_app_directory() {
    log_info "Configurando directorio de aplicación..."
    
    # Crear directorio si no existe
    mkdir -p "$APP_DIR"
    
    # Copiar archivos de la aplicación
    if [[ -f "package.json" ]]; then
        log_info "Copiando archivos desde directorio actual..."
        cp -r . "$APP_DIR/"
    else
        log_error "No se encontró package.json en el directorio actual"
        log_info "Asegúrate de ejecutar este script desde el directorio del proyecto"
        exit 1
    fi
    
    # Cambiar propietario
    chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
    
    log_success "Directorio de aplicación configurado"
}

# Función para instalar dependencias de la aplicación
install_app_deps() {
    log_info "Instalando dependencias de la aplicación..."
    
    cd "$APP_DIR"
    
    # Instalar dependencias del backend
    sudo -u "$APP_USER" npm install
    
    # Instalar dependencias del frontend
    if [[ -d "frontend" ]]; then
        cd frontend
        sudo -u "$APP_USER" npm install
        sudo -u "$APP_USER" npm run build
        cd ..
    fi
    
    log_success "Dependencias instaladas correctamente"
}

# Función para configurar variables de entorno
setup_environment() {
    log_info "Configurando variables de entorno..."
    
    # Generar secretos seguros
    local jwt_secret=$(openssl rand -hex 32)
    local session_secret=$(openssl rand -hex 32)
    
    # Crear archivo .env
    sudo -u "$APP_USER" tee "$APP_DIR/.env" > /dev/null <<EOF
# CONFIGURACIÓN DE PRODUCCIÓN - TRACTOREANDO
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# BASE DE DATOS
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

# URLs (para proxy manager)
BASE_URL=https://$DOMAIN
FRONTEND_URL=https://$DOMAIN
BACKEND_URL=https://$DOMAIN/api
API_URL=https://$DOMAIN/api

# CORS
CORS_ORIGIN=https://$DOMAIN
CORS_CREDENTIALS=true
TRUST_PROXY=true

# ARCHIVOS
UPLOAD_PATH=$APP_DIR/uploads
MAX_FILE_SIZE=10485760

# LOGGING
LOG_LEVEL=info
LOG_FILE=$APP_DIR/logs/app.log

# CONFIGURACIÓN REGIONAL
TZ=Europe/Madrid
I18N_DEFAULT_LOCALE=es
DEFAULT_CURRENCY=EUR
DATE_FORMAT=DD/MM/YYYY
EOF
    
    # Crear directorios necesarios
    sudo -u "$APP_USER" mkdir -p "$APP_DIR/uploads" "$APP_DIR/logs"
    
    log_success "Variables de entorno configuradas"
}

# Función para configurar Nginx
setup_nginx() {
    log_info "Configurando Nginx..."
    
    # Crear configuración de Nginx
    tee /etc/nginx/sites-available/tractoreando > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    # Servir archivos estáticos del frontend
    location / {
        root $APP_DIR/frontend/build;
        try_files \$uri \$uri/ /index.html;
        
        # Headers para archivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Proxy para API
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Logs
    access_log /var/log/nginx/tractoreando_access.log;
    error_log /var/log/nginx/tractoreando_error.log;
}
EOF
    
    # Habilitar sitio
    ln -sf /etc/nginx/sites-available/tractoreando /etc/nginx/sites-enabled/
    
    # Deshabilitar sitio por defecto
    rm -f /etc/nginx/sites-enabled/default
    
    # Verificar configuración
    nginx -t
    
    # Recargar Nginx
    systemctl reload nginx
    
    log_success "Nginx configurado correctamente"
}

# Función para configurar PM2
setup_pm2() {
    log_info "Configurando PM2..."
    
    cd "$APP_DIR"
    
    # Crear archivo de configuración PM2
    sudo -u "$APP_USER" tee ecosystem.config.js > /dev/null <<EOF
module.exports = {
  apps: [{
    name: 'tractoreando',
    script: 'server.js',
    cwd: '$APP_DIR',
    user: '$APP_USER',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    error_file: '$APP_DIR/logs/pm2-error.log',
    out_file: '$APP_DIR/logs/pm2-out.log',
    log_file: '$APP_DIR/logs/pm2-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
    
    # Iniciar aplicación con PM2
    sudo -u "$APP_USER" pm2 start ecosystem.config.js
    
    # Guardar configuración PM2
    sudo -u "$APP_USER" pm2 save
    
    log_success "PM2 configurado correctamente"
}

# Función para configurar firewall
setup_firewall() {
    log_info "Configurando firewall..."
    
    # Permitir SSH, HTTP y HTTPS
    ufw allow ssh
    ufw allow http
    ufw allow https
    
    # Habilitar firewall si no está activo
    if ! ufw status | grep -q "Status: active"; then
        echo "y" | ufw enable
    fi
    
    log_success "Firewall configurado"
}

# Función para verificar instalación
verify_installation() {
    log_info "Verificando instalación..."
    
    # Verificar servicios
    local services=("mongod" "nginx")
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service"; then
            log_success "✓ $service está ejecutándose"
        else
            log_error "✗ $service no está ejecutándose"
        fi
    done
    
    # Verificar PM2
    if sudo -u "$APP_USER" pm2 list | grep -q "tractoreando"; then
        log_success "✓ Aplicación PM2 está ejecutándose"
    else
        log_error "✗ Aplicación PM2 no está ejecutándose"
    fi
    
    # Verificar puertos
    if netstat -tlnp | grep -q ":5000"; then
        log_success "✓ Backend escuchando en puerto 5000"
    else
        log_error "✗ Backend no está escuchando en puerto 5000"
    fi
    
    if netstat -tlnp | grep -q ":80"; then
        log_success "✓ Nginx escuchando en puerto 80"
    else
        log_error "✗ Nginx no está escuchando en puerto 80"
    fi
    
    # Verificar conectividad
    if curl -s http://localhost:80 > /dev/null; then
        log_success "✓ Frontend accesible localmente"
    else
        log_warning "⚠ Frontend no accesible localmente"
    fi
    
    if curl -s http://localhost:5000/api/health > /dev/null; then
        log_success "✓ API accesible localmente"
    else
        log_warning "⚠ API no accesible localmente"
    fi
}

# Función principal
main() {
    log_info "Iniciando instalación rápida de Tractoreando..."
    
    check_root
    install_system_deps
    install_nodejs
    install_mongodb
    install_pm2
    install_nginx
    create_app_user
    setup_app_directory
    install_app_deps
    setup_environment
    setup_nginx
    setup_pm2
    setup_firewall
    
    log_success "¡Instalación completada!"
    
    echo ""
    echo "🎉 TRACTOREANDO INSTALADO CORRECTAMENTE"
    echo "======================================="
    echo ""
    echo "📋 INFORMACIÓN DE ACCESO:"
    echo "   • URL Local: http://$(hostname -I | awk '{print $1}')"
    echo "   • URL Pública: https://$DOMAIN (configurar en Nginx Proxy Manager)"
    echo "   • Backend: Puerto 5000"
    echo "   • Frontend: Puerto 80"
    echo ""
    echo "🔧 CONFIGURACIÓN NGINX PROXY MANAGER:"
    echo "   • Domain Names: $DOMAIN"
    echo "   • Forward Hostname/IP: $(hostname -I | awk '{print $1}')"
    echo "   • Forward Port: 80"
    echo "   • Cache Assets: Habilitado"
    echo "   • Block Common Exploits: Habilitado"
    echo "   • Websockets Support: Habilitado"
    echo ""
    echo "📊 VERIFICACIÓN:"
    verify_installation
    echo ""
    echo "🚀 ¡La aplicación está lista para usar!"
}

# Ejecutar función principal
main "$@"