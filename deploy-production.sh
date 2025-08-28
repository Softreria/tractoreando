#!/bin/bash

# Script de deployment para Tractoreando en producción
# Este script automatiza el proceso completo de despliegue

set -e  # Salir si cualquier comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ] || [ ! -f "server.js" ]; then
    log_error "Este script debe ejecutarse desde el directorio raíz del proyecto Tractoreando"
    exit 1
fi

log "🚀 Iniciando deployment de Tractoreando en producción..."

# 1. Verificar dependencias del sistema
log "📋 Verificando dependencias del sistema..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js no está instalado"
    exit 1
fi

# Verificar npm
if ! command -v npm &> /dev/null; then
    log_error "npm no está instalado"
    exit 1
fi

# Verificar PM2
if ! command -v pm2 &> /dev/null; then
    log_warning "PM2 no está instalado. Instalando..."
    npm install -g pm2
fi

# Verificar MongoDB
if ! pgrep -x "mongod" > /dev/null; then
    log_warning "MongoDB no está ejecutándose. Iniciando..."
    brew services start mongodb/brew/mongodb-community
    sleep 5
fi

log_success "Dependencias verificadas"

# 2. Backup de la base de datos
log "💾 Creando backup de la base de datos..."
mkdir -p ./backups
BACKUP_FILE="./backups/tractoreando_backup_$(date +%Y%m%d_%H%M%S).gz"
mongodump --db tractoreando_prod --gzip --archive="$BACKUP_FILE" 2>/dev/null || {
    log_warning "No se pudo crear backup (la base de datos podría no existir aún)"
}

if [ -f "$BACKUP_FILE" ]; then
    log_success "Backup creado: $BACKUP_FILE"
fi

# 3. Instalar dependencias del backend
log "📦 Instalando dependencias del backend..."
npm ci --production
log_success "Dependencias del backend instaladas"

# 4. Construir el frontend
log "🏗️ Construyendo el frontend..."
cd frontend
npm install
npm run build
cd ..
log_success "Frontend construido exitosamente"

# 5. Crear directorios necesarios
log "📁 Creando directorios necesarios..."
mkdir -p logs uploads
log_success "Directorios creados"

# 6. Configurar permisos
log "🔐 Configurando permisos..."
chmod +x *.sh 2>/dev/null || true
log_success "Permisos configurados"

# 7. Detener procesos existentes
log "🛑 Deteniendo procesos existentes..."
pm2 stop tractoreando-backend 2>/dev/null || true
pm2 delete tractoreando-backend 2>/dev/null || true
log_success "Procesos existentes detenidos"

# 8. Iniciar la aplicación con PM2
log "🚀 Iniciando aplicación con PM2..."
pm2 start ecosystem.config.js --env production
pm2 save
log_success "Aplicación iniciada con PM2"

# 9. Verificar que la aplicación está funcionando
log "🔍 Verificando que la aplicación está funcionando..."
sleep 10

# Verificar que PM2 está ejecutando la aplicación
if pm2 list | grep -q "tractoreando-backend.*online"; then
    log_success "✅ Aplicación ejecutándose correctamente en PM2"
else
    log_error "❌ Error: La aplicación no está ejecutándose en PM2"
    pm2 logs tractoreando-backend --lines 20
    exit 1
fi

# Verificar que el puerto está escuchando
if lsof -i :3002 > /dev/null 2>&1; then
    log_success "✅ Aplicación escuchando en puerto 3002"
else
    log_error "❌ Error: La aplicación no está escuchando en el puerto 3002"
    exit 1
fi

# 10. Mostrar información de deployment
log "📊 Información del deployment:"
echo ""
echo "🎉 ¡Deployment completado exitosamente!"
echo "================================================="
echo "Aplicación: Tractoreando"
echo "Puerto: 3002"
echo "Estado PM2: $(pm2 list | grep tractoreando-backend | awk '{print $10}')"
echo "Logs: pm2 logs tractoreando-backend"
echo "Monitoreo: pm2 monit"
echo "================================================="
echo "Próximos pasos:"
echo "1. Configurar Nginx para servir el frontend"
echo "2. Configurar SSL/HTTPS"
echo "3. Configurar firewall"
echo "4. Configurar monitoreo"
echo "================================================="

log_success "🚀 Deployment de producción completado exitosamente"