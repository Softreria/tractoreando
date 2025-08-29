#!/bin/bash

# Tractoreando - Script de Instalación Completa
# Instala la aplicación y todas sus dependencias para producción
# Uso: ./install.sh

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

echo "🚛 Tractoreando - Instalación Completa"
echo "====================================="
echo "Fecha: $(date)"
echo "Usuario: $(whoami)"
echo ""

# Configuración
APP_DIR="/opt/tractoreando"
APP_USER="tractoreando"
NODE_VERSION="18"
MONGO_VERSION="6.0"

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Función para instalar Node.js
install_nodejs() {
    log_info "Instalando Node.js ${NODE_VERSION}..."
    
    if command_exists node; then
        NODE_CURRENT=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ "$NODE_CURRENT" -ge "$NODE_VERSION" ]]; then
            log_success "Node.js ya está instalado (v$(node --version))"
            return
        fi
    fi
    
    # Instalar NodeSource repository para Ubuntu
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    log_success "Node.js instalado: $(node --version)"
    log_success "npm instalado: $(npm --version)"
}

# Función para instalar MongoDB
install_mongodb() {
    log_info "Instalando MongoDB ${MONGO_VERSION}..."
    
    if command_exists mongod; then
        log_success "MongoDB ya está instalado"
        return
    fi
    
    # Detectar versión de Ubuntu
    UBUNTU_VERSION=$(lsb_release -rs)
    UBUNTU_CODENAME=$(lsb_release -cs)
    
    # Instalar libssl1.1 si es necesario (para Ubuntu 22.04+)
    if [[ "$UBUNTU_VERSION" > "20.04" ]]; then
        log_info "Instalando libssl1.1 para compatibilidad con MongoDB..."
        wget http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb
        sudo dpkg -i libssl1.1_1.1.1f-1ubuntu2_amd64.deb
        rm libssl1.1_1.1.1f-1ubuntu2_amd64.deb
    fi
    
    # Importar clave pública de MongoDB
    wget -qO - https://www.mongodb.org/static/pgp/server-${MONGO_VERSION}.asc | sudo apt-key add -
    
    # Usar el codename correcto para el repositorio
    case "$UBUNTU_CODENAME" in
        "jammy")
            # Ubuntu 22.04 - usar focal como fallback
            REPO_CODENAME="focal"
            ;;
        "noble")
            # Ubuntu 24.04 - usar noble
            REPO_CODENAME="noble"
            ;;
        "oracular"|"plucky"|*)
            # Ubuntu 24.10+ o versiones futuras - usar noble como fallback
            log_warning "Ubuntu $UBUNTU_CODENAME detectado, usando repositorio 'noble' como fallback"
            REPO_CODENAME="noble"
            ;;
    esac
    
    # Crear archivo de lista para MongoDB
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu ${REPO_CODENAME}/mongodb-org/${MONGO_VERSION} multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-${MONGO_VERSION}.list
    
    # Actualizar paquetes e instalar MongoDB
    sudo apt-get update
    sudo apt-get install -y mongodb-org
    
    # Habilitar y iniciar MongoDB
    sudo systemctl enable mongod
    sudo systemctl start mongod
    
    log_success "MongoDB instalado y ejecutándose"
}

# Función para instalar Nginx
install_nginx() {
    log_info "Instalando Nginx..."
    
    if command_exists nginx; then
        log_success "Nginx ya está instalado"
        return
    fi
    
    sudo apt-get update
    sudo apt-get install -y nginx
    
    # Habilitar y iniciar Nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    
    log_success "Nginx instalado y ejecutándose"
}

# Función para instalar PM2
install_pm2() {
    log_info "Instalando PM2..."
    
    if command_exists pm2; then
        log_success "PM2 ya está instalado"
        return
    fi
    
    sudo npm install -g pm2
    
    # Configurar PM2 para iniciar en boot
    sudo pm2 startup
    
    log_success "PM2 instalado"
}

# Función para crear usuario de aplicación
create_app_user() {
    log_info "Creando usuario de aplicación..."
    
    if id "$APP_USER" &>/dev/null; then
        log_success "Usuario $APP_USER ya existe"
    else
        sudo useradd -r -s /bin/bash -d $APP_DIR $APP_USER
        log_success "Usuario $APP_USER creado"
    fi
}

# Función para configurar directorio de aplicación
setup_app_directory() {
    log_info "Configurando directorio de aplicación..."
    
    # Crear directorio si no existe
    sudo mkdir -p $APP_DIR
    sudo mkdir -p $APP_DIR/logs
    sudo mkdir -p $APP_DIR/backups
    
    # Copiar archivos de aplicación
    if [[ "$(pwd)" != "$APP_DIR" ]]; then
        log_info "Copiando archivos de aplicación..."
        sudo cp -r . $APP_DIR/
    fi
    
    # Establecer permisos
    sudo chown -R $APP_USER:$APP_USER $APP_DIR
    sudo chmod -R 755 $APP_DIR
    
    log_success "Directorio de aplicación configurado"
}

# Función para instalar dependencias de la aplicación
install_app_dependencies() {
    log_info "Instalando dependencias de la aplicación..."
    
    cd $APP_DIR
    
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
    
    cd ..
    
    log_success "Dependencias instaladas y frontend construido"
}

# Función para configurar base de datos
setup_database() {
    log_info "Configurando base de datos..."
    
    cd $APP_DIR
    
    # Crear usuario administrador
    log_info "Creando usuario administrador..."
    sudo -u $APP_USER node init-admin.js
    
    log_success "Base de datos configurada"
}

# Función para configurar Nginx
setup_nginx() {
    log_info "Configurando Nginx..."
    
    # Copiar configuración de Nginx
    if [[ -f "$APP_DIR/nginx.conf" ]]; then
        sudo cp $APP_DIR/nginx.conf /etc/nginx/sites-available/tractoreando
        sudo ln -sf /etc/nginx/sites-available/tractoreando /etc/nginx/sites-enabled/
        
        # Remover configuración por defecto
        sudo rm -f /etc/nginx/sites-enabled/default
        
        # Probar configuración
        sudo nginx -t
        
        # Recargar Nginx
        sudo systemctl reload nginx
        
        log_success "Nginx configurado"
    else
        log_warning "Archivo nginx.conf no encontrado, saltando configuración de Nginx"
    fi
}

# Función para iniciar aplicación con PM2
start_application() {
    log_info "Iniciando aplicación con PM2..."
    
    cd $APP_DIR
    
    # Iniciar aplicación
    sudo -u $APP_USER pm2 start ecosystem.config.js
    
    # Guardar configuración de PM2
    sudo -u $APP_USER pm2 save
    
    log_success "Aplicación iniciada"
}

# Función para configurar firewall
setup_firewall() {
    log_info "Configurando firewall..."
    
    if command_exists ufw; then
        sudo ufw allow 22/tcp
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw --force enable
        
        log_success "Firewall configurado"
    else
        log_warning "UFW no está instalado, saltando configuración de firewall"
    fi
}

# Función principal de instalación
main() {
    log_info "Iniciando instalación de Tractoreando..."
    
    # Actualizar sistema
    log_info "Actualizando sistema..."
    sudo apt-get update
    sudo apt-get upgrade -y
    
    # Instalar dependencias del sistema
    log_info "Instalando dependencias del sistema..."
    sudo apt-get install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release
    
    # Instalar componentes
    install_nodejs
    install_mongodb
    install_nginx
    install_pm2
    
    # Configurar aplicación
    create_app_user
    setup_app_directory
    install_app_dependencies
    setup_database
    setup_nginx
    setup_firewall
    start_application
    
    echo ""
    log_success "¡Instalación completada exitosamente!"
    echo ""
    echo "🌐 La aplicación está disponible en:"
    echo "   - http://$(hostname -I | awk '{print $1}')"
    echo "   - http://localhost (si estás en el servidor)"
    echo ""
    echo "👤 Credenciales de administrador:"
    echo "   - Email: admin@tractoreando.com"
    echo "   - Contraseña: admin123!"
    echo ""
    echo "📋 Comandos útiles:"
    echo "   - Ver estado: pm2 status"
    echo "   - Ver logs: pm2 logs"
    echo "   - Reiniciar: pm2 restart all"
    echo "   - Actualizar: ./update.sh"
    echo ""
}

# Verificar si el script se ejecuta directamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi