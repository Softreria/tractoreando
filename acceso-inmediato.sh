#!/bin/bash

# Script de Acceso Inmediato - Tractoreando
# Instala, configura y verifica todo para acceso inmediato
# Después de 3 horas intentando, ¡esto debe funcionar!

set -e

echo "🚀 ACCESO INMEDIATO A TRACTOREANDO"
echo "==================================="
echo "Resolviendo todos los problemas de una vez..."
echo ""

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

# Verificar si se ejecuta como root
if [[ $EUID -ne 0 ]]; then
    log_error "Este script debe ejecutarse como root para resolver todos los problemas"
    log_info "Ejecuta: sudo ./acceso-inmediato.sh"
    exit 1
fi

# Función para verificar y reparar servicios
fix_services() {
    log_info "🔧 Verificando y reparando servicios..."
    
    # MongoDB
    if ! systemctl is-active --quiet mongod; then
        log_warning "MongoDB no está ejecutándose, iniciando..."
        systemctl start mongod || {
            log_info "Instalando MongoDB..."
            wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
            echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
            apt update && apt install -y mongodb-org
            systemctl enable mongod && systemctl start mongod
        }
    fi
    
    # Nginx
    if ! systemctl is-active --quiet nginx; then
        log_warning "Nginx no está ejecutándose, iniciando..."
        systemctl start nginx || {
            log_info "Instalando Nginx..."
            apt install -y nginx
            systemctl enable nginx && systemctl start nginx
        }
    fi
    
    log_success "Servicios verificados y reparados"
}

# Función para configurar aplicación
setup_app() {
    log_info "📦 Configurando aplicación..."
    
    local APP_DIR="/opt/tractoreando"
    local APP_USER="tractoreando"
    
    # Crear usuario si no existe
    if ! id "$APP_USER" &>/dev/null; then
        useradd -r -s /bin/bash -d "$APP_DIR" "$APP_USER"
    fi
    
    # Crear directorio y copiar archivos
    mkdir -p "$APP_DIR"
    if [[ -f "package.json" ]]; then
        cp -r . "$APP_DIR/"
        chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
    else
        log_error "No se encontró package.json. Ejecuta desde el directorio del proyecto."
        exit 1
    fi
    
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
    
    # Instalar dependencias
    cd "$APP_DIR"
    sudo -u "$APP_USER" npm install
    
    # Construir frontend si existe
    if [[ -d "frontend" ]]; then
        cd frontend
        sudo -u "$APP_USER" npm install
        sudo -u "$APP_USER" npm run build
        cd ..
    fi
    
    log_success "Aplicación configurada"
}

# Función para configurar variables de entorno
setup_env() {
    log_info "⚙️ Configurando variables de entorno..."
    
    local APP_DIR="/opt/tractoreando"
    local APP_USER="tractoreando"
    
    # Generar secretos
    local jwt_secret=$(openssl rand -hex 32)
    local session_secret=$(openssl rand -hex 32)
    
    # Crear .env optimizado
    sudo -u "$APP_USER" tee "$APP_DIR/.env" > /dev/null <<EOF
# CONFIGURACIÓN OPTIMIZADA PARA ACCESO INMEDIATO
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
MONGODB_USE_NEW_URL_PARSER=true
MONGODB_USE_UNIFIED_TOPOLOGY=true

# AUTENTICACIÓN
JWT_SECRET=$jwt_secret
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d
JWT_ALGORITHM=HS256

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
API_VERSION=v1
API_PREFIX=/api

# CORS OPTIMIZADO
CORS_ORIGIN=https://tractoreando.softreria.com
CORS_CREDENTIALS=true
TRUST_PROXY=true
TRUSTED_PROXIES=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16

# ARCHIVOS
UPLOAD_PATH=$APP_DIR/uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx

# LOGGING
LOG_LEVEL=info
LOG_FILE=$APP_DIR/logs/app.log
AUDIT_LOG_ENABLED=true
AUDIT_LOG_PATH=$APP_DIR/logs/audit.log

# CACHE Y RENDIMIENTO
CACHE_ENABLED=true
CACHE_TTL=3600

# RATE LIMITING
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# CONFIGURACIÓN REGIONAL
TZ=Europe/Madrid
I18N_ENABLED=true
I18N_DEFAULT_LOCALE=es
I18N_FALLBACK_LOCALE=en
DEFAULT_CURRENCY=EUR
CURRENCY_SYMBOL=€
DATE_FORMAT=DD/MM/YYYY
TIME_FORMAT=HH:mm
DATETIME_FORMAT=DD/MM/YYYY HH:mm
EOF
    
    # Crear directorios necesarios
    sudo -u "$APP_USER" mkdir -p "$APP_DIR/uploads" "$APP_DIR/logs"
    
    log_success "Variables de entorno configuradas"
}

# Función para configurar Nginx
setup_nginx() {
    log_info "🌐 Configurando Nginx..."
    
    # Configuración optimizada para proxy manager
    tee /etc/nginx/sites-available/tractoreando > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;
    
    # Configuración de cliente
    client_max_body_size 10M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    
    # Servir archivos estáticos del frontend
    location / {
        root /opt/tractoreando/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Headers de seguridad
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        
        # Cache para archivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }
    
    # Proxy para API con configuración robusta
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        
        # Headers esenciales
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        
        # Timeouts optimizados
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_cache_bypass $http_upgrade;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Logs
    access_log /var/log/nginx/tractoreando_access.log;
    error_log /var/log/nginx/tractoreando_error.log;
}
EOF
    
    # Habilitar sitio
    ln -sf /etc/nginx/sites-available/tractoreando /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Verificar y recargar
    nginx -t && systemctl reload nginx
    
    log_success "Nginx configurado"
}

# Función para iniciar aplicación con PM2
start_app() {
    log_info "🚀 Iniciando aplicación con PM2..."
    
    local APP_DIR="/opt/tractoreando"
    local APP_USER="tractoreando"
    
    cd "$APP_DIR"
    
    # Detener aplicación si está ejecutándose
    sudo -u "$APP_USER" pm2 delete tractoreando 2>/dev/null || true
    
    # Iniciar aplicación
    sudo -u "$APP_USER" pm2 start ecosystem.config.js --env production
    
    # Guardar configuración
    sudo -u "$APP_USER" pm2 save
    
    # Configurar arranque automático
    pm2 startup
    
    log_success "Aplicación iniciada con PM2"
}

# Función para verificar todo
verify_everything() {
    log_info "🔍 Verificando que todo funcione..."
    
    sleep 5  # Dar tiempo a que todo se inicie
    
    local errors=0
    
    # Verificar servicios
    for service in mongod nginx; do
        if systemctl is-active --quiet "$service"; then
            log_success "✓ $service está ejecutándose"
        else
            log_error "✗ $service no está ejecutándose"
            ((errors++))
        fi
    done
    
    # Verificar PM2
    if sudo -u tractoreando pm2 list | grep -q "tractoreando.*online"; then
        log_success "✓ Aplicación PM2 está online"
    else
        log_error "✗ Aplicación PM2 no está online"
        ((errors++))
    fi
    
    # Verificar puertos
    for port in 5000 80 27017; do
        if netstat -tlnp | grep -q ":$port "; then
            log_success "✓ Puerto $port está en uso"
        else
            log_error "✗ Puerto $port no está en uso"
            ((errors++))
        fi
    done
    
    # Verificar conectividad
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200\|301\|302"; then
        log_success "✓ Frontend accesible"
    else
        log_error "✗ Frontend no accesible"
        ((errors++))
    fi
    
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 | grep -q "200\|404"; then
        log_success "✓ Backend accesible"
    else
        log_error "✗ Backend no accesible"
        ((errors++))
    fi
    
    return $errors
}

# Función para mostrar información final
show_final_info() {
    local server_ip=$(hostname -I | awk '{print $1}' || echo 'localhost')
    
    echo ""
    echo "🎉 ¡TRACTOREANDO ESTÁ LISTO!"
    echo "============================"
    echo ""
    echo "📍 ACCESO LOCAL:"
    echo "   http://$server_ip"
    echo ""
    echo "🌐 ACCESO PÚBLICO (configurar en Nginx Proxy Manager):"
    echo "   https://tractoreando.softreria.com"
    echo ""
    echo "🔧 CONFIGURACIÓN NGINX PROXY MANAGER:"
    echo "   • Domain Names: tractoreando.softreria.com"
    echo "   • Forward Hostname/IP: $server_ip"
    echo "   • Forward Port: 80"
    echo "   • Cache Assets: ✓"
    echo "   • Block Common Exploits: ✓"
    echo "   • Websockets Support: ✓"
    echo "   • SSL Certificate: Let's Encrypt"
    echo ""
    echo "📊 COMANDOS ÚTILES:"
    echo "   • Ver estado: sudo -u tractoreando pm2 status"
    echo "   • Ver logs: sudo -u tractoreando pm2 logs tractoreando"
    echo "   • Reiniciar: sudo -u tractoreando pm2 restart tractoreando"
    echo "   • Diagnóstico: sudo ./diagnostico-completo.sh"
    echo ""
}

# Función principal
main() {
    log_info "Iniciando proceso de acceso inmediato..."
    
    # Actualizar sistema
    apt update
    
    # Ejecutar todas las funciones
    fix_services
    setup_app
    setup_env
    setup_nginx
    start_app
    
    # Verificar que todo funcione
    if verify_everything; then
        log_success "🎉 ¡TODO CONFIGURADO CORRECTAMENTE!"
        show_final_info
        
        echo "✅ Después de 3 horas, ¡por fin está listo!"
        echo "🚀 Puedes acceder a la aplicación ahora mismo."
        
        exit 0
    else
        log_error "❌ Algunos componentes no están funcionando correctamente"
        log_info "Ejecuta './diagnostico-completo.sh' para más detalles"
        exit 1
    fi
}

# Ejecutar
main "$@"