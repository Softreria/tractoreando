#!/bin/bash

# Script de Deployment para Tractoreando con Nginx Proxy Manager
# Este script configura la aplicación para funcionar detrás de Nginx Proxy Manager

set -e

echo "🚀 Iniciando deployment para Nginx Proxy Manager..."
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

# Verificar dependencias del sistema
log_info "Verificando dependencias del sistema..."

if ! command -v node &> /dev/null; then
    log_error "Node.js no está instalado"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "npm no está instalado"
    exit 1
fi

if ! command -v pm2 &> /dev/null; then
    log_error "PM2 no está instalado. Instálalo con: npm install -g pm2"
    exit 1
fi

if ! command -v nginx &> /dev/null; then
    log_error "Nginx no está instalado"
    exit 1
fi

if ! pgrep -x "mongod" > /dev/null; then
    log_warning "MongoDB no parece estar ejecutándose"
    log_info "Iniciando MongoDB..."
    brew services start mongodb-community || {
        log_error "No se pudo iniciar MongoDB"
        exit 1
    }
fi

log_success "Todas las dependencias están disponibles"

# Crear backup de la base de datos
log_info "Creando backup de la base de datos..."
mkdir -p backups
BACKUP_FILE="backups/tractoreando_backup_$(date +%Y%m%d_%H%M%S).gz"
mongodump --db tractoreando --gzip --archive="$BACKUP_FILE" 2>/dev/null || {
    log_warning "No se pudo crear el backup de la base de datos (puede que no exista aún)"
}

if [ -f "$BACKUP_FILE" ]; then
    log_success "Backup creado: $BACKUP_FILE"
fi

# Instalar dependencias del backend
log_info "Instalando dependencias del backend..."
npm install --production
log_success "Dependencias del backend instaladas"

# Build del frontend
log_info "Construyendo el frontend para producción..."
cd frontend
npm install
npm run build
cd ..
log_success "Frontend construido exitosamente"

# Crear directorios necesarios
log_info "Creando directorios necesarios..."
sudo mkdir -p /opt/homebrew/var/log/nginx
log_success "Directorios creados"

# Configurar permisos
log_info "Configurando permisos..."
sudo chmod 755 /Users/davidhernandezlujan
sudo chmod 755 /Users/davidhernandezlujan/Documents
sudo chmod 755 /Users/davidhernandezlujan/Documents/tractoreando
sudo chmod 755 /Users/davidhernandezlujan/Documents/tractoreando/frontend
sudo chmod -R 755 /Users/davidhernandezlujan/Documents/tractoreando/frontend/build
log_success "Permisos configurados"

# Parar procesos existentes
log_info "Parando procesos existentes..."

# Parar Nginx si está ejecutándose
if pgrep -x "nginx" > /dev/null; then
    log_info "Parando Nginx..."
    sudo nginx -s stop 2>/dev/null || true
    sleep 2
fi

# Parar aplicación PM2 existente
if pm2 list | grep -q "tractoreando-backend"; then
    log_info "Parando aplicación PM2 existente..."
    pm2 stop tractoreando-backend 2>/dev/null || true
    pm2 delete tractoreando-backend 2>/dev/null || true
fi

log_success "Procesos existentes parados"

# Iniciar aplicación con PM2
log_info "Iniciando aplicación con PM2..."
pm2 start ecosystem.config.js --env production
log_success "Aplicación iniciada con PM2"

# Verificar configuración de Nginx
log_info "Verificando configuración de Nginx para Proxy Manager..."
nginx -t -c /Users/davidhernandezlujan/Documents/tractoreando/nginx-proxy-manager.conf
log_success "Configuración de Nginx válida"

# Iniciar Nginx con configuración para Proxy Manager
log_info "Iniciando Nginx con configuración para Proxy Manager..."
sudo nginx -c /Users/davidhernandezlujan/Documents/tractoreando/nginx-proxy-manager.conf
log_success "Nginx iniciado en puerto 3001"

# Verificar que la aplicación esté funcionando
log_info "Verificando aplicación..."

# Verificar PM2
if pm2 list | grep -q "online.*tractoreando-backend"; then
    log_success "✅ PM2: tractoreando-backend está online"
else
    log_error "❌ PM2: tractoreando-backend no está online"
    pm2 logs tractoreando-backend --lines 10
    exit 1
fi

# Verificar que el puerto 3002 esté escuchando (backend)
if lsof -i :3002 > /dev/null 2>&1; then
    log_success "✅ Backend escuchando en puerto 3002"
else
    log_error "❌ Backend no está escuchando en puerto 3002"
    exit 1
fi

# Verificar que el puerto 3001 esté escuchando (nginx para proxy manager)
if lsof -i :3001 > /dev/null 2>&1; then
    log_success "✅ Nginx escuchando en puerto 3001 (para Proxy Manager)"
else
    log_error "❌ Nginx no está escuchando en puerto 3001"
    exit 1
fi

# Verificar conectividad interna
log_info "Verificando conectividad interna..."
if curl -s -f http://localhost:3001/nginx-health > /dev/null; then
    log_success "✅ Health check interno exitoso"
else
    log_error "❌ Health check interno falló"
    exit 1
fi

echo ""
echo "🎉 ¡Deployment completado exitosamente!"
echo "================================================"
echo ""
echo "📋 Información del Deployment:"
echo "   • Aplicación: tractoreando-backend"
echo "   • Puerto interno Nginx: 3001 (para Proxy Manager)"
echo "   • Puerto backend: 3002"
echo "   • Estado PM2: $(pm2 list | grep tractoreando-backend | awk '{print $10}')"
echo "   • Configuración: nginx-proxy-manager.conf"
echo ""
echo "🔧 Configuración en Nginx Proxy Manager:"
echo "   • Scheme: http"
echo "   • Forward Hostname/IP: localhost (o IP del servidor)"
echo "   • Forward Port: 3001"
echo "   • Block Common Exploits: ✅"
echo "   • Websockets Support: ✅"
echo ""
echo "📊 Comandos útiles:"
echo "   • Ver estado PM2: pm2 status"
echo "   • Ver logs PM2: pm2 logs tractoreando-backend"
echo "   • Ver logs Nginx: tail -f /opt/homebrew/var/log/nginx/tractoreando_proxy_error.log"
echo "   • Monitoreo PM2: pm2 monit"
echo ""
echo "🔗 Endpoints internos:"
echo "   • Health check: http://localhost:3001/nginx-health"
echo "   • API: http://localhost:3001/api/"
echo "   • Frontend: http://localhost:3001/"
echo ""
echo "⚠️  Recuerda configurar tu dominio en Nginx Proxy Manager apuntando al puerto 3001"
echo ""