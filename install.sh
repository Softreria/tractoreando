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
   log_warning "Estás ejecutando este script como root. Aunque es posible continuar, se recomienda ejecutarlo como un usuario normal con permisos sudo."
   read -p "¿Deseas continuar de todos modos? (s/N): " response
   if [[ "$response" != "s" && "$response" != "S" ]]; then
      log_error "Instalación cancelada por el usuario"
      exit 1
   fi
   log_warning "Continuando la instalación como root..."
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

# Función para verificar puerto disponible
check_port() {
    local port=$1
    local service_name=$2
    
    # Usar ss, lsof o netstat para verificar puerto
    if command -v ss &> /dev/null; then
        if ss -tuln | grep -q ":$port "; then
            log_warning "Puerto $port ya está en uso por otro servicio"
            return 1
        fi
    elif command -v lsof &> /dev/null; then
        if lsof -i :$port &> /dev/null; then
            log_warning "Puerto $port ya está en uso por otro servicio"
            return 1
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln | grep -q ":$port "; then
            log_warning "Puerto $port ya está en uso por otro servicio"
            return 1
        fi
    else
        log_warning "No se pudo verificar disponibilidad del puerto $port (ss, lsof, netstat no disponibles)"
    fi
    
    return 0
}

# Función para verificar estado de MongoDB
check_mongodb_status() {
    log_info "Verificando estado de MongoDB..."
    
    # Verificar si el proceso está ejecutándose
    if pgrep -x "mongod" > /dev/null; then
        log_success "MongoDB está ejecutándose"
        
        # Verificar conectividad
        if command -v mongosh &> /dev/null; then
            if mongosh --eval "db.adminCommand('ping')" --quiet &> /dev/null; then
                log_success "MongoDB responde correctamente"
                return 0
            fi
        elif command -v mongo &> /dev/null; then
            if mongo --eval "db.adminCommand('ping')" --quiet &> /dev/null; then
                log_success "MongoDB responde correctamente"
                return 0
            fi
        fi
        
        log_warning "MongoDB está ejecutándose pero no responde"
        return 1
    else
        log_warning "MongoDB no está ejecutándose"
        return 1
    fi
}

# Función para instalar MongoDB
install_mongodb() {
    log_info "Instalando MongoDB..."
    
    # Verificar si MongoDB ya está instalado
    if command -v mongod &> /dev/null; then
        log_success "MongoDB ya está instalado"
        
        # Verificar estado y configuración
        if check_mongodb_status; then
            log_success "MongoDB está funcionando correctamente"
            return 0
        else
            log_info "MongoDB instalado pero necesita configuración"
        fi
    else
        log_info "Instalando MongoDB desde repositorio oficial..."
        
        if [[ "$OS" == "linux" ]]; then
            # Detectar distribución específica
            if command -v lsb_release &> /dev/null; then
                UBUNTU_VERSION=$(lsb_release -rs)
                UBUNTU_CODENAME=$(lsb_release -cs)
            else
                UBUNTU_VERSION="20.04"
                UBUNTU_CODENAME="focal"
            fi
            
            log_info "Detectada Ubuntu $UBUNTU_VERSION ($UBUNTU_CODENAME)"
            
            # Instalar MongoDB en Linux (Ubuntu/Debian)
            log_info "Agregando clave GPG de MongoDB..."
            wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
            
            log_info "Agregando repositorio de MongoDB..."
            echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $UBUNTU_CODENAME/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
            
            log_info "Actualizando lista de paquetes..."
            sudo apt-get update
            
            log_info "Instalando MongoDB Community Edition..."
            sudo apt-get install -y mongodb-org
            
        elif [[ "$OS" == "macos" ]]; then
            # Instalar MongoDB en macOS
            if command -v brew &> /dev/null; then
                log_info "Instalando MongoDB via Homebrew..."
                brew tap mongodb/brew
                brew install mongodb-community
            else
                log_error "Homebrew no está instalado. Por favor instala MongoDB manualmente."
                log_info "Visita: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/"
                exit 1
            fi
        fi
    fi
    
    # Configurar MongoDB
    configure_mongodb
    
    # Iniciar MongoDB
    start_mongodb
    
    # Verificar instalación
    if check_mongodb_status; then
        log_success "MongoDB instalado y configurado correctamente"
    else
        log_error "Error en la instalación de MongoDB"
        exit 1
    fi
}

# Función para configurar MongoDB
configure_mongodb() {
    log_info "Configurando MongoDB..."
    
    if [[ "$OS" == "linux" ]]; then
        # Crear directorio de datos si no existe
        sudo mkdir -p /var/lib/mongodb
        sudo mkdir -p /var/log/mongodb
        
        # Crear usuario mongodb si no existe
        if ! id "mongodb" &>/dev/null; then
            sudo useradd -r -s /bin/false mongodb
        fi
        
        # Establecer permisos
        sudo chown -R mongodb:mongodb /var/lib/mongodb
        sudo chown -R mongodb:mongodb /var/log/mongodb
        
        # Configurar archivo de configuración
        sudo tee /etc/mongod.conf > /dev/null <<EOF
# mongod.conf

# for documentation of all options, see:
#   http://docs.mongodb.org/manual/reference/configuration-options/

# Where to store data.
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

# where to write logging data.
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

# network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1,::1

# process management
processManagement:
  timeZoneInfo: /usr/share/zoneinfo

# security
security:
  authorization: disabled

# operation profiling
operationProfiling:
  slowOpThresholdMs: 100

# replication
#replication:

# sharding
#sharding:
EOF
        
        # Habilitar y configurar servicio systemd
        sudo systemctl daemon-reload
        sudo systemctl enable mongod
        
    elif [[ "$OS" == "macos" ]]; then
        # Crear directorios necesarios en macOS
        sudo mkdir -p /usr/local/var/mongodb
        sudo mkdir -p /usr/local/var/log/mongodb
        
        # Establecer permisos
        sudo chown $(whoami) /usr/local/var/mongodb
        sudo chown $(whoami) /usr/local/var/log/mongodb
    fi
    
    log_success "MongoDB configurado"
}

# Función para iniciar MongoDB
start_mongodb() {
    log_info "Iniciando MongoDB..."
    
    # Verificar que el puerto 27017 esté disponible
    if ! check_port 27017 "MongoDB"; then
        log_warning "Puerto 27017 ocupado, intentando detener procesos existentes..."
        sudo pkill -f mongod || true
        sleep 3
    fi
    
    if [[ "$OS" == "linux" ]]; then
        # Iniciar con systemctl
        sudo systemctl start mongod
        
        # Esperar a que inicie
        for i in {1..30}; do
            if sudo systemctl is-active --quiet mongod; then
                log_success "MongoDB iniciado correctamente"
                break
            fi
            sleep 1
        done
        
        if ! sudo systemctl is-active --quiet mongod; then
            log_error "MongoDB no pudo iniciarse"
            log_info "Verificando logs..."
            sudo journalctl -u mongod --no-pager -l
            exit 1
        fi
        
    elif [[ "$OS" == "macos" ]]; then
        # Iniciar con brew services
        if command -v brew &> /dev/null; then
            brew services start mongodb/brew/mongodb-community
            
            # Esperar a que inicie
            for i in {1..30}; do
                if pgrep -x "mongod" > /dev/null; then
                    log_success "MongoDB iniciado correctamente"
                    break
                fi
                sleep 1
            done
        else
            # Iniciar manualmente
            mongod --config /usr/local/etc/mongod.conf --fork
        fi
    fi
    
    # Verificar que esté respondiendo
    sleep 5
    if ! check_mongodb_status; then
        log_error "MongoDB no responde después del inicio"
        exit 1
    fi
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
        log_info "Creando directorio de destino con permisos adecuados..."
        sudo mkdir -p "$APP_DIR"
        sudo chown $APP_USER:$APP_USER "$APP_DIR"
        
        log_info "Clonando repositorio..."
        sudo -u $APP_USER git clone "$DETECTED_REPO" "$APP_DIR" || {
            log_error "Error al clonar el repositorio. Verificando si el directorio existe..."
            if [[ -d "$APP_DIR" ]]; then
                log_warning "El directorio '$APP_DIR' existe pero la clonación falló."
                log_info "Intentando copiar archivos locales en su lugar..."
                sudo rm -rf "$APP_DIR"/*
                sudo cp -r . "$APP_DIR/"
                sudo chown -R $APP_USER:$APP_USER "$APP_DIR"
            else
                log_error "No se pudo crear el directorio de trabajo. Verifica los permisos."
                exit 1
            fi
        }
    elif [[ -n "${GIT_REPO:-}" ]]; then
        log_info "Usando repositorio especificado: $GIT_REPO"
        log_info "Creando directorio de destino con permisos adecuados..."
        sudo mkdir -p "$APP_DIR"
        sudo chown $APP_USER:$APP_USER "$APP_DIR"
        
        log_info "Clonando repositorio..."
        sudo -u $APP_USER git clone "$GIT_REPO" "$APP_DIR" || {
            log_error "Error al clonar el repositorio. Verificando si el directorio existe..."
            if [[ -d "$APP_DIR" ]]; then
                log_warning "El directorio '$APP_DIR' existe pero la clonación falló."
                log_info "Intentando copiar archivos locales en su lugar..."
                sudo rm -rf "$APP_DIR"/*
                sudo cp -r . "$APP_DIR/"
                sudo chown -R $APP_USER:$APP_USER "$APP_DIR"
            else
                log_error "No se pudo crear el directorio de trabajo. Verifica los permisos."
                exit 1
            fi
        }
    else
        log_warning "No se detectó repositorio Git. Creando directorio vacío..."
        log_info "Podrás configurar Git más tarde con: cd $APP_DIR && git init && git remote add origin <tu-repo>"
        
        log_info "Creando directorio de destino con permisos adecuados..."
        sudo mkdir -p "$APP_DIR"
        sudo chown $APP_USER:$APP_USER "$APP_DIR"
        
        # Copiar archivos de la aplicación desde el directorio actual
        log_info "Copiando archivos de la aplicación..."
        sudo cp -r . "$APP_DIR/"
        sudo chown -R $APP_USER:$APP_USER "$APP_DIR"
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

# Función para verificar conectividad de MongoDB
test_mongodb_connection() {
    local mongodb_uri=$1
    log_info "Verificando conectividad con MongoDB..."
    
    # Crear script temporal para probar conexión
    local test_script="/tmp/test_mongodb_connection.js"
    cat > "$test_script" <<EOF
try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient('$mongodb_uri', {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
    });
    
    client.connect().then(() => {
        console.log('✅ Conexión exitosa a MongoDB');
        return client.db().admin().ping();
    }).then(() => {
        console.log('✅ MongoDB responde correctamente');
        process.exit(0);
    }).catch((error) => {
        console.error('❌ Error de conexión:', error.message);
        process.exit(1);
    }).finally(() => {
        client.close();
    });
} catch (error) {
    console.error('❌ Error al probar conexión:', error.message);
    process.exit(1);
}
EOF
    
    # Ejecutar test de conexión
    cd "$APP_DIR"
    if sudo -u "$APP_USER" node "$test_script" 2>/dev/null; then
        rm -f "$test_script"
        return 0
    else
        rm -f "$test_script"
        return 1
    fi
}

# Función para configurar variables de entorno
setup_environment() {
    log_info "Configurando variables de entorno..."
    
    # Verificar si ya existe archivo .env
    if [[ -f "$APP_DIR/.env" ]]; then
        log_warning "Archivo .env ya existe"
        echo "Opciones disponibles:"
        echo "  1. Mantener archivo existente"
        echo "  2. Crear backup y generar nuevo archivo .env"
        echo "  3. Actualizar solo variables faltantes"
        read -p "Selecciona una opción [1-3]: " env_option
        
        case $env_option in
            1)
                log_info "Manteniendo archivo .env existente"
                # Verificar variables críticas
                verify_env_variables
                return
                ;;
            2)
                log_info "Creando backup del archivo .env existente..."
                sudo -u "$APP_USER" cp "$APP_DIR/.env" "$APP_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
                ;;
            3)
                log_info "Actualizando variables faltantes..."
                update_missing_env_variables
                return
                ;;
            *)
                log_info "Opción no válida, manteniendo archivo existente"
                verify_env_variables
                return
                ;;
        esac
    fi
    
    # Generar JWT secret seguro
    local jwt_secret
    if command -v openssl &> /dev/null; then
        jwt_secret=$(openssl rand -base64 32)
    else
        jwt_secret=$(head -c 32 /dev/urandom | base64)
    fi
    
    # Detectar IP del servidor
    local server_ip
    if command -v hostname &> /dev/null; then
        server_ip=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
    else
        server_ip="localhost"
    fi
    
    # Crear archivo .env para producción
    log_info "Generando archivo .env de producción..."
    
    # Copiar desde .env.production si existe
    if [[ -f "$APP_DIR/.env.production" ]]; then
        log_info "Copiando configuración desde .env.production..."
        sudo -u "$APP_USER" cp "$APP_DIR/.env.production" "$APP_DIR/.env"
        
        # Actualizar MONGODB_URI para usar 127.0.0.1 en lugar de localhost
        log_info "Configurando MongoDB URI para producción..."
        sudo -u "$APP_USER" sed -i "s|MONGODB_URI=mongodb://localhost:27017|MONGODB_URI=mongodb://127.0.0.1:27017|g" "$APP_DIR/.env"
        
        # Actualizar nombre de base de datos si es necesario
        sudo -u "$APP_USER" sed -i "s|/tractoreando_prod|/$DB_NAME|g" "$APP_DIR/.env"
        
        log_success "Archivo .env configurado desde .env.production"
    else
        log_warning "No se encontró .env.production, creando archivo .env básico..."
        sudo -u "$APP_USER" tee "$APP_DIR/.env" > /dev/null <<EOF
# =============================================================================
# CONFIGURACIÓN DE PRODUCCIÓN - TRACTOREANDO
# Generado automáticamente: $(date)
# =============================================================================

# ===== SERVIDOR =====
NODE_ENV=production
PORT=$PORT_BACKEND
HOST=0.0.0.0

# ===== BASE DE DATOS MONGODB =====
MONGODB_URI=mongodb://127.0.0.1:27017/$DB_NAME
DB_NAME=$DB_NAME

# Configuración de timeouts para MongoDB
MONGODB_CONNECT_TIMEOUT=30000
MONGODB_SERVER_SELECTION_TIMEOUT=30000
MONGODB_SOCKET_TIMEOUT=45000
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2
MONGODB_USE_NEW_URL_PARSER=true
MONGODB_USE_UNIFIED_TOPOLOGY=true

# ===== AUTENTICACIÓN Y SEGURIDAD =====
JWT_SECRET=$jwt_secret
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d
JWT_ALGORITHM=HS256
JWT_ISSUER=tractoreando
JWT_AUDIENCE=tractoreando-users

# Configuración de contraseñas
BCRYPT_ROUNDS=12
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SYMBOLS=false

# Bloqueo de cuentas
ACCOUNT_LOCKOUT_ENABLED=true
ACCOUNT_LOCKOUT_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=900000

# ===== ARCHIVOS Y UPLOADS =====
UPLOAD_PATH=$APP_DIR/uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx
IMAGE_PROCESSING_ENABLED=true
IMAGE_RESIZE_ENABLED=true
IMAGE_COMPRESS_ENABLED=true

# ===== CONFIGURACIÓN DE EMAIL (IMPORTANTE: Configurar antes de usar) =====
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-password-de-aplicacion
EMAIL_FROM=noreply@tractoreando.com

# ===== URLs DE LA APLICACIÓN =====
BASE_URL=http://$server_ip
FRONTEND_URL=http://$server_ip:$PORT_FRONTEND
BACKEND_URL=http://$server_ip:$PORT_BACKEND
API_URL=http://$server_ip:$PORT_BACKEND/api
API_VERSION=v1
API_PREFIX=/api

# ===== CORS Y PROXY =====
CORS_ORIGIN=http://$server_ip:$PORT_FRONTEND
CORS_CREDENTIALS=true
TRUST_PROXY=true
TRUSTED_PROXIES=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16

# ===== CONFIGURACIÓN DE SESIÓN =====
SESSION_SECRET=$jwt_secret
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_HTTP_ONLY=true
SESSION_COOKIE_MAX_AGE=86400000
SESSION_TIMEOUT=3600000
SESSION_WARNING_TIME=300000
MAX_CONCURRENT_SESSIONS=3

# ===== LOGGING =====
LOG_LEVEL=info
LOG_FILE=$APP_DIR/logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5
AUDIT_LOG_ENABLED=true
AUDIT_LOG_PATH=$APP_DIR/logs/audit.log
MORGAN_FORMAT=combined
MORGAN_ENABLED=true

# ===== CACHE =====
CACHE_ENABLED=true
CACHE_TTL=3600
REDIS_URL=redis://localhost:6379

# ===== RATE LIMITING =====
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false
RATE_LIMIT_SKIP_FAILED_REQUESTS=false

# ===== CONFIGURACIÓN REGIONAL =====
TZ=Europe/Madrid
I18N_ENABLED=true
I18N_DEFAULT_LOCALE=es
I18N_FALLBACK_LOCALE=en
DEFAULT_CURRENCY=EUR
CURRENCY_SYMBOL=€
DATE_FORMAT=DD/MM/YYYY
TIME_FORMAT=HH:mm
DATETIME_FORMAT=DD/MM/YYYY HH:mm

# ===== PAGINACIÓN Y BÚSQUEDA =====
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
SEARCH_ENABLED=true
SEARCH_MIN_LENGTH=3
SEARCH_MAX_RESULTS=100

# ===== EXPORTACIÓN E IMPORTACIÓN =====
EXPORT_ENABLED=true
EXPORT_MAX_RECORDS=10000
EXPORT_FORMATS=csv,xlsx,pdf
IMPORT_ENABLED=true
IMPORT_MAX_RECORDS=1000
IMPORT_FORMATS=csv,xlsx

# ===== MONITOREO Y SALUD =====
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PATH=/health
HEALTH_CHECK_INTERVAL=30000
MONITORING_ENABLED=true
PERFORMANCE_MONITORING=true

# ===== LÍMITES DE RECURSOS =====
MEMORY_LIMIT=512mb
MEMORY_WARNING_THRESHOLD=400mb
CPU_MONITORING=true
CPU_WARNING_THRESHOLD=80
DISK_MONITORING=true
DISK_WARNING_THRESHOLD=85

# ===== CONFIGURACIÓN DE RED =====
NETWORK_TIMEOUT=30000
NETWORK_RETRIES=3
REQUEST_TIMEOUT=30000
RESPONSE_TIMEOUT=30000
KEEP_ALIVE_ENABLED=true
KEEP_ALIVE_TIMEOUT=5000

# ===== BODY PARSER =====
BODY_PARSER_LIMIT=50mb
BODY_PARSER_EXTENDED=true
JSON_LIMIT=50mb

# ===== COMPRESIÓN =====
COMPRESSION_ENABLED=true
COMPRESSION_LEVEL=6
GZIP_ENABLED=true
GZIP_LEVEL=6

# ===== SEGURIDAD ADICIONAL =====
HELMET_ENABLED=true
VALIDATION_ENABLED=true
VALIDATION_ABORT_EARLY=false
SANITIZATION_ENABLED=true
SPAM_PROTECTION_ENABLED=true

# ===== BACKUP Y MANTENIMIENTO =====
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_PATH=$APP_DIR/backups
AUTO_CLEANUP_ENABLED=true
AUTO_CLEANUP_DAYS=90
AUTO_CLEANUP_LOGS_DAYS=30

# ===== CRON JOBS =====
CRON_ENABLED=true
CRON_BACKUP=0 2 * * *
CRON_CLEANUP=0 3 * * 0
CRON_REPORTS=0 8 * * 1

# ===== CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS =====
STATIC_FILES_ENABLED=true
STATIC_FILES_PATH=$APP_DIR/public
STATIC_FILES_MAX_AGE=86400000
BROWSER_CACHING_ENABLED=true
BROWSER_CACHE_MAX_AGE=31536000

# ===== GRACEFUL SHUTDOWN =====
GRACEFUL_SHUTDOWN_TIMEOUT=10000

# ===== CLUSTER =====
CLUSTER_ENABLED=true
CLUSTER_WORKERS=0

# ===== RETRY LOGIC =====
RETRY_LOGIC_ENABLED=true
RETRY_MAX_ATTEMPTS=3
RETRY_DELAY=1000

# ===== DEBOUNCING =====
DEBOUNCING_ENABLED=true
DEBOUNCE_DELAY=300

# ===== GDPR Y PRIVACIDAD =====
GDPR_ENABLED=true
GDPR_CONSENT_REQUIRED=true
GDPR_DATA_EXPORT_ENABLED=true
GDPR_DATA_DELETION_ENABLED=true
COOKIE_CONSENT_REQUIRED=true
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

# ===== INFORMACIÓN LEGAL =====
LEGAL_COMPANY_NAME=Tu Empresa S.L.
LEGAL_ADDRESS=Calle Ejemplo 123, 28001 Madrid, España
LEGAL_PHONE=+34 123 456 789
LEGAL_EMAIL=legal@tuempresa.com
CONTACT_EMAIL=contacto@tractoreando.com
SUPPORT_EMAIL=soporte@tractoreando.com

# ===== SEO BÁSICO =====
SEO_ENABLED=true
SEO_TITLE=Tractoreando - Gestión de Vehículos
SEO_DESCRIPTION=Sistema de gestión integral para vehículos y mantenimiento
SEO_KEYWORDS=tractores,vehículos,mantenimiento,gestión,flota
SEO_AUTHOR=Tractoreando Team

# ===== CONFIGURACIÓN DE DESARROLLO (Solo para referencia) =====
# Estas variables están deshabilitadas en producción
HOT_RELOAD_ENABLED=false
LIVE_RELOAD_ENABLED=false
SOURCEMAPS_ENABLED=false

# Variables de desarrollo (no usar en producción)
# DEBUG=false
# VERBOSE_LOGGING=false
EOF
    fi
    
    # Establecer permisos seguros para el archivo .env
    sudo chmod 600 "$APP_DIR/.env"
    sudo chown "$APP_USER":"$APP_USER" "$APP_DIR/.env"
    
    # Crear directorio de uploads
    sudo mkdir -p "$APP_DIR/uploads"
    sudo chown "$APP_USER":"$APP_USER" "$APP_DIR/uploads"
    sudo chmod 755 "$APP_DIR/uploads"
    
    # Crear directorio de logs
    sudo mkdir -p "$APP_DIR/logs"
    sudo chown "$APP_USER":"$APP_USER" "$APP_DIR/logs"
    sudo chmod 755 "$APP_DIR/logs"
    
    # Verificar configuración de MongoDB
    verify_mongodb_configuration
    
    log_success "Variables de entorno configuradas correctamente"
    log_info "📝 Archivo .env creado en: $APP_DIR/.env"
    log_warning "⚠️  IMPORTANTE: Configura las variables EMAIL_* antes de usar el sistema de correos"
}

# Función para verificar variables de entorno críticas
verify_env_variables() {
    log_info "Verificando variables de entorno críticas..."
    
    local env_file="$APP_DIR/.env"
    local missing_vars=()
    
    # Variables críticas que deben existir
    local critical_vars=("NODE_ENV" "PORT" "MONGODB_URI" "JWT_SECRET")
    
    for var in "${critical_vars[@]}"; do
        if ! grep -q "^$var=" "$env_file" 2>/dev/null; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_warning "Variables faltantes: ${missing_vars[*]}"
        log_info "Ejecutando actualización de variables..."
        update_missing_env_variables
    else
        log_success "Todas las variables críticas están presentes"
    fi
}

# Función para actualizar variables faltantes
update_missing_env_variables() {
    log_info "Actualizando variables de entorno faltantes..."
    
    local env_file="$APP_DIR/.env"
    local backup_file="$APP_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Crear backup
    sudo -u "$APP_USER" cp "$env_file" "$backup_file"
    
    # Verificar y agregar variables faltantes
    if ! grep -q "^NODE_ENV=" "$env_file" 2>/dev/null; then
        echo "NODE_ENV=production" | sudo -u "$APP_USER" tee -a "$env_file" > /dev/null
    fi
    
    if ! grep -q "^PORT=" "$env_file" 2>/dev/null; then
        echo "PORT=$PORT_BACKEND" | sudo -u "$APP_USER" tee -a "$env_file" > /dev/null
    fi
    
    if ! grep -q "^MONGODB_URI=" "$env_file" 2>/dev/null; then
        echo "MONGODB_URI=mongodb://localhost:27017/$DB_NAME" | sudo -u "$APP_USER" tee -a "$env_file" > /dev/null
    fi
    
    if ! grep -q "^JWT_SECRET=" "$env_file" 2>/dev/null; then
        local jwt_secret
        if command -v openssl &> /dev/null; then
            jwt_secret=$(openssl rand -base64 32)
        else
            jwt_secret=$(head -c 32 /dev/urandom | base64)
        fi
        echo "JWT_SECRET=$jwt_secret" | sudo -u "$APP_USER" tee -a "$env_file" > /dev/null
    fi
    
    log_success "Variables actualizadas. Backup guardado en: $backup_file"
}

# Función para verificar configuración de MongoDB
verify_mongodb_configuration() {
    log_info "Verificando configuración de MongoDB..."
    
    # Leer MONGODB_URI del archivo .env
    local mongodb_uri
    if [[ -f "$APP_DIR/.env" ]]; then
        mongodb_uri=$(grep "^MONGODB_URI=" "$APP_DIR/.env" | cut -d'=' -f2- | tr -d '"')
    else
        mongodb_uri="mongodb://localhost:27017/$DB_NAME"
    fi
    
    log_info "URI de MongoDB: $mongodb_uri"
    
    # Verificar que MongoDB esté ejecutándose
    if ! check_mongodb_status; then
        log_warning "MongoDB no está ejecutándose, intentando iniciar..."
        start_mongodb
        
        if ! check_mongodb_status; then
            log_error "No se pudo iniciar MongoDB"
            return 1
        fi
    fi
    
    # Esperar un momento para que MongoDB esté completamente listo
    sleep 3
    
    # Verificar conectividad si tenemos las dependencias necesarias
    if [[ -f "$APP_DIR/package.json" ]] && grep -q "mongodb" "$APP_DIR/package.json"; then
        if test_mongodb_connection "$mongodb_uri"; then
            log_success "✅ Conexión a MongoDB verificada correctamente"
        else
            log_warning "⚠️  No se pudo verificar la conexión a MongoDB"
            log_info "Esto es normal durante la instalación inicial"
            log_info "La conexión se verificará después de instalar las dependencias"
        fi
    else
        log_info "Verificación de conexión pendiente hasta instalar dependencias"
    fi
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

# Función para verificar servicios después de la instalación
verify_installation_services() {
    log_info "Verificando servicios después de la instalación..."
    
    local all_services_ok=true
    
    # Verificar MongoDB
    log_info "Verificando MongoDB..."
    if check_mongodb_status; then
        log_success "✅ MongoDB está funcionando correctamente"
    else
        log_error "❌ MongoDB no está funcionando"
        all_services_ok=false
    fi
    
    # Verificar PM2
    log_info "Verificando PM2..."
    if sudo -u "$APP_USER" pm2 status &>/dev/null; then
        local pm2_apps=$(sudo -u "$APP_USER" pm2 jlist | jq -r '.[] | select(.name=="'$APP_NAME'-backend") | .pm2_env.status' 2>/dev/null || echo "unknown")
        if [[ "$pm2_apps" == "online" ]]; then
            log_success "✅ PM2 y aplicación están funcionando correctamente"
        else
            log_warning "⚠️  PM2 está instalado pero la aplicación no está en línea (estado: $pm2_apps)"
            all_services_ok=false
        fi
    else
        log_error "❌ PM2 no está funcionando correctamente"
        all_services_ok=false
    fi
    
    # Verificar Nginx
    log_info "Verificando Nginx..."
    if [[ "$OS" == "linux" ]]; then
        if sudo systemctl is-active --quiet nginx; then
            log_success "✅ Nginx está funcionando correctamente"
        else
            log_error "❌ Nginx no está funcionando"
            all_services_ok=false
        fi
    elif [[ "$OS" == "macos" ]]; then
        if pgrep -x "nginx" > /dev/null; then
            log_success "✅ Nginx está funcionando correctamente"
        else
            log_error "❌ Nginx no está funcionando"
            all_services_ok=false
        fi
    fi
    
    # Verificar conectividad de puertos
    log_info "Verificando conectividad de puertos..."
    
    # Verificar puerto del backend
    if check_port "$PORT_BACKEND" "Backend"; then
        log_warning "⚠️  Puerto $PORT_BACKEND no está en uso (la aplicación podría no estar iniciada)"
    else
        log_success "✅ Puerto $PORT_BACKEND está en uso (aplicación probablemente funcionando)"
    fi
    
    # Verificar puerto 80 (Nginx)
    if check_port "80" "Nginx"; then
        log_warning "⚠️  Puerto 80 no está en uso (Nginx podría no estar funcionando)"
    else
        log_success "✅ Puerto 80 está en uso (Nginx probablemente funcionando)"
    fi
    
    # Verificar conectividad a MongoDB desde la aplicación
    log_info "Verificando conectividad a MongoDB desde la aplicación..."
    if [[ -f "$APP_DIR/.env" ]]; then
        local mongodb_uri=$(grep "^MONGODB_URI=" "$APP_DIR/.env" | cut -d'=' -f2- | tr -d '"')
        if test_mongodb_connection "$mongodb_uri"; then
            log_success "✅ Conectividad a MongoDB desde la aplicación verificada"
        else
            log_warning "⚠️  No se pudo verificar la conectividad a MongoDB desde la aplicación"
            all_services_ok=false
        fi
    fi
    
    # Resumen final
    echo ""
    if [[ "$all_services_ok" == "true" ]]; then
        log_success "🎉 Todos los servicios están funcionando correctamente"
    else
        log_warning "⚠️  Algunos servicios necesitan atención"
        echo ""
        log_info "💡 Comandos de diagnóstico útiles:"
        echo "   • Estado de MongoDB: sudo systemctl status mongod"
        echo "   • Estado de PM2: sudo -u $APP_USER pm2 status"
        echo "   • Estado de Nginx: sudo systemctl status nginx"
        echo "   • Logs de la aplicación: sudo -u $APP_USER pm2 logs"
        echo "   • Logs de Nginx: sudo tail -f /var/log/nginx/$APP_NAME-*.log"
    fi
    
    echo ""
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
    
    # Verificar servicios después de la instalación
    verify_installation_services
    
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
    echo "   • Diagnóstico: node diagnose-system.js --mongo-only"
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