#!/bin/bash

# Script de instalación automática para Tractoreando - Producción
# Autor: Sistema de Deployment Automático
# Fecha: $(date)

set -e  # Salir si cualquier comando falla

echo "🚀 Iniciando instalación de Tractoreando en producción..."
echo "================================================"

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

# Verificar si se ejecuta como root
if [[ $EUID -eq 0 ]]; then
   log_error "Este script no debe ejecutarse como root"
   exit 1
fi

# Verificar sistema operativo
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    DISTRO=$(lsb_release -si 2>/dev/null || echo "Unknown")
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    DISTRO="macOS"
else
    log_error "Sistema operativo no soportado: $OSTYPE"
    exit 1
fi

log_info "Sistema detectado: $OS ($DISTRO)"

# Configuración por defecto
APP_NAME="tractoreando"
APP_DIR="/opt/$APP_NAME"
APP_USER="$APP_NAME"
NODE_VERSION="18"
PORT_BACKEND="5000"
PORT_FRONTEND="3000"
DB_NAME="tractoreando_prod"

# Función para instalar Node.js
install_nodejs() {
    log_info "Instalando Node.js v$NODE_VERSION..."
    
    if command -v node &> /dev/null; then
        CURRENT_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $CURRENT_VERSION -ge $NODE_VERSION ]]; then
            log_success "Node.js ya está instalado (v$(node -v))"
            return
        fi
    fi
    
    if [[ "$OS" == "linux" ]]; then
        # Instalar Node.js en Linux
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OS" == "macos" ]]; then
        # Instalar Node.js en macOS
        if command -v brew &> /dev/null; then
            brew install node@$NODE_VERSION
        else
            log_error "Homebrew no está instalado. Por favor instala Node.js manualmente."
            exit 1
        fi
    fi
    
    log_success "Node.js v$(node -v) instalado correctamente"
}

# Función para instalar MongoDB
install_mongodb() {
    log_info "Instalando MongoDB..."
    
    if command -v mongod &> /dev/null; then
        log_success "MongoDB ya está instalado"
        return
    fi
    
    if [[ "$OS" == "linux" ]]; then
        # Instalar MongoDB en Linux (Ubuntu/Debian)
        wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
        echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
        sudo apt-get update
        sudo apt-get install -y mongodb-org
        sudo systemctl enable mongod
        sudo systemctl start mongod
    elif [[ "$OS" == "macos" ]]; then
        # Instalar MongoDB en macOS
        if command -v brew &> /dev/null; then
            brew tap mongodb/brew
            brew install mongodb-community
            brew services start mongodb/brew/mongodb-community
        else
            log_error "Homebrew no está instalado. Por favor instala MongoDB manualmente."
            exit 1
        fi
    fi
    
    log_success "MongoDB instalado y configurado"
}

# Función para instalar PM2
install_pm2() {
    log_info "Instalando PM2..."
    
    if command -v pm2 &> /dev/null; then
        log_success "PM2 ya está instalado"
        return
    fi
    
    sudo npm install -g pm2
    
    # Configurar PM2 para arranque automático
    sudo pm2 startup
    
    log_success "PM2 instalado correctamente"
}

# Función para instalar Nginx
install_nginx() {
    log_info "Instalando Nginx..."
    
    if command -v nginx &> /dev/null; then
        log_success "Nginx ya está instalado"
        return
    fi
    
    if [[ "$OS" == "linux" ]]; then
        sudo apt-get update
        sudo apt-get install -y nginx
        sudo systemctl enable nginx
        sudo systemctl start nginx
    elif [[ "$OS" == "macos" ]]; then
        if command -v brew &> /dev/null; then
            brew install nginx
            brew services start nginx
        else
            log_error "Homebrew no está instalado. Por favor instala Nginx manualmente."
            exit 1
        fi
    fi
    
    log_success "Nginx instalado y configurado"
}

# Función para crear usuario de aplicación
create_app_user() {
    log_info "Creando usuario de aplicación: $APP_USER"
    
    if id "$APP_USER" &>/dev/null; then
        log_success "Usuario $APP_USER ya existe"
        return
    fi
    
    if [[ "$OS" == "linux" ]]; then
        sudo useradd -r -s /bin/bash -d $APP_DIR $APP_USER
    elif [[ "$OS" == "macos" ]]; then
        sudo dscl . -create /Users/$APP_USER
        sudo dscl . -create /Users/$APP_USER UserShell /bin/bash
        sudo dscl . -create /Users/$APP_USER RealName "$APP_NAME Application User"
        sudo dscl . -create /Users/$APP_USER NFSHomeDirectory $APP_DIR
    fi
    
    log_success "Usuario $APP_USER creado"
}

# Función para configurar directorio de aplicación
setup_app_directory() {
    log_info "Configurando directorio de aplicación: $APP_DIR"
    
    # Detectar y configurar repositorio Git automáticamente
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    DETECTED_REPO=""
    
    # Intentar detectar repositorio desde el directorio del script
    if [[ -d "$SCRIPT_DIR/.git" ]]; then
        cd "$SCRIPT_DIR"
        DETECTED_REPO=$(git remote get-url origin 2>/dev/null || echo "")
    fi
    
    if [[ -n "$DETECTED_REPO" ]]; then
        log_info "Repositorio Git detectado automáticamente: $DETECTED_REPO"
        log_info "Clonando repositorio..."
        sudo -u $APP_USER git clone "$DETECTED_REPO" "$APP_DIR"
    elif [[ -n "${GIT_REPO:-}" ]]; then
        log_info "Usando repositorio especificado: $GIT_REPO"
        sudo -u $APP_USER git clone "$GIT_REPO" "$APP_DIR"
    else
        log_warning "No se detectó repositorio Git. Creando directorio vacío..."
        log_info "Podrás configurar Git más tarde con: cd $APP_DIR && git init && git remote add origin <tu-repo>"
        sudo mkdir -p "$APP_DIR"
        sudo chown $APP_USER:$APP_USER "$APP_DIR"
        
        # Copiar archivos de la aplicación desde el directorio actual
        log_info "Copiando archivos de la aplicación..."
        sudo cp -r . $APP_DIR/
        sudo chown -R $APP_USER:$APP_USER $APP_DIR
    fi
    
    log_success "Directorio de aplicación configurado"
}

# Función para instalar dependencias
install_dependencies() {
    log_info "Instalando dependencias de la aplicación..."
    
    cd $APP_DIR
    
    # Instalar dependencias del backend
    log_info "Instalando dependencias del backend..."
    sudo -u $APP_USER npm install --production
    
    # Instalar dependencias del frontend
    log_info "Instalando dependencias del frontend..."
    cd $APP_DIR/frontend
    sudo -u $APP_USER npm install
    
    # Construir frontend para producción
    log_info "Construyendo frontend para producción..."
    sudo -u $APP_USER npm run build
    
    cd $APP_DIR
    
    log_success "Dependencias instaladas correctamente"
}

# Función para configurar variables de entorno
setup_environment() {
    log_info "Configurando variables de entorno..."
    
    # Crear archivo .env para producción
    sudo -u $APP_USER tee $APP_DIR/.env > /dev/null <<EOF
# Configuración de Producción - Tractoreando
NODE_ENV=production
PORT=$PORT_BACKEND

# Base de datos
MONGODB_URI=mongodb://localhost:27017/$DB_NAME

# JWT
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRE=7d

# Configuración de archivos
UPLOAD_PATH=/opt/$APP_NAME/uploads
MAX_FILE_SIZE=10485760

# Configuración de email (configurar según tu proveedor)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-password-de-aplicacion
EMAIL_FROM=noreply@tractoreando.com

# URLs
FRONTEND_URL=http://localhost:$PORT_FRONTEND
BACKEND_URL=http://localhost:$PORT_BACKEND
EOF

    # Crear directorio de uploads
    sudo mkdir -p $APP_DIR/uploads
    sudo chown $APP_USER:$APP_USER $APP_DIR/uploads
    
    log_success "Variables de entorno configuradas"
}

# Función para configurar base de datos
setup_database() {
    log_info "Configurando base de datos..."
    
    # Crear base de datos y usuario inicial
    cd $APP_DIR
    
    # Ejecutar script de inicialización si existe
    if [[ -f "init-db.js" ]]; then
        sudo -u $APP_USER node init-db.js
    fi
    
    log_success "Base de datos configurada"
}

# Función para configurar PM2
setup_pm2() {
    log_info "Configurando PM2..."
    
    # Crear archivo de configuración PM2
    sudo -u $APP_USER tee $APP_DIR/ecosystem.config.js > /dev/null <<EOF
module.exports = {
  apps: [{
    name: '$APP_NAME-backend',
    script: 'server.js',
    cwd: '$APP_DIR',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: $PORT_BACKEND
    },
    error_file: '$APP_DIR/logs/backend-error.log',
    out_file: '$APP_DIR/logs/backend-out.log',
    log_file: '$APP_DIR/logs/backend.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

    # Crear directorio de logs
    sudo mkdir -p $APP_DIR/logs
    sudo chown $APP_USER:$APP_USER $APP_DIR/logs
    
    # Iniciar aplicación con PM2
    sudo -u $APP_USER pm2 start $APP_DIR/ecosystem.config.js
    sudo -u $APP_USER pm2 save
    
    log_success "PM2 configurado y aplicación iniciada"
}

# Función para configurar Nginx
setup_nginx() {
    log_info "Configurando Nginx..."
    
    # Crear configuración de Nginx
    sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    # Servir archivos estáticos del frontend
    location / {
        root $APP_DIR/frontend/build;
        try_files \$uri \$uri/ /index.html;
        
        # Headers de seguridad
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    }
    
    # Proxy para API del backend
    location /api {
        proxy_pass http://localhost:$PORT_BACKEND;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Configuración para archivos subidos
    location /uploads {
        alias $APP_DIR/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Logs
    access_log /var/log/nginx/$APP_NAME-access.log;
    error_log /var/log/nginx/$APP_NAME-error.log;
}
EOF

    # Habilitar sitio
    sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    
    # Remover sitio por defecto si existe
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Verificar configuración
    sudo nginx -t
    
    # Recargar Nginx
    sudo systemctl reload nginx
    
    log_success "Nginx configurado correctamente"
}

# Función para configurar firewall
setup_firewall() {
    log_info "Configurando firewall..."
    
    if [[ "$OS" == "linux" ]] && command -v ufw &> /dev/null; then
        sudo ufw allow 22/tcp
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw --force enable
        log_success "Firewall configurado"
    else
        log_warning "Firewall no configurado automáticamente"
    fi
}

# Función principal de instalación
main() {
    log_info "Iniciando instalación completa..."
    
    # Actualizar sistema
    if [[ "$OS" == "linux" ]]; then
        log_info "Actualizando sistema..."
        sudo apt-get update && sudo apt-get upgrade -y
    fi
    
    # Instalar componentes
    install_nodejs
    install_mongodb
    install_pm2
    install_nginx
    
    # Configurar aplicación
    create_app_user
    setup_app_directory
    install_dependencies
    setup_environment
    setup_database
    setup_pm2
    setup_nginx
    setup_firewall
    
    log_success "¡Instalación completada exitosamente!"
    echo ""
    echo "================================================"
    echo "🎉 Tractoreando está ahora ejecutándose en producción"
    echo "================================================"
    echo ""
    echo "📍 URL de la aplicación: http://$(hostname -I | awk '{print $1}' || echo 'localhost')"
    echo "📁 Directorio de la aplicación: $APP_DIR"
    echo "👤 Usuario de la aplicación: $APP_USER"
    echo "🗄️  Base de datos: $DB_NAME"
    echo ""
    echo "📋 Comandos útiles:"
    echo "   • Ver logs: sudo -u $APP_USER pm2 logs"
    echo "   • Reiniciar app: sudo -u $APP_USER pm2 restart all"
    echo "   • Estado de la app: sudo -u $APP_USER pm2 status"
    echo "   • Logs de Nginx: sudo tail -f /var/log/nginx/$APP_NAME-*.log"
    echo ""
    echo "⚠️  IMPORTANTE: Configura las variables de entorno en $APP_DIR/.env"
    echo "   especialmente EMAIL_* para el envío de correos"
    echo ""
}

# Verificar argumentos
if [[ $1 == "--help" ]] || [[ $1 == "-h" ]]; then
    echo "Script de instalación de Tractoreando para producción"
    echo ""
    echo "Uso: $0 [opciones]"
    echo ""
    echo "Opciones:"
    echo "  --help, -h     Mostrar esta ayuda"
    echo "  --dry-run      Mostrar qué se haría sin ejecutar"
    echo ""
    echo "Este script instalará y configurará:"
    echo "  • Node.js v$NODE_VERSION"
    echo "  • MongoDB"
    echo "  • PM2 (Process Manager)"
    echo "  • Nginx (Reverse Proxy)"
    echo "  • Aplicación Tractoreando"
    echo ""
    exit 0
fi

if [[ $1 == "--dry-run" ]]; then
    log_info "MODO DRY-RUN: Mostrando qué se haría..."
    echo "1. Instalar Node.js v$NODE_VERSION"
    echo "2. Instalar MongoDB"
    echo "3. Instalar PM2"
    echo "4. Instalar Nginx"
    echo "5. Crear usuario $APP_USER"
    echo "6. Configurar directorio $APP_DIR"
    echo "7. Instalar dependencias de la aplicación"
    echo "8. Configurar variables de entorno"
    echo "9. Configurar base de datos"
    echo "10. Configurar PM2 y iniciar aplicación"
    echo "11. Configurar Nginx como reverse proxy"
    echo "12. Configurar firewall"
    exit 0
fi

# Ejecutar instalación
main