#!/bin/bash

# Script de Instalación Completa - Tractoreando
# Combina funcionalidades de install.sh, install-standalone.sh, instalacion-rapida.sh, configure-proxy.sh y verify-installation.sh
# Uso: ./instalacion-completa.sh [--quick|--standalone|--production|--proxy-config|--verify|--help]

set -e

echo "🚀 Instalación Completa - Tractoreando"
echo "======================================"
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

# Configuración global
export APP_NAME="tractoreando"
export APP_DIR="/opt/$APP_NAME"
export APP_USER="$APP_NAME"
export APP_GROUP="$APP_NAME"
export NODE_VERSION="18"
export PORT_BACKEND="5000"
export PORT_FRONTEND="3000"
export DB_NAME="tractoreando_prod"
export NGINX_PORT="80"
export NGINX_SSL_PORT="443"

# Variables de configuración
export INSTALL_MODE=""
export USE_NGINX_PROXY_MANAGER=false
export USE_STANDALONE_SERVER=false
export USE_POSTGRESQL=false
export DOMAIN=""
export PROXY_IP=""
export PROTOCOL="http"
export INTERNAL_NETWORK=""

# Detectar sistema operativo
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        export OS="linux"
        if [[ -f /etc/os-release ]]; then
            . /etc/os-release
            export DISTRO=$ID
            export VERSION=$VERSION_ID
        else
            export DISTRO="unknown"
            export VERSION="unknown"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        export OS="macos"
        export DISTRO="macOS"
        export VERSION=$(sw_vers -productVersion)
    else
        log_error "Sistema operativo no soportado: $OSTYPE"
        exit 1
    fi
    
    log_info "Sistema detectado: $OS ($DISTRO $VERSION)"
    # Debug: Mostrar variables del OS
    log_info "detect_os: OS='$OS', DISTRO='$DISTRO', VERSION='$VERSION'"
}

# Verificar permisos
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "Ejecutándose como root"
        export SUDO_CMD=""
    else
        log_info "Ejecutándose como usuario normal"
        export SUDO_CMD="sudo"
        
        # Verificar si sudo está disponible
        if ! command -v sudo &> /dev/null; then
            log_error "sudo no está disponible. Ejecuta como root o instala sudo."
            exit 1
        fi
    fi
    
    # Debug: Mostrar valor de SUDO_CMD después de configurarlo
    log_info "check_permissions: SUDO_CMD configurado como '$SUDO_CMD'"
}

# Función para verificar puerto disponible
check_port() {
    local port=$1
    local service_name=$2
    
    if command -v ss &> /dev/null; then
        if ss -tuln | grep -q ":$port "; then
            return 1  # Puerto en uso
        fi
    elif command -v lsof &> /dev/null; then
        if lsof -i :$port &> /dev/null; then
            return 1  # Puerto en uso
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln | grep -q ":$port "; then
            return 1  # Puerto en uso
        fi
    fi
    
    return 0  # Puerto libre
}

# Función para instalar dependencias del sistema
install_system_dependencies() {
    log_info "Instalando dependencias del sistema..."
    
    if [[ "$OS" == "linux" ]]; then
        case $DISTRO in
            "ubuntu"|"debian")
                $SUDO_CMD apt-get update
                $SUDO_CMD apt-get install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates
                $SUDO_CMD apt-get install -y nginx ufw fail2ban htop iotop nethogs ncdu tree git jq
                
                if [[ "$USE_POSTGRESQL" == "true" ]]; then
                    $SUDO_CMD apt-get install -y postgresql postgresql-contrib
                fi
                ;;
            "centos"|"rhel"|"fedora")
                if command -v dnf &> /dev/null; then
                    $SUDO_CMD dnf update -y
                    $SUDO_CMD dnf install -y curl wget gnupg2 nginx firewalld fail2ban htop iotop git jq
                    
                    if [[ "$USE_POSTGRESQL" == "true" ]]; then
                        $SUDO_CMD dnf install -y postgresql postgresql-server postgresql-contrib
                    fi
                else
                    $SUDO_CMD yum update -y
                    $SUDO_CMD yum install -y curl wget gnupg2 nginx firewalld fail2ban htop iotop git jq
                    
                    if [[ "$USE_POSTGRESQL" == "true" ]]; then
                        $SUDO_CMD yum install -y postgresql postgresql-server postgresql-contrib
                    fi
                fi
                ;;
            *)
                log_warning "Distribución no soportada oficialmente: $DISTRO"
                ;;
        esac
    elif [[ "$OS" == "macos" ]]; then
        if command -v brew &> /dev/null; then
            brew update
            brew install nginx git jq
            
            if [[ "$USE_POSTGRESQL" == "true" ]]; then
                brew install postgresql
            fi
        else
            log_error "Homebrew no está instalado. Instálalo desde https://brew.sh/"
            exit 1
        fi
    fi
    
    log_success "Dependencias del sistema instaladas"
}

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
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | $SUDO_CMD -E bash -
        
        case $DISTRO in
            "ubuntu"|"debian")
                $SUDO_CMD apt-get install -y nodejs
                ;;
            "centos"|"rhel"|"fedora")
                if command -v dnf &> /dev/null; then
                    $SUDO_CMD dnf install -y nodejs npm
                else
                    $SUDO_CMD yum install -y nodejs npm
                fi
                ;;
        esac
    elif [[ "$OS" == "macos" ]]; then
        # Instalar Node.js en macOS
        if command -v brew &> /dev/null; then
            brew install node@$NODE_VERSION
        else
            log_error "Homebrew no está instalado. Por favor instala Node.js manualmente."
            exit 1
        fi
    fi
    
    # Instalar PM2 globalmente
    $SUDO_CMD npm install -g pm2
    
    log_success "Node.js v$(node -v) instalado correctamente"
    log_success "PM2 instalado correctamente"
}

# Función para instalar MongoDB
install_mongodb() {
    log_info "Instalando MongoDB..."
    
    if command -v mongod &> /dev/null; then
        log_success "MongoDB ya está instalado"
        return
    fi
    
    if [[ "$OS" == "linux" ]]; then
        case $DISTRO in
            "ubuntu"|"debian")
                # Instalar MongoDB en Ubuntu/Debian
                wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | $SUDO_CMD apt-key add -
                
                if [[ "$DISTRO" == "ubuntu" ]]; then
                    UBUNTU_CODENAME=$(lsb_release -cs 2>/dev/null || echo "focal")
                    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $UBUNTU_CODENAME/mongodb-org/7.0 multiverse" | $SUDO_CMD tee /etc/apt/sources.list.d/mongodb-org-7.0.list
                else
                    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/debian bullseye/mongodb-org/7.0 main" | $SUDO_CMD tee /etc/apt/sources.list.d/mongodb-org-7.0.list
                fi
                
                $SUDO_CMD apt-get update
                $SUDO_CMD apt-get install -y mongodb-org
                ;;
            "centos"|"rhel"|"fedora")
                # Instalar MongoDB en CentOS/RHEL/Fedora
                cat <<EOF | $SUDO_CMD tee /etc/yum.repos.d/mongodb-org-7.0.repo
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF
                
                if command -v dnf &> /dev/null; then
                    $SUDO_CMD dnf install -y mongodb-org
                else
                    $SUDO_CMD yum install -y mongodb-org
                fi
                ;;
        esac
        
        # Iniciar y habilitar MongoDB
        $SUDO_CMD systemctl enable mongod
        $SUDO_CMD systemctl start mongod
        
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

# Función para crear usuario de aplicación
create_app_user() {
    log_info "Creando usuario de aplicación..."
    
    # Verificar variables
    log_info "Variables: APP_USER='$APP_USER', APP_GROUP='$APP_GROUP', APP_DIR='$APP_DIR'"
    
    if id "$APP_USER" &>/dev/null; then
        log_success "Usuario $APP_USER ya existe"
        return
    fi
    
    if [[ "$OS" == "linux" ]]; then
        log_info "Creando grupo $APP_GROUP..."
        $SUDO_CMD groupadd -f "$APP_GROUP"
        
        log_info "Creando usuario $APP_USER..."
        $SUDO_CMD useradd -r -g "$APP_GROUP" -d "$APP_DIR" -s /bin/bash "$APP_USER"
        
        # Verificar que el usuario fue creado
        if id "$APP_USER" &>/dev/null; then
            log_success "Usuario $APP_USER creado exitosamente: $(id $APP_USER)"
        else
            log_error "Error al crear el usuario $APP_USER"
            exit 1
        fi
    elif [[ "$OS" == "macos" ]]; then
        $SUDO_CMD dscl . -create /Users/$APP_USER
        $SUDO_CMD dscl . -create /Users/$APP_USER UserShell /bin/bash
        $SUDO_CMD dscl . -create /Users/$APP_USER RealName "$APP_NAME Application User"
        $SUDO_CMD dscl . -create /Users/$APP_USER UniqueID 1001
        $SUDO_CMD dscl . -create /Users/$APP_USER PrimaryGroupID 1001
        $SUDO_CMD dscl . -create /Users/$APP_USER NFSHomeDirectory "$APP_DIR"
        log_success "Usuario $APP_USER creado en macOS"
    fi
}

# Función para configurar directorio de aplicación
setup_app_directory() {
    log_info "Configurando directorio de aplicación..."
    
    # Crear directorio si no existe
    $SUDO_CMD mkdir -p "$APP_DIR"
    $SUDO_CMD mkdir -p "$APP_DIR/logs"
    $SUDO_CMD mkdir -p "$APP_DIR/uploads"
    $SUDO_CMD mkdir -p "$APP_DIR/backups"
    
    # Establecer permisos
    if [[ "$OS" == "macos" ]]; then
        # En macOS, usar el usuario actual
        $SUDO_CMD chown -R "$(whoami):staff" "$APP_DIR"
    else
        # En Linux, usar el usuario de aplicación
        $SUDO_CMD chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"
    fi
    
    $SUDO_CMD chmod 755 "$APP_DIR"
    $SUDO_CMD chmod 755 "$APP_DIR/logs"
    $SUDO_CMD chmod 755 "$APP_DIR/uploads"
    $SUDO_CMD chmod 700 "$APP_DIR/backups"
    
    log_success "Directorio de aplicación configurado"
}

# Función para copiar archivos del repositorio local
clone_repository() {
    log_info "Copiando archivos del repositorio local..."
    
    local current_dir="$(pwd)"
    
    # Verificar si estamos en el directorio del proyecto
    if [[ ! -f "$current_dir/package.json" ]] || [[ ! -f "$current_dir/server.js" ]]; then
        log_error "Este script debe ejecutarse desde el directorio raíz del proyecto Tractoreando"
        log_error "Directorio actual: $current_dir"
        log_error "Asegúrate de que existan los archivos package.json y server.js"
        exit 1
    fi
    
    # Copiar archivos al directorio de aplicación (excluyendo node_modules y .git)
    log_info "Copiando archivos desde $current_dir a $APP_DIR"
    
    # Crear directorio de destino si no existe
    $SUDO_CMD mkdir -p "$APP_DIR"
    
    # Copiar archivos excluyendo directorios innecesarios
    $SUDO_CMD rsync -av --exclude='node_modules' --exclude='.git' --exclude='*.log' --exclude='logs/' "$current_dir/" "$APP_DIR/"
    
    # Establecer permisos
    if [[ "$OS" == "macos" ]]; then
        # En macOS, usar el usuario actual
        $SUDO_CMD chown -R "$(whoami):staff" "$APP_DIR"
    else
        # En Linux, usar el usuario de aplicación
        $SUDO_CMD chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"
    fi
    
    log_success "Archivos copiados exitosamente desde el repositorio local"
}

# Función para instalar dependencias de la aplicación
install_app_dependencies() {
    log_info "Instalando dependencias de la aplicación..."
    
    cd "$APP_DIR"
    
    # Verificar que el usuario de aplicación existe
    if [[ "$OS" != "macos" ]]; then
        if ! id "$APP_USER" &>/dev/null; then
            log_error "Usuario $APP_USER no existe. Creando usuario..."
            create_app_user
        else
            log_info "Usuario $APP_USER verificado: $(id $APP_USER)"
        fi
    fi
    
    # Instalar dependencias del backend
    log_info "Instalando dependencias del backend..."
    if [[ "$OS" == "macos" ]]; then
        # En macOS, ejecutar como usuario actual
        npm install --production
    else
        # En Linux, usar el usuario de aplicación
        # Debug: Mostrar valores de variables
        log_info "Debug: SUDO_CMD='$SUDO_CMD', APP_USER='$APP_USER', OS='$OS'"
        
        # Verificar que las variables no estén vacías
        if [[ -z "$SUDO_CMD" ]]; then
            log_error "Variable SUDO_CMD está vacía"
            exit 1
        fi
        
        if [[ -z "$APP_USER" ]]; then
            log_error "Variable APP_USER está vacía"
            exit 1
        fi
        
        log_info "Ejecutando: $SUDO_CMD -u '$APP_USER' npm install --production"
        $SUDO_CMD -u "$APP_USER" npm install --production
    fi
    
    # Instalar dependencias del frontend
    if [[ -d "frontend" ]]; then
        log_info "Instalando dependencias del frontend..."
        cd frontend
        
        if [[ "$OS" == "macos" ]]; then
            # En macOS, ejecutar como usuario actual
            npm install
            
            # Construir frontend para producción
            log_info "Construyendo frontend para producción..."
            npm run build
        else
            # En Linux, usar el usuario de aplicación
            # Debug: Mostrar valores de variables
            log_info "Debug Frontend: SUDO_CMD='$SUDO_CMD', APP_USER='$APP_USER', OS='$OS'"
            
            # Verificar que las variables no estén vacías
            if [[ -z "$SUDO_CMD" ]]; then
                log_error "Variable SUDO_CMD está vacía en frontend"
                exit 1
            fi
            
            if [[ -z "$APP_USER" ]]; then
                log_error "Variable APP_USER está vacía en frontend"
                exit 1
            fi
            
            log_info "Ejecutando: $SUDO_CMD -u '$APP_USER' npm install (frontend)"
            $SUDO_CMD -u "$APP_USER" npm install
            
            # Construir frontend para producción
            log_info "Construyendo frontend para producción..."
            log_info "Ejecutando: $SUDO_CMD -u '$APP_USER' npm run build"
            $SUDO_CMD -u "$APP_USER" npm run build
        fi
        
        cd ..
    fi
    
    log_success "Dependencias instaladas exitosamente"
}

# Función para configurar variables de entorno
setup_environment() {
    log_info "Configurando variables de entorno..."
    
    local env_file="$APP_DIR/.env"
    
    # Usar archivo de producción como base
    if [[ -f "$APP_DIR/.env.production" ]]; then
        $SUDO_CMD cp "$APP_DIR/.env.production" "$env_file"
    else
        # Crear archivo .env básico
        cat <<EOF | $SUDO_CMD tee "$env_file" > /dev/null
NODE_ENV=production
PORT=$PORT_BACKEND
MONGODB_URI=mongodb://localhost:27017/$DB_NAME
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
BASE_URL=http://localhost
FRONTEND_URL=http://localhost
BACKEND_URL=http://localhost/api
CORS_ORIGIN=http://localhost
TRUST_PROXY=false
EOF
    fi
    
    # Configurar para proxy si es necesario
    if [[ "$USE_NGINX_PROXY_MANAGER" == "true" ]] || [[ "$USE_STANDALONE_SERVER" == "true" ]]; then
        configure_proxy_environment "$env_file"
    fi
    
    # Establecer permisos
    if [[ "$OS" == "macos" ]]; then
        # En macOS, usar el usuario actual
        $SUDO_CMD chown "$(whoami):staff" "$env_file"
    else
        # En Linux, usar el usuario de aplicación
        $SUDO_CMD chown "$APP_USER:$APP_GROUP" "$env_file"
    fi
    $SUDO_CMD chmod 600 "$env_file"
    
    log_success "Variables de entorno configuradas"
}

# Función para configurar entorno de proxy
configure_proxy_environment() {
    local env_file=$1
    
    if [[ -n "$DOMAIN" ]]; then
        $SUDO_CMD sed -i "s|^BASE_URL=.*|BASE_URL=${PROTOCOL}://${DOMAIN}|g" "$env_file"
        $SUDO_CMD sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=${PROTOCOL}://${DOMAIN}|g" "$env_file"
        $SUDO_CMD sed -i "s|^BACKEND_URL=.*|BACKEND_URL=${PROTOCOL}://${DOMAIN}/api|g" "$env_file"
        $SUDO_CMD sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=${PROTOCOL}://${DOMAIN}|g" "$env_file"
    fi
    
    # Configuración de proxy
    $SUDO_CMD sed -i "s|^TRUST_PROXY=.*|TRUST_PROXY=true|g" "$env_file"
    
    # Configurar IPs confiables
    local trusted_ips="10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
    if [[ -n "$PROXY_IP" && "$PROXY_IP" != "0.0.0.0/0" ]]; then
        trusted_ips="$trusted_ips,$PROXY_IP"
    fi
    
    echo "TRUSTED_PROXIES=$trusted_ips" | $SUDO_CMD tee -a "$env_file" > /dev/null
    
    if [[ -n "$INTERNAL_NETWORK" ]]; then
        echo "INTERNAL_NETWORK=$INTERNAL_NETWORK" | $SUDO_CMD tee -a "$env_file" > /dev/null
    fi
}

# Función para configurar Nginx
setup_nginx() {
    log_info "Configurando Nginx..."
    
    local nginx_config
    local sites_available
    local sites_enabled
    
    if [[ "$OS" == "linux" ]]; then
        sites_available="/etc/nginx/sites-available"
        sites_enabled="/etc/nginx/sites-enabled"
    elif [[ "$OS" == "macos" ]]; then
        sites_available="/usr/local/etc/nginx/servers"
        sites_enabled="$sites_available"
    fi
    
    # Crear directorios si no existen
    $SUDO_CMD mkdir -p "$sites_available"
    $SUDO_CMD mkdir -p "$sites_enabled"
    
    # Seleccionar configuración apropiada
    if [[ "$USE_NGINX_PROXY_MANAGER" == "true" ]]; then
        nginx_config="$APP_DIR/nginx-production.conf"
    elif [[ "$USE_STANDALONE_SERVER" == "true" ]]; then
        nginx_config="$APP_DIR/nginx-standalone.conf"
    else
        nginx_config="$APP_DIR/nginx-production.conf"
    fi
    
    if [[ -f "$nginx_config" ]]; then
        $SUDO_CMD cp "$nginx_config" "$sites_available/$APP_NAME"
        
        # Crear enlace simbólico si es necesario
        if [[ "$sites_available" != "$sites_enabled" ]]; then
            $SUDO_CMD ln -sf "$sites_available/$APP_NAME" "$sites_enabled/$APP_NAME"
        fi
        
        # Deshabilitar sitio por defecto
        if [[ -f "$sites_enabled/default" ]]; then
            $SUDO_CMD rm -f "$sites_enabled/default"
        fi
        
        # Probar configuración
        if $SUDO_CMD nginx -t; then
            log_success "Configuración de Nginx válida"
        else
            log_error "Error en la configuración de Nginx"
            return 1
        fi
    else
        log_warning "Archivo de configuración de Nginx no encontrado: $nginx_config"
    fi
}

# Función para configurar firewall
setup_firewall() {
    log_info "Configurando firewall..."
    
    if [[ "$OS" == "linux" ]]; then
        case $DISTRO in
            "ubuntu"|"debian")
                # Configurar UFW
                $SUDO_CMD ufw --force reset
                $SUDO_CMD ufw default deny incoming
                $SUDO_CMD ufw default allow outgoing
                
                # Permitir SSH
                $SUDO_CMD ufw allow ssh
                
                # Permitir HTTP y HTTPS
                $SUDO_CMD ufw allow 80/tcp
                $SUDO_CMD ufw allow 443/tcp
                
                # Permitir puerto interno del backend (solo desde localhost)
                $SUDO_CMD ufw allow from 127.0.0.1 to any port $PORT_BACKEND
                
                # Permitir rangos de red privada
                $SUDO_CMD ufw allow from 10.0.0.0/8
                $SUDO_CMD ufw allow from 172.16.0.0/12
                $SUDO_CMD ufw allow from 192.168.0.0/16
                
                # Permitir IP del proxy si se especificó
                if [[ -n "$PROXY_IP" && "$PROXY_IP" != "0.0.0.0/0" ]]; then
                    $SUDO_CMD ufw allow from "$PROXY_IP"
                fi
                
                $SUDO_CMD ufw --force enable
                ;;
            "centos"|"rhel"|"fedora")
                # Configurar firewalld
                $SUDO_CMD systemctl enable firewalld
                $SUDO_CMD systemctl start firewalld
                
                $SUDO_CMD firewall-cmd --permanent --add-service=ssh
                $SUDO_CMD firewall-cmd --permanent --add-service=http
                $SUDO_CMD firewall-cmd --permanent --add-service=https
                
                # Puerto interno del backend
                $SUDO_CMD firewall-cmd --permanent --add-port=$PORT_BACKEND/tcp --source=127.0.0.1
                
                $SUDO_CMD firewall-cmd --reload
                ;;
        esac
    fi
    
    log_success "Firewall configurado"
}

# Función para configurar PM2
setup_pm2() {
    log_info "Configurando PM2..."
    
    cd "$APP_DIR"
    
    # Verificar que el usuario de aplicación existe (solo en Linux)
    if [[ "$OS" != "macos" ]]; then
        if ! id "$APP_USER" &>/dev/null; then
            log_error "Usuario $APP_USER no existe para configurar PM2. Creando usuario..."
            create_app_user
        else
            log_info "Usuario $APP_USER verificado para PM2: $(id $APP_USER)"
        fi
    fi
    
    # Configurar PM2 según el sistema operativo
    if [[ "$OS" == "macos" ]]; then
        # En macOS, ejecutar como usuario actual
        pm2 startup
        
        # Iniciar aplicación con PM2
        if [[ -f "ecosystem.config.js" ]]; then
            pm2 start ecosystem.config.js
        else
            pm2 start server.js --name "$APP_NAME-backend"
        fi
        
        # Guardar configuración de PM2
        pm2 save
    else
        # En Linux, usar el usuario de aplicación
        log_info "Ejecutando: $SUDO_CMD -u '$APP_USER' pm2 startup"
        $SUDO_CMD -u "$APP_USER" pm2 startup
        
        # Iniciar aplicación con PM2
        if [[ -f "ecosystem.config.js" ]]; then
            log_info "Ejecutando: $SUDO_CMD -u '$APP_USER' pm2 start ecosystem.config.js"
            $SUDO_CMD -u "$APP_USER" pm2 start ecosystem.config.js
        else
            log_info "Ejecutando: $SUDO_CMD -u '$APP_USER' pm2 start server.js --name '$APP_NAME-backend'"
            $SUDO_CMD -u "$APP_USER" pm2 start server.js --name "$APP_NAME-backend"
        fi
        
        # Guardar configuración de PM2
        log_info "Ejecutando: $SUDO_CMD -u '$APP_USER' pm2 save"
        $SUDO_CMD -u "$APP_USER" pm2 save
    fi
    
    log_success "PM2 configurado y aplicación iniciada"
}

# Función para iniciar servicios
start_services() {
    log_info "Iniciando servicios..."
    
    # Iniciar MongoDB
    if [[ "$OS" == "linux" ]]; then
        $SUDO_CMD systemctl enable mongod
        $SUDO_CMD systemctl start mongod
    elif [[ "$OS" == "macos" ]]; then
        brew services start mongodb/brew/mongodb-community
    fi
    
    # Iniciar Nginx
    if [[ "$OS" == "linux" ]]; then
        $SUDO_CMD systemctl enable nginx
        $SUDO_CMD systemctl restart nginx
    elif [[ "$OS" == "macos" ]]; then
        $SUDO_CMD brew services start nginx
    fi
    
    log_success "Servicios iniciados"
}

# Función para verificar instalación
verify_installation() {
    log_info "🔍 VERIFICANDO INSTALACIÓN"
    
    local all_checks_passed=true
    local warnings_count=0
    local errors_count=0
    
    # Verificar directorio de aplicación
    if [[ -d "$APP_DIR" ]]; then
        log_success "✅ Directorio de aplicación existe"
    else
        log_error "❌ Directorio de aplicación no encontrado"
        all_checks_passed=false
        ((errors_count++))
    fi
    
    # Verificar usuario de aplicación
    if id "$APP_USER" &>/dev/null; then
        log_success "✅ Usuario de aplicación existe"
    else
        log_error "❌ Usuario de aplicación no encontrado"
        all_checks_passed=false
        ((errors_count++))
    fi
    
    # Verificar archivo .env
    if [[ -f "$APP_DIR/.env" ]]; then
        log_success "✅ Archivo .env existe"
    else
        log_error "❌ Archivo .env no encontrado"
        all_checks_passed=false
        ((errors_count++))
    fi
    
    # Verificar MongoDB
    if pgrep -x "mongod" > /dev/null; then
        log_success "✅ MongoDB está funcionando"
    else
        log_error "❌ MongoDB no está funcionando"
        all_checks_passed=false
        ((errors_count++))
    fi
    
    # Verificar Node.js
    if command -v node &> /dev/null; then
        log_success "✅ Node.js instalado: $(node --version)"
    else
        log_error "❌ Node.js no está instalado"
        all_checks_passed=false
        ((errors_count++))
    fi
    
    # Verificar PM2
    if command -v pm2 &> /dev/null; then
        log_success "✅ PM2 instalado"
        
        # Verificar aplicación en PM2
        if [[ "$OS" == "macos" ]]; then
            # En macOS, ejecutar como usuario actual
            if pm2 status | grep -q "online"; then
                log_success "✅ Aplicación en línea en PM2"
            else
                log_warning "⚠️ Aplicación no está en línea en PM2"
                ((warnings_count++))
            fi
        else
            # En Linux, verificar que el usuario existe antes de usar sudo -u
            if id "$APP_USER" &>/dev/null; then
                if $SUDO_CMD -u "$APP_USER" pm2 status | grep -q "online"; then
                    log_success "✅ Aplicación en línea en PM2"
                else
                    log_warning "⚠️ Aplicación no está en línea en PM2"
                    ((warnings_count++))
                fi
            else
                log_warning "⚠️ Usuario $APP_USER no existe, no se puede verificar PM2"
                ((warnings_count++))
            fi
        fi
    else
        log_error "❌ PM2 no está instalado"
        all_checks_passed=false
        ((errors_count++))
    fi
    
    # Verificar Nginx
    if command -v nginx &> /dev/null; then
        log_success "✅ Nginx instalado"
        
        if pgrep -x "nginx" > /dev/null; then
            log_success "✅ Nginx está ejecutándose"
        else
            log_warning "⚠️ Nginx no está ejecutándose"
            ((warnings_count++))
        fi
    else
        log_error "❌ Nginx no está instalado"
        all_checks_passed=false
        ((errors_count++))
    fi
    
    # Verificar conectividad HTTP
    if command -v curl &> /dev/null; then
        if curl -s -f http://localhost > /dev/null 2>&1; then
            log_success "✅ Respuesta HTTP en localhost"
        else
            log_warning "⚠️ No hay respuesta HTTP en localhost"
            ((warnings_count++))
        fi
        
        if curl -s -f "http://localhost:$PORT_BACKEND/api/health" > /dev/null 2>&1; then
            log_success "✅ API responde correctamente"
        else
            log_warning "⚠️ API no responde"
            ((warnings_count++))
        fi
    fi
    
    # Resumen final
    echo ""
    echo "📊 RESUMEN DE VERIFICACIÓN"
    echo "=========================="
    
    if [[ "$all_checks_passed" == "true" && "$errors_count" -eq 0 ]]; then
        if [[ "$warnings_count" -eq 0 ]]; then
            log_success "🎉 ¡Instalación perfecta! Todos los servicios están funcionando correctamente."
        else
            log_success "✅ Instalación exitosa con $warnings_count advertencias menores."
        fi
    else
        log_error "❌ Instalación incompleta. Se encontraron $errors_count errores y $warnings_count advertencias."
        return 1
    fi
    
    return 0
}

# Función para obtener información del usuario para configuración de proxy
get_proxy_configuration() {
    echo "📋 Configuración del proxy reverso"
    echo "==================================="
    echo ""
    
    # Dominio principal
    read -p "🌐 Dominio principal (ej: tractoreando.miempresa.com): " DOMAIN
    if [[ -z "$DOMAIN" ]]; then
        log_error "El dominio es obligatorio para configuración de proxy"
        exit 1
    fi
    
    # IP del proxy manager
    read -p "📡 IP del servidor Nginx Proxy Manager (ej: 192.168.1.100) [Enter para omitir]: " PROXY_IP
    
    # Protocolo
    read -p "🔒 ¿Usar HTTPS? (y/N): " USE_HTTPS
    if [[ "$USE_HTTPS" =~ ^[Yy]$ ]]; then
        PROTOCOL="https"
    else
        PROTOCOL="http"
    fi
    
    # Red interna
    read -p "🔗 Red interna (ej: 192.168.1.0/24) [Enter para auto-detectar]: " INTERNAL_NETWORK
    if [[ -z "$INTERNAL_NETWORK" ]]; then
        # Auto-detectar red interna
        INTERNAL_NETWORK=$(ip route 2>/dev/null | grep -E '192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.' | head -1 | awk '{print $1}' || echo "192.168.1.0/24")
        log_info "Red interna auto-detectada: $INTERNAL_NETWORK"
    fi
    
    echo ""
    log_info "Configuración de proxy:"
    echo "   • Dominio: $DOMAIN"
    echo "   • Protocolo: $PROTOCOL"
    echo "   • IP Proxy Manager: ${PROXY_IP:-"No especificada"}"
    echo "   • Red interna: $INTERNAL_NETWORK"
    echo ""
    
    read -p "¿Continuar con esta configuración? (Y/n): " CONFIRM
    if [[ "$CONFIRM" =~ ^[Nn]$ ]]; then
        log_info "Configuración cancelada"
        exit 0
    fi
}

# Función de instalación rápida
quick_install() {
    log_info "🚀 INSTALACIÓN RÁPIDA"
    
    detect_os
    check_permissions
    install_system_dependencies
    install_nodejs
    install_mongodb
    create_app_user
    setup_app_directory
    clone_repository
    install_app_dependencies
    setup_environment
    setup_nginx
    setup_pm2
    start_services
    
    log_success "🎉 ¡Instalación rápida completada!"
    
    # Verificar instalación
    if verify_installation; then
        echo ""
        log_success "✅ Aplicación lista en: http://localhost"
        log_info "📋 Comandos útiles:"
        echo "   • Estado PM2: sudo -u $APP_USER pm2 status"
        echo "   • Logs: sudo -u $APP_USER pm2 logs"
        echo "   • Reiniciar: sudo -u $APP_USER pm2 restart all"
    fi
}

# Función de instalación para servidor independiente
standalone_install() {
    log_info "🏗️ INSTALACIÓN PARA SERVIDOR INDEPENDIENTE"
    
    USE_STANDALONE_SERVER=true
    get_proxy_configuration
    
    detect_os
    check_permissions
    install_system_dependencies
    install_nodejs
    install_mongodb
    create_app_user
    setup_app_directory
    clone_repository
    install_app_dependencies
    setup_environment
    setup_nginx
    setup_firewall
    setup_pm2
    start_services
    
    log_success "🎉 ¡Instalación para servidor independiente completada!"
    
    # Verificar instalación
    if verify_installation; then
        echo ""
        log_success "✅ Aplicación lista en: $PROTOCOL://$DOMAIN"
        log_info "📋 Configuración del proxy manager:"
        echo "   • Servidor destino: IP de este servidor"
        echo "   • Puerto: $NGINX_PORT"
        echo "   • Dominio: $DOMAIN"
    fi
}

# Función de instalación para producción
production_install() {
    log_info "🏭 INSTALACIÓN PARA PRODUCCIÓN"
    
    detect_os
    check_permissions
    
    # Preguntar sobre configuración
    read -p "¿Configurar para Nginx Proxy Manager? (y/N): " USE_NPM
    if [[ "$USE_NPM" =~ ^[Yy]$ ]]; then
        USE_NGINX_PROXY_MANAGER=true
        get_proxy_configuration
    fi
    
    read -p "¿Usar PostgreSQL en lugar de MongoDB? (y/N): " USE_PG
    if [[ "$USE_PG" =~ ^[Yy]$ ]]; then
        USE_POSTGRESQL=true
    fi
    
    install_system_dependencies
    install_nodejs
    
    if [[ "$USE_POSTGRESQL" == "true" ]]; then
        log_info "Configurando PostgreSQL..."
        # Aquí iría la configuración de PostgreSQL
    else
        install_mongodb
    fi
    
    create_app_user
    setup_app_directory
    clone_repository
    install_app_dependencies
    setup_environment
    setup_nginx
    setup_firewall
    setup_pm2
    start_services
    
    log_success "🎉 ¡Instalación para producción completada!"
    
    # Verificar instalación
    verify_installation
}

# Función para configurar solo el proxy
proxy_config_only() {
    log_info "🔧 CONFIGURACIÓN DE PROXY ÚNICAMENTE"
    
    get_proxy_configuration
    
    # Verificar que la aplicación esté instalada
    if [[ ! -d "$APP_DIR" ]]; then
        log_error "La aplicación no está instalada en $APP_DIR"
        log_info "Ejecuta primero una instalación completa"
        exit 1
    fi
    
    # Hacer backup de configuración actual
    BACKUP_DIR="$APP_DIR/config-backup-$(date +%Y%m%d-%H%M%S)"
    $SUDO_CMD mkdir -p "$BACKUP_DIR"
    
    if [[ -f "$APP_DIR/.env" ]]; then
        $SUDO_CMD cp "$APP_DIR/.env" "$BACKUP_DIR/.env.backup"
    fi
    
    # Configurar variables de entorno para proxy
    configure_proxy_environment "$APP_DIR/.env"
    
    # Reiniciar aplicación
    if [[ "$OS" == "macos" ]]; then
        # En macOS, ejecutar como usuario actual
        pm2 restart all
    else
        # En Linux, verificar que el usuario existe antes de usar sudo -u
        if id "$APP_USER" &>/dev/null; then
            log_info "Ejecutando: $SUDO_CMD -u '$APP_USER' pm2 restart all"
            $SUDO_CMD -u "$APP_USER" pm2 restart all
        else
            log_error "Usuario $APP_USER no existe, no se puede reiniciar PM2"
            exit 1
        fi
    fi
    
    log_success "🎉 ¡Configuración de proxy completada!"
    log_info "Backup de configuración anterior en: $BACKUP_DIR"
}

# Función de ayuda
show_help() {
    echo "Instalación Completa - Tractoreando"
    echo ""
    echo "Uso: $0 [--quick|--standalone|--production|--proxy-config|--verify|--help]"
    echo ""
    echo "Opciones:"
    echo "  --quick         Instalación rápida con configuración por defecto"
    echo "  --standalone    Instalación para servidor independiente (con proxy)"
    echo "  --production    Instalación completa para producción (interactiva)"
    echo "  --proxy-config  Configurar solo el proxy (aplicación ya instalada)"
    echo "  --verify        Verificar instalación existente"
    echo "  --help          Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  sudo $0 --quick                    # Instalación rápida"
    echo "  sudo $0 --standalone               # Servidor independiente"
    echo "  sudo $0 --production               # Instalación completa"
    echo "  $0 --proxy-config                 # Solo configurar proxy"
    echo "  $0 --verify                       # Verificar instalación"
    echo ""
    echo "Descripción:"
    echo "  Este script consolida todas las funcionalidades de instalación,"
    echo "  configuración y verificación de Tractoreando en un solo comando."
    echo ""
}

# Función principal
main() {
    local mode=${1:-"--help"}
    
    case $mode in
        "--quick")
            quick_install
            ;;
        "--standalone")
            standalone_install
            ;;
        "--production")
            production_install
            ;;
        "--proxy-config")
            proxy_config_only
            ;;
        "--verify")
            verify_installation
            ;;
        "--help")
            show_help
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