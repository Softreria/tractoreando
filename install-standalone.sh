#!/bin/bash

# Script de instalación para servidor independiente
# Para usar cuando la aplicación está en un servidor separado del proxy manager

set -e

echo "🚀 Instalando Tractoreando en servidor independiente..."
echo "======================================================"
echo "⚠️  Este script está diseñado para servidores separados del proxy manager"
echo "📡 Configurará la aplicación para funcionar detrás de un proxy reverso"
echo ""

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

# Configuración específica para servidor independiente
APP_NAME="tractoreando"
APP_DIR="/opt/$APP_NAME"
APP_USER="$APP_NAME"
APP_GROUP="$APP_NAME"
NGINX_CONFIG="nginx-standalone.conf"
ENV_FILE=".env.production"
INTERNAL_PORT=5000
NGINX_PORT=80
NGINX_SSL_PORT=443

# Función para verificar si es root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_warning "Este script normalmente requiere permisos de root para instalar dependencias y configurar servicios."
        log_warning "Se recomienda ejecutarlo con sudo."
        read -p "¿Deseas intentar continuar sin permisos de root? (s/N): " response
        if [[ "$response" != "s" && "$response" != "S" ]]; then
            log_error "Instalación cancelada. Ejecuta el script con sudo."
            exit 1
        fi
        log_warning "Continuando sin permisos de root. Algunas operaciones podrían fallar."
    fi
}

# Función para detectar el sistema operativo
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        log_error "No se pudo detectar el sistema operativo"
        exit 1
    fi
    
    log_info "Sistema detectado: $OS $VERSION"
}

# Función para instalar dependencias del sistema
install_system_dependencies() {
    log_info "Instalando dependencias del sistema..."
    
    case $OS in
        "ubuntu"|"debian")
            apt-get update
            apt-get install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates
            apt-get install -y nginx postgresql postgresql-contrib ufw fail2ban
            apt-get install -y htop iotop nethogs ncdu tree git
            ;;
        "centos"|"rhel"|"fedora")
            if command -v dnf &> /dev/null; then
                dnf update -y
                dnf install -y curl wget gnupg2 nginx postgresql postgresql-server postgresql-contrib
                dnf install -y firewalld fail2ban htop iotop git
            else
                yum update -y
                yum install -y curl wget gnupg2 nginx postgresql postgresql-server postgresql-contrib
                yum install -y firewalld fail2ban htop iotop git
            fi
            ;;
        *)
            log_warning "Sistema operativo no soportado oficialmente: $OS"
            log_info "Intentando instalación genérica..."
            ;;
    esac
    
    log_success "Dependencias del sistema instaladas"
}

# Función para instalar Node.js
install_nodejs() {
    log_info "Instalando Node.js..."
    
    # Instalar Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    
    case $OS in
        "ubuntu"|"debian")
            apt-get install -y nodejs
            ;;
        "centos"|"rhel"|"fedora")
            if command -v dnf &> /dev/null; then
                dnf install -y nodejs npm
            else
                yum install -y nodejs npm
            fi
            ;;
    esac
    
    # Verificar instalación
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    
    log_success "Node.js instalado: $NODE_VERSION"
    log_success "npm instalado: $NPM_VERSION"
}

# Función para configurar el firewall
setup_firewall() {
    log_info "Configurando firewall para servidor independiente..."
    
    case $OS in
        "ubuntu"|"debian")
            # Configurar UFW
            ufw --force reset
            ufw default deny incoming
            ufw default allow outgoing
            
            # Permitir SSH
            ufw allow ssh
            
            # Permitir HTTP y HTTPS para Nginx
            ufw allow 80/tcp
            ufw allow 443/tcp
            
            # Permitir puerto interno del backend (solo desde localhost)
            ufw allow from 127.0.0.1 to any port $INTERNAL_PORT
            
            # Permitir rangos de red privada (ajustar según configuración)
            ufw allow from 10.0.0.0/8
            ufw allow from 172.16.0.0/12
            ufw allow from 192.168.0.0/16
            
            ufw --force enable
            ;;
        "centos"|"rhel"|"fedora")
            # Configurar firewalld
            systemctl enable firewalld
            systemctl start firewalld
            
            firewall-cmd --permanent --add-service=ssh
            firewall-cmd --permanent --add-service=http
            firewall-cmd --permanent --add-service=https
            
            # Puerto interno del backend
            firewall-cmd --permanent --add-port=$INTERNAL_PORT/tcp --source=127.0.0.1
            
            firewall-cmd --reload
            ;;
    esac
    
    log_success "Firewall configurado"
}

# Función para configurar PostgreSQL
setup_postgresql() {
    log_info "Configurando PostgreSQL..."
    
    # Inicializar PostgreSQL si es necesario
    case $OS in
        "centos"|"rhel"|"fedora")
            if [[ ! -d "/var/lib/pgsql/data" ]]; then
                postgresql-setup initdb
            fi
            ;;
    esac
    
    # Iniciar y habilitar PostgreSQL
    systemctl enable postgresql
    systemctl start postgresql
    
    # Crear usuario y base de datos
    sudo -u postgres psql -c "CREATE USER ${APP_NAME}_user WITH PASSWORD 'cambiar_en_produccion';"
    sudo -u postgres psql -c "CREATE DATABASE ${APP_NAME}_prod OWNER ${APP_NAME}_user;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${APP_NAME}_prod TO ${APP_NAME}_user;"
    
    log_success "PostgreSQL configurado"
}

# Función para crear usuario de aplicación
create_app_user() {
    log_info "Creando usuario de aplicación: $APP_USER"
    
    if ! id "$APP_USER" &>/dev/null; then
        useradd --system --home-dir "$APP_DIR" --shell /bin/bash --create-home "$APP_USER"
        log_success "Usuario $APP_USER creado"
    else
        log_info "Usuario $APP_USER ya existe"
    fi
}

# Función para configurar la aplicación
setup_application() {
    log_info "Configurando aplicación en: $APP_DIR"
    
    # Detectar y configurar repositorio Git automáticamente
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    DETECTED_REPO=""
    
    # Intentar detectar repositorio desde el directorio del script
    if [[ -d "$SCRIPT_DIR/.git" ]]; then
        cd "$SCRIPT_DIR"
        DETECTED_REPO=$(git remote get-url origin 2>/dev/null || echo "")
    fi
    
    # Verificar si el directorio de destino ya existe
    if [[ -d "$APP_DIR" ]]; then
        log_warning "El directorio de destino '$APP_DIR' ya existe y puede no estar vacío."
        echo "Opciones disponibles:"
        echo "  1. Eliminar el directorio existente y crear uno nuevo (CUIDADO: se perderán todos los datos)"
        echo "  2. Actualizar la instalación existente (si es un repositorio Git válido)"
        echo "  3. Cancelar la instalación"
        read -p "Selecciona una opción [1-3]: " dir_option
        
        case $dir_option in
            1)
                log_warning "Eliminando directorio existente..."
                sudo rm -rf "$APP_DIR"
                ;;
            2)
                if [[ -d "$APP_DIR/.git" ]]; then
                    log_info "Actualizando repositorio existente..."
                    cd "$APP_DIR"
                    sudo -u $APP_USER git pull
                    log_success "Repositorio actualizado correctamente"
                    return
                else
                    log_error "El directorio existente no es un repositorio Git válido."
                    log_info "Puedes convertirlo en un repositorio Git con: cd $APP_DIR && git init"
                    read -p "¿Deseas continuar de todos modos? (s/N): " continue_option
                    if [[ "$continue_option" != "s" && "$continue_option" != "S" ]]; then
                        log_error "Instalación cancelada por el usuario"
                        exit 1
                    fi
                fi
                ;;
            *)
                log_error "Instalación cancelada por el usuario"
                exit 1
                ;;
        esac
    fi
    
    if [[ -n "$DETECTED_REPO" ]]; then
        log_info "Repositorio Git detectado automáticamente: $DETECTED_REPO"
        log_info "Clonando repositorio..."
        sudo -u $APP_USER git clone "$DETECTED_REPO" "$APP_DIR" || {
            log_error "Error al clonar el repositorio. Verificando si el directorio existe..."
            if [[ -d "$APP_DIR" ]]; then
                log_warning "El directorio '$APP_DIR' existe pero la clonación falló."
                log_info "Intentando copiar archivos locales en su lugar..."
                sudo mkdir -p "$APP_DIR"
                sudo chown $APP_USER:$APP_USER "$APP_DIR"
                sudo cp -r . "$APP_DIR/"
                sudo chown -R $APP_USER:$APP_USER "$APP_DIR"
            else
                exit 1
            fi
        }
    else
        log_warning "No se detectó repositorio Git. Copiando archivos localmente..."
        sudo mkdir -p "$APP_DIR"
        sudo cp -r . "$APP_DIR/"
        sudo chown -R $APP_USER:$APP_USER "$APP_DIR"
    fi
    
    cd "$APP_DIR"
    
    # Configurar variables de entorno para servidor independiente
    log_info "Configurando variables de entorno para servidor independiente..."
    sudo -u $APP_USER cp "$ENV_FILE" .env
    
    # Crear directorios necesarios
    sudo -u $APP_USER mkdir -p logs uploads backups
    
    # Instalar dependencias del backend
    log_info "Instalando dependencias del backend..."
    sudo -u $APP_USER npm install --production
    
    # Instalar dependencias del frontend
    log_info "Instalando dependencias del frontend..."
    cd frontend
    sudo -u $APP_USER npm install
    
    # Construir frontend para producción
    log_info "Construyendo frontend para producción..."
    sudo -u $APP_USER npm run build
    
    cd "$APP_DIR"
    
    log_success "Aplicación configurada"
}

# Función para configurar Nginx para servidor independiente
setup_nginx() {
    log_info "Configurando Nginx para servidor independiente..."
    
    # Copiar configuración específica para servidor independiente
    cp "$APP_DIR/$NGINX_CONFIG" /etc/nginx/sites-available/$APP_NAME
    
    # Crear enlace simbólico
    ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/$APP_NAME
    
    # Remover configuración por defecto
    rm -f /etc/nginx/sites-enabled/default
    
    # Verificar configuración
    nginx -t
    
    # Habilitar y reiniciar Nginx
    systemctl enable nginx
    systemctl restart nginx
    
    log_success "Nginx configurado para servidor independiente"
}

# Función para configurar PM2
setup_pm2() {
    log_info "Configurando PM2..."
    
    # Instalar PM2 globalmente
    npm install -g pm2
    
    # Configurar PM2 para el usuario de la aplicación
    sudo -u $APP_USER pm2 start "$APP_DIR/ecosystem.config.js" --env production
    
    # Configurar PM2 para iniciar automáticamente
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $APP_USER --hp "$APP_DIR"
    sudo -u $APP_USER pm2 save
    
    log_success "PM2 configurado"
}

# Función para configurar logs
setup_logging() {
    log_info "Configurando sistema de logs..."
    
    # Crear configuración de logrotate
    cat > /etc/logrotate.d/$APP_NAME << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $APP_USER $APP_GROUP
    postrotate
        systemctl reload nginx
        sudo -u $APP_USER pm2 reload all
    endscript
}
EOF
    
    log_success "Sistema de logs configurado"
}

# Función para mostrar información de la instalación
show_installation_info() {
    echo ""
    echo "🎉 ¡Instalación completada exitosamente!"
    echo "========================================"
    echo ""
    echo "📋 Información del servidor independiente:"
    echo "   • Aplicación: $APP_DIR"
    echo "   • Usuario: $APP_USER"
    echo "   • Puerto interno: $INTERNAL_PORT (solo localhost)"
    echo "   • Puerto Nginx: $NGINX_PORT (HTTP)"
    echo "   • Puerto Nginx SSL: $NGINX_SSL_PORT (HTTPS)"
    echo ""
    echo "🔧 Configuración de red:"
    echo "   • La aplicación escucha en 127.0.0.1:$INTERNAL_PORT"
    echo "   • Nginx hace proxy reverso en puerto $NGINX_PORT/$NGINX_SSL_PORT"
    echo "   • Configurado para funcionar detrás de proxy manager"
    echo ""
    echo "⚙️  Configuración del proxy manager:"
    echo "   • Proxy Host: $(hostname -I | awk '{print $1}'):$NGINX_PORT"
    echo "   • SSL: Manejar en el proxy manager, no en este servidor"
    echo "   • Headers: X-Forwarded-For, X-Forwarded-Proto, X-Forwarded-Host"
    echo ""
    echo "🔍 URLs de verificación:"
    echo "   • Health check: http://$(hostname -I | awk '{print $1}')/health"
    echo "   • Nginx status: http://$(hostname -I | awk '{print $1}')/nginx-status"
    echo ""
    echo "📁 Archivos importantes:"
    echo "   • Variables de entorno: $APP_DIR/.env"
    echo "   • Configuración Nginx: /etc/nginx/sites-available/$APP_NAME"
    echo "   • Logs de aplicación: $APP_DIR/logs/"
    echo "   • Logs de Nginx: /var/log/nginx/"
    echo ""
    echo "🔄 Comandos útiles:"
    echo "   • Ver estado: sudo -u $APP_USER pm2 status"
    echo "   • Ver logs: sudo -u $APP_USER pm2 logs"
    echo "   • Reiniciar app: sudo -u $APP_USER pm2 restart all"
    echo "   • Actualizar: ./update.sh git"
    echo "   • Estado Nginx: systemctl status nginx"
    echo ""
    echo "⚠️  Próximos pasos:"
    echo "   1. Configurar el proxy manager para apuntar a este servidor"
    echo "   2. Editar $APP_DIR/.env con tus configuraciones específicas"
    echo "   3. Configurar SSL/TLS en el proxy manager"
    echo "   4. Configurar el dominio en BASE_URL del archivo .env"
    echo "   5. Reiniciar la aplicación: sudo -u $APP_USER pm2 restart all"
    echo ""
}

# Función principal
main() {
    check_root
    detect_os
    install_system_dependencies
    install_nodejs
    setup_firewall
    setup_postgresql
    create_app_user
    setup_application
    setup_nginx
    setup_pm2
    setup_logging
    show_installation_info
}

# Ejecutar instalación
main "$@"