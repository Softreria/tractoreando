#!/bin/bash

# Script de actualización automática para Tractoreando - Producción
# Similar al sistema de Herluent
# Autor: Sistema de Deployment Automático
# Fecha: $(date)

set -e  # Salir si cualquier comando falla

echo "🔄 Iniciando actualización de Tractoreando..."
echo "============================================"

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

# Configuración
APP_NAME="tractoreando"
APP_DIR="/opt/$APP_NAME"
APP_USER="$APP_NAME"
BACKUP_DIR="/opt/$APP_NAME/backups"
BRANCH="main"
MAX_BACKUPS=5

# Función para detectar repositorio Git automáticamente
detect_git_repo() {
    local DETECTED_REPO=""
    
    # Intentar detectar desde el directorio actual si existe .git
    if [[ -d ".git" ]]; then
        DETECTED_REPO=$(git remote get-url origin 2>/dev/null || echo "")
    fi
    
    # Si no se detectó, intentar desde el directorio de la aplicación
    if [[ -z "$DETECTED_REPO" && -d "$APP_DIR/.git" ]]; then
        cd "$APP_DIR"
        DETECTED_REPO=$(git remote get-url origin 2>/dev/null || echo "")
    fi
    
    # Si aún no se detectó, buscar en el directorio actual del script
    if [[ -z "$DETECTED_REPO" ]]; then
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        if [[ -d "$SCRIPT_DIR/.git" ]]; then
            cd "$SCRIPT_DIR"
            DETECTED_REPO=$(git remote get-url origin 2>/dev/null || echo "")
        fi
    fi
    
    echo "$DETECTED_REPO"
}

# Detectar repositorio automáticamente
GIT_REPO=$(detect_git_repo)

if [[ -z "$GIT_REPO" ]]; then
    log_warning "No se pudo detectar el repositorio Git automáticamente"
    log_info "Asegúrate de que el directorio actual o $APP_DIR sea un repositorio Git válido"
else
    log_info "Repositorio Git detectado automáticamente: $GIT_REPO"
fi

# Verificar si se ejecuta como root
if [[ $EUID -eq 0 ]]; then
   log_warning "Estás ejecutando este script como root. Aunque es posible continuar, se recomienda ejecutarlo como un usuario normal con permisos sudo."
   read -p "¿Deseas continuar de todos modos? (s/N): " response
   if [[ "$response" != "s" && "$response" != "S" ]]; then
      log_error "Actualización cancelada por el usuario"
      exit 1
   fi
   log_warning "Continuando la actualización como root..."
fi

# Verificar que la aplicación esté instalada
if [[ ! -d "$APP_DIR" ]]; then
    log_error "La aplicación no está instalada en $APP_DIR"
    log_info "Ejecuta primero el script de instalación: ./install.sh"
    exit 1
fi

# Función para crear backup
create_backup() {
    log_info "Creando backup de la aplicación actual..."
    
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_NAME="tractoreando_backup_$TIMESTAMP"
    
    # Crear directorio de backups si no existe
    sudo mkdir -p $BACKUP_DIR
    sudo chown $APP_USER:$APP_USER $BACKUP_DIR
    
    # Crear backup
    sudo -u $APP_USER tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" \
        -C "$APP_DIR" \
        --exclude="node_modules" \
        --exclude="frontend/node_modules" \
        --exclude="frontend/build" \
        --exclude="logs" \
        --exclude="uploads" \
        --exclude="backups" \
        --exclude=".git" \
        .
    
    log_success "Backup creado: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
    
    # Limpiar backups antiguos
    cleanup_old_backups
    
    echo "$BACKUP_NAME" > /tmp/tractoreando_last_backup
}

# Función para limpiar backups antiguos
cleanup_old_backups() {
    log_info "Limpiando backups antiguos (manteniendo últimos $MAX_BACKUPS)..."
    
    cd $BACKUP_DIR
    BACKUP_COUNT=$(ls -1 tractoreando_backup_*.tar.gz 2>/dev/null | wc -l || echo 0)
    
    if [[ $BACKUP_COUNT -gt $MAX_BACKUPS ]]; then
        EXCESS=$((BACKUP_COUNT - MAX_BACKUPS))
        ls -1t tractoreando_backup_*.tar.gz | tail -n $EXCESS | xargs rm -f
        log_success "Eliminados $EXCESS backups antiguos"
    fi
}

# Función para restaurar backup
restore_backup() {
    if [[ ! -f "/tmp/tractoreando_last_backup" ]]; then
        log_error "No se encontró información del último backup"
        return 1
    fi
    
    BACKUP_NAME=$(cat /tmp/tractoreando_last_backup)
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_NAME.tar.gz"
    
    if [[ ! -f "$BACKUP_FILE" ]]; then
        log_error "No se encontró el archivo de backup: $BACKUP_FILE"
        return 1
    fi
    
    log_warning "Restaurando backup: $BACKUP_NAME"
    
    # Detener aplicación
    sudo -u $APP_USER pm2 stop all || true
    
    # Limpiar directorio actual (excepto uploads y logs)
    cd $APP_DIR
    sudo -u $APP_USER find . -maxdepth 1 -type f -not -name ".*" -delete
    sudo -u $APP_USER find . -maxdepth 1 -type d -not -name "." -not -name "uploads" -not -name "logs" -not -name "backups" -exec rm -rf {} + || true
    
    # Restaurar backup
    sudo -u $APP_USER tar -xzf "$BACKUP_FILE" -C "$APP_DIR"
    
    # Reinstalar dependencias
    sudo -u $APP_USER npm install --production
    cd frontend && sudo -u $APP_USER npm install && sudo -u $APP_USER npm run build
    cd ..
    
    # Reiniciar aplicación
    sudo -u $APP_USER pm2 start ecosystem.config.js
    
    log_success "Backup restaurado exitosamente"
}

# Función para verificar estado de la aplicación
check_app_health() {
    log_info "Verificando estado de la aplicación..."
    
    # Verificar PM2
    if ! sudo -u $APP_USER pm2 list | grep -q "online"; then
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

# Función para actualizar desde Git
update_from_git() {
    log_info "Actualizando desde repositorio Git..."
    
    # Verificar que se detectó un repositorio
    if [[ -z "$GIT_REPO" ]]; then
        log_error "No se pudo detectar el repositorio Git automáticamente"
        log_error "Opciones:"
        log_error "1. Ejecuta este script desde un directorio con repositorio Git"
        log_error "2. Asegúrate de que $APP_DIR sea un repositorio Git válido"
        log_error "3. Usa 'update_from_local' en su lugar"
        return 1
    fi
    
    log_info "Usando repositorio: $GIT_REPO"
    
    # Asegurarse de que el directorio de la aplicación existe y tiene los permisos correctos
    if [[ ! -d "$APP_DIR" ]]; then
        log_info "Creando directorio de la aplicación: $APP_DIR"
        sudo mkdir -p "$APP_DIR"
        sudo chown "$APP_USER":"$APP_USER" "$APP_DIR"
    fi
    
    cd "$APP_DIR"
    
    # Verificar si es un repositorio Git
    if [[ ! -d ".git" ]]; then
        log_info "Inicializando repositorio Git en $APP_DIR..."
        sudo -u "$APP_USER" git init
        sudo -u "$APP_USER" git remote add origin "$GIT_REPO"
        
        # Primera descarga
        log_info "Descargando código por primera vez..."
        if ! sudo -u "$APP_USER" git fetch origin; then
            log_error "Error al descargar el código desde el repositorio remoto"
            log_error "Verifica la conectividad y los permisos de acceso al repositorio"
            return 1
        fi
        
        if ! sudo -u "$APP_USER" git checkout -b "$BRANCH" "origin/$BRANCH"; then
            log_error "Error al cambiar a la rama $BRANCH"
            log_error "Verifica que la rama exista en el repositorio remoto"
            return 1
        fi
    else
        # Verificar/actualizar remote origin
        CURRENT_REMOTE=$(sudo -u "$APP_USER" git remote get-url origin 2>/dev/null || echo "")
        if [[ "$CURRENT_REMOTE" != "$GIT_REPO" ]]; then
            log_info "Actualizando URL del repositorio remoto..."
            sudo -u "$APP_USER" git remote set-url origin "$GIT_REPO"
        fi
        
        # Guardar cambios locales si los hay
        if ! sudo -u "$APP_USER" git diff --quiet 2>/dev/null; then
            log_info "Guardando cambios locales..."
            sudo -u "$APP_USER" git add . || true
            sudo -u "$APP_USER" git stash push -m "Auto-stash before update $(date)" || true
        fi
        
        # Actualizar desde remoto
        log_info "Descargando últimos cambios..."
        if ! sudo -u "$APP_USER" git fetch origin; then
            log_error "Error al descargar los cambios desde el repositorio remoto"
            log_error "Verifica la conectividad y los permisos de acceso al repositorio"
            return 1
        fi
        
        if ! sudo -u "$APP_USER" git reset --hard "origin/$BRANCH"; then
            log_error "Error al actualizar a la última versión de la rama $BRANCH"
            log_error "Verifica que la rama exista en el repositorio remoto"
            return 1
        fi
    fi
    
    # Asegurar permisos correctos después de la actualización
    sudo chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
    
    # Mostrar información del commit actual
    CURRENT_COMMIT=$(sudo -u "$APP_USER" git rev-parse --short HEAD)
    COMMIT_MESSAGE=$(sudo -u "$APP_USER" git log -1 --pretty=format:"%s")
    log_success "Código actualizado a commit $CURRENT_COMMIT: $COMMIT_MESSAGE"
}

# Función para actualizar desde archivo local
update_from_local() {
    local SOURCE_DIR=$1
    
    if [[ ! -d "$SOURCE_DIR" ]]; then
        log_error "Directorio fuente no encontrado: $SOURCE_DIR"
        return 1
    fi
    
    log_info "Actualizando desde directorio local: $SOURCE_DIR"
    
    # Asegurarse de que el directorio de la aplicación existe y tiene los permisos correctos
    if [[ ! -d "$APP_DIR" ]]; then
        log_info "Creando directorio de la aplicación: $APP_DIR"
        sudo mkdir -p "$APP_DIR"
        sudo chown "$APP_USER":"$APP_USER" "$APP_DIR"
    fi
    
    # Copiar archivos (excluyendo ciertos directorios)
    log_info "Copiando archivos desde $SOURCE_DIR a $APP_DIR..."
    if ! sudo rsync -av \
        --exclude="node_modules" \
        --exclude="frontend/node_modules" \
        --exclude="frontend/build" \
        --exclude="logs" \
        --exclude="uploads" \
        --exclude="backups" \
        --exclude=".git" \
        --exclude=".env" \
        "$SOURCE_DIR/" "$APP_DIR/"; then
        
        log_error "Error al copiar archivos desde el directorio local"
        log_error "Verifica los permisos y la disponibilidad de los archivos"
        return 1
    fi
    
    # Asegurar permisos correctos después de la copia
    log_info "Ajustando permisos..."
    sudo chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
    
    log_success "Archivos copiados desde directorio local"
}

# Función para instalar dependencias
install_dependencies() {
    log_info "Instalando dependencias..."
    
    cd $APP_DIR
    
    # Backend
    log_info "Instalando dependencias del backend..."
    sudo -u $APP_USER npm install --production
    
    # Frontend
    log_info "Instalando dependencias del frontend..."
    cd frontend
    sudo -u $APP_USER npm install
    
    # Build del frontend
    log_info "Construyendo frontend para producción..."
    sudo -u $APP_USER npm run build
    
    cd $APP_DIR
    
    log_success "Dependencias instaladas correctamente"
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

# Función para verificar y corregir configuración de MongoDB
verify_mongodb_configuration() {
    log_info "Verificando configuración de MongoDB..."
    
    # Verificar que MongoDB esté instalado
    if ! command -v mongod &> /dev/null; then
        log_error "MongoDB no está instalado"
        log_info "Ejecuta el script de instalación para instalar MongoDB"
        return 1
    fi
    
    # Verificar estado de MongoDB
    if ! check_mongodb_status; then
        log_warning "MongoDB no está funcionando correctamente"
        log_info "Intentando corregir configuración de MongoDB..."
        
        # Intentar iniciar MongoDB
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            sudo systemctl start mongod || {
                log_warning "Error al iniciar MongoDB con systemctl, intentando configuración manual..."
                
                # Verificar configuración
                if [[ ! -f "/etc/mongod.conf" ]]; then
                    log_info "Creando archivo de configuración de MongoDB..."
                    sudo tee /etc/mongod.conf > /dev/null <<EOF
# mongod.conf
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1,::1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo

security:
  authorization: disabled
EOF
                fi
                
                # Crear directorios y establecer permisos
                sudo mkdir -p /var/lib/mongodb /var/log/mongodb
                if ! id "mongodb" &>/dev/null; then
                    sudo useradd -r -s /bin/false mongodb
                fi
                sudo chown -R mongodb:mongodb /var/lib/mongodb /var/log/mongodb
                
                # Intentar iniciar nuevamente
                sudo systemctl daemon-reload
                sudo systemctl enable mongod
                sudo systemctl start mongod
            }
            
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command -v brew &> /dev/null; then
                brew services start mongodb/brew/mongodb-community || {
                    log_warning "Error al iniciar MongoDB con brew, intentando inicio manual..."
                    mongod --config /usr/local/etc/mongod.conf --fork
                }
            else
                log_warning "Homebrew no disponible, iniciando MongoDB manualmente..."
                mongod --fork
            fi
        fi
        
        # Esperar y verificar nuevamente
        sleep 5
        if ! check_mongodb_status; then
            log_error "No se pudo corregir la configuración de MongoDB"
            log_info "Soluciones manuales:"
            log_info "1. Verificar logs: sudo journalctl -u mongod -f"
            log_info "2. Verificar configuración: sudo nano /etc/mongod.conf"
            log_info "3. Verificar permisos: sudo chown -R mongodb:mongodb /var/lib/mongodb"
            log_info "4. Ejecutar script de diagnóstico: node diagnose-system.js --mongo-only"
            return 1
        fi
    fi
    
    # Verificar archivo .env
    verify_env_mongodb_config
    
    log_success "Configuración de MongoDB verificada correctamente"
    return 0
}

# Función para verificar configuración de MongoDB en .env
verify_env_mongodb_config() {
    log_info "Verificando configuración de MongoDB en .env..."
    
    local env_file="$APP_DIR/.env"
    
    if [[ ! -f "$env_file" ]]; then
        log_warning "Archivo .env no encontrado, creando configuración básica..."
        create_basic_env_file
        return
    fi
    
    # Verificar variables críticas de MongoDB
    local mongodb_vars=("MONGODB_URI" "NODE_ENV")
    local missing_vars=()
    
    for var in "${mongodb_vars[@]}"; do
        if ! grep -q "^$var=" "$env_file" 2>/dev/null; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_warning "Variables de MongoDB faltantes en .env: ${missing_vars[*]}"
        log_info "Agregando variables faltantes..."
        
        # Crear backup
        sudo -u "$APP_USER" cp "$env_file" "$env_file.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Agregar variables faltantes
        for var in "${missing_vars[@]}"; do
            case $var in
                "MONGODB_URI")
                    echo "MONGODB_URI=mongodb://localhost:27017/tractoreando_prod" | sudo -u "$APP_USER" tee -a "$env_file" > /dev/null
                    ;;
                "NODE_ENV")
                    echo "NODE_ENV=production" | sudo -u "$APP_USER" tee -a "$env_file" > /dev/null
                    ;;
            esac
        done
        
        log_success "Variables de MongoDB agregadas al archivo .env"
    fi
    
    # Verificar timeouts de MongoDB
    if ! grep -q "MONGODB_CONNECT_TIMEOUT" "$env_file" 2>/dev/null; then
        log_info "Agregando configuración de timeouts de MongoDB..."
        cat >> "$env_file" <<EOF

# Configuración de timeouts para MongoDB (agregado durante actualización)
MONGODB_CONNECT_TIMEOUT=30000
MONGODB_SERVER_SELECTION_TIMEOUT=30000
MONGODB_SOCKET_TIMEOUT=45000
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2
EOF
        sudo chown "$APP_USER":"$APP_USER" "$env_file"
        log_success "Configuración de timeouts agregada"
    fi
}

# Función para crear archivo .env básico
create_basic_env_file() {
    log_info "Creando archivo .env básico..."
    
    # Generar secretos seguros
    local jwt_secret
    local session_secret
    if command -v openssl &> /dev/null; then
        jwt_secret=$(openssl rand -hex 32)
        session_secret=$(openssl rand -hex 32)
    else
        jwt_secret=$(head -c 32 /dev/urandom | base64)
        session_secret=$(head -c 32 /dev/urandom | base64)
    fi
    
    # Obtener IP del servidor
    local server_ip=$(hostname -I | awk '{print $1}' || echo 'localhost')
    
    sudo -u "$APP_USER" tee "$APP_DIR/.env" > /dev/null <<EOF
# =============================================================================
# CONFIGURACIÓN DE PRODUCCIÓN - TRACTOREANDO
# Generado automáticamente: $(date)
# =============================================================================

# ===== SERVIDOR =====
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# ===== BASE DE DATOS MONGODB =====
MONGODB_URI=mongodb://localhost:27017/tractoreando_prod

# Configuración de timeouts para MongoDB
MONGODB_CONNECT_TIMEOUT=30000
MONGODB_SERVER_SELECTION_TIMEOUT=30000
MONGODB_SOCKET_TIMEOUT=45000
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2
MONGODB_BUFFER_MAX_ENTRIES=0
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

# ===== URLs DE LA APLICACIÓN =====
BASE_URL=http://$server_ip:5000
FRONTEND_URL=http://$server_ip:5000
BACKEND_URL=http://$server_ip:5000/api
API_URL=http://$server_ip:5000/api
API_VERSION=v1
API_PREFIX=/api

# ===== CORS Y PROXY =====
CORS_ORIGIN=http://$server_ip:5000
CORS_CREDENTIALS=true
TRUST_PROXY=true
TRUSTED_PROXIES=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16

# ===== CONFIGURACIÓN DE SESIÓN =====
SESSION_SECRET=$session_secret
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_HTTP_ONLY=true
SESSION_COOKIE_MAX_AGE=86400000
SESSION_TIMEOUT=3600000
SESSION_WARNING_TIME=300000
MAX_CONCURRENT_SESSIONS=3

# ===== LOGGING =====
LOG_LEVEL=info
LOG_FILE=$APP_DIR/logs/app.log
AUDIT_LOG_ENABLED=true
AUDIT_LOG_PATH=$APP_DIR/logs/audit.log
MORGAN_FORMAT=combined
MORGAN_ENABLED=true

# ===== CACHE =====
CACHE_ENABLED=true
CACHE_TTL=3600

# ===== RATE LIMITING =====
RATE_LIMIT_WINDOW=15
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
EOF
    
    sudo chmod 600 "$APP_DIR/.env"
    sudo chown "$APP_USER":"$APP_USER" "$APP_DIR/.env"
    
    log_success "Archivo .env básico creado"
}

# Función para ejecutar migraciones de base de datos
run_migrations() {
    log_info "Ejecutando migraciones de base de datos..."
    
    cd $APP_DIR
    
    # Verificar configuración de MongoDB antes de migraciones
    if ! verify_mongodb_configuration; then
        log_error "Error en la configuración de MongoDB, saltando migraciones"
        return 1
    fi
    
    # Ejecutar script de migración si existe
    if [[ -f "migrate.js" ]]; then
        sudo -u $APP_USER node migrate.js
        log_success "Migraciones ejecutadas"
    else
        log_info "No se encontraron migraciones"
    fi
    
    # Ejecutar script de carga de datos si existe y la base está vacía
    if [[ -f "data-loader.js" ]]; then
        log_info "Verificando si es necesario cargar datos iniciales..."
        # Aquí podrías agregar lógica para verificar si la base de datos está vacía
        # y ejecutar data-loader.js si es necesario
    fi
}

# Función para reiniciar servicios
restart_services() {
    log_info "Reiniciando servicios..."
    
    # Reiniciar aplicación con PM2
    sudo -u $APP_USER pm2 restart all
    
    # Recargar Nginx
    sudo systemctl reload nginx
    
    log_success "Servicios reiniciados"
}

# Función principal de actualización
update_app() {
    local UPDATE_SOURCE=$1
    local SOURCE_PATH=$2
    
    log_info "Iniciando proceso de actualización..."
    
    # Verificar y corregir configuración de MongoDB
    log_info "Verificando configuración de MongoDB..."
    if ! verify_mongodb_configuration; then
        log_error "Error crítico en la configuración de MongoDB"
        log_info "La actualización no puede continuar sin MongoDB funcionando"
        log_info "Soluciones:"
        log_info "1. Ejecutar script de instalación: ./install.sh"
        log_info "2. Verificar logs de MongoDB: sudo journalctl -u mongod -f"
        log_info "3. Ejecutar diagnóstico: node diagnose-system.js --mongo-only"
        exit 1
    fi
    
    # Crear backup
    create_backup
    
    # Detener aplicación
    log_info "Deteniendo aplicación..."
    sudo -u $APP_USER pm2 stop all
    
    # Actualizar código
    case $UPDATE_SOURCE in
        "git")
            update_from_git
            ;;
        "local")
            update_from_local "$SOURCE_PATH"
            ;;
        *)
            log_error "Fuente de actualización no válida: $UPDATE_SOURCE"
            exit 1
            ;;
    esac
    
    # Instalar dependencias
    install_dependencies
    
    # Ejecutar migraciones
    run_migrations
    
    # Reiniciar servicios
    restart_services
    
    # Verificar configuración de MongoDB después de reiniciar servicios
    log_info "Verificando MongoDB después del reinicio..."
    if ! check_mongodb_status; then
        log_warning "MongoDB no responde después del reinicio, intentando corregir..."
        verify_mongodb_configuration
    fi
    
    # Verificar estado
    if check_app_health; then
        log_success "¡Actualización completada exitosamente!"
        
        # Limpiar backup temporal
        rm -f /tmp/tractoreando_last_backup
        
        echo ""
        echo "============================================"
        echo "🎉 Tractoreando actualizado correctamente"
        echo "============================================"
        echo ""
        echo "📍 URL: http://$(hostname -I | awk '{print $1}' || echo 'localhost')"
        echo "📋 Estado: sudo -u $APP_USER pm2 status"
        echo "📄 Logs: sudo -u $APP_USER pm2 logs"
        echo ""
        
        # Mostrar información útil post-actualización
        log_info "Información útil:"
        log_info "- Estado de MongoDB: $(check_mongodb_status && echo 'OK' || echo 'ERROR')"
        log_info "- Archivo .env: $(test -f $APP_DIR/.env && echo 'Existe' || echo 'Faltante')"
        log_info "- Logs de la aplicación: pm2 logs $APP_NAME"
        log_info "- Logs de MongoDB: sudo journalctl -u mongod -f"
    else
        log_error "La actualización falló. Restaurando backup..."
        restore_backup
        
        if check_app_health; then
            log_success "Backup restaurado exitosamente"
        else
            log_error "Error crítico: No se pudo restaurar el backup"
            log_error "Intervención manual requerida"
        fi
        
        log_info "Comandos de diagnóstico:"
        log_info "- Verificar MongoDB: node diagnose-system.js --mongo-only"
        log_info "- Verificar PM2: pm2 status"
        log_info "- Verificar logs: pm2 logs $APP_NAME"
        
        exit 1
    fi
}

# Función para mostrar ayuda
show_help() {
    echo "Script de actualización de Tractoreando"
    echo ""
    echo "Uso:"
    echo "  $0 git                    # Actualizar desde repositorio Git"
    echo "  $0 local <directorio>     # Actualizar desde directorio local"
    echo "  $0 status                 # Mostrar estado actual"
    echo "  $0 backup                 # Crear backup manual"
    echo "  $0 restore                # Restaurar último backup"
    echo "  $0 logs                   # Mostrar logs de la aplicación"
    echo "  $0 restart                # Reiniciar aplicación"
    echo "  $0 --help                 # Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 git                                    # Actualizar desde Git"
    echo "  $0 local /home/user/tractoreando-new     # Actualizar desde directorio"
    echo ""
}

# Función para mostrar estado
show_status() {
    echo "Estado de Tractoreando"
    echo "====================="
    echo ""
    echo "📁 Directorio: $APP_DIR"
    echo "👤 Usuario: $APP_USER"
    echo ""
    echo "🔄 Estado PM2:"
    sudo -u $APP_USER pm2 list
    echo ""
    echo "🌐 Estado Nginx:"
    sudo systemctl status nginx --no-pager -l
    echo ""
    echo "💾 Backups disponibles:"
    ls -la $BACKUP_DIR/*.tar.gz 2>/dev/null || echo "No hay backups"
}

# Función para mostrar logs
show_logs() {
    echo "Logs de Tractoreando"
    echo "==================="
    echo ""
    echo "Presiona Ctrl+C para salir"
    echo ""
    sudo -u $APP_USER pm2 logs --lines 50
}

# Función para reiniciar
restart_app() {
    log_info "Reiniciando Tractoreando..."
    sudo -u $APP_USER pm2 restart all
    sudo systemctl reload nginx
    
    if check_app_health; then
        log_success "Aplicación reiniciada correctamente"
    else
        log_error "Error al reiniciar la aplicación"
        exit 1
    fi
}

# Procesar argumentos
case "${1:-}" in
    "git")
        update_app "git"
        ;;
    "local")
        if [[ -z "${2:-}" ]]; then
            log_error "Debes especificar el directorio fuente"
            echo "Uso: $0 local <directorio>"
            exit 1
        fi
        update_app "local" "$2"
        ;;
    "status")
        show_status
        ;;
    "backup")
        create_backup
        ;;
    "restore")
        restore_backup
        ;;
    "logs")
        show_logs
        ;;
    "restart")
        restart_app
        ;;
    "--help"|"-h"|"help")
        show_help
        ;;
    "")
        log_error "Debes especificar una acción"
        show_help
        exit 1
        ;;
    *)
        log_error "Acción no reconocida: $1"
        show_help
        exit 1
        ;;
esac