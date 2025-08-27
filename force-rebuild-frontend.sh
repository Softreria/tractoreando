#!/bin/bash

# Script para forzar la reconstrucción del frontend en producción
# Resuelve el problema de rutas duplicadas /api/api

set -e

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
APP_DIR="/opt/tractoreando"
APP_USER="tractoreando"
BACKUP_DIR="$APP_DIR/backups"
DATE=$(date +"%Y%m%d_%H%M%S")

echo "================================================"
echo "🔄 FORZAR RECONSTRUCCIÓN DEL FRONTEND"
echo "================================================"
echo "Fecha: $(date)"
echo "Directorio: $APP_DIR"
echo "Usuario: $APP_USER"
echo "================================================"
echo ""

# Verificar que estamos en el directorio correcto
if [[ ! -f "$APP_DIR/package.json" ]]; then
    log_error "No se encontró package.json en $APP_DIR"
    log_error "Asegúrate de que el script se ejecute desde el directorio correcto"
    exit 1
fi

# Crear directorio de backup si no existe
log_info "Creando directorio de backup..."
mkdir -p "$BACKUP_DIR"

# Backup del build actual
log_info "Creando backup del build actual..."
if [[ -d "$APP_DIR/frontend/build" ]]; then
    sudo -u "$APP_USER" tar -czf "$BACKUP_DIR/frontend-build-backup-$DATE.tar.gz" -C "$APP_DIR/frontend" build/
    log_success "Backup creado: frontend-build-backup-$DATE.tar.gz"
else
    log_warning "No se encontró directorio build existente"
fi

# Detener la aplicación
log_info "Deteniendo aplicación..."
sudo -u "$APP_USER" pm2 stop all || true

# Limpiar completamente el build anterior
log_info "Limpiando build anterior..."
if [[ -d "$APP_DIR/frontend/build" ]]; then
    sudo -u "$APP_USER" rm -rf "$APP_DIR/frontend/build"
    log_success "Build anterior eliminado"
fi

# Limpiar node_modules del frontend
log_info "Limpiando node_modules del frontend..."
if [[ -d "$APP_DIR/frontend/node_modules" ]]; then
    sudo -u "$APP_USER" rm -rf "$APP_DIR/frontend/node_modules"
    log_success "node_modules del frontend eliminado"
fi

# Limpiar cache de npm
log_info "Limpiando cache de npm..."
sudo -u "$APP_USER" npm cache clean --force

# Reinstalar dependencias del frontend
log_info "Reinstalando dependencias del frontend..."
cd "$APP_DIR/frontend"
sudo -u "$APP_USER" npm install
log_success "Dependencias del frontend reinstaladas"

# Verificar archivo .env.production
log_info "Verificando configuración de producción..."
if [[ -f "$APP_DIR/frontend/.env.production" ]]; then
    log_info "Contenido de .env.production:"
    cat "$APP_DIR/frontend/.env.production"
else
    log_warning "No se encontró .env.production, creando uno básico..."
    sudo -u "$APP_USER" tee "$APP_DIR/frontend/.env.production" > /dev/null <<EOF
# Variables de entorno para producción - Frontend Tractoreando
REACT_APP_API_URL=https://tractoreando.softreria.com/api
REACT_APP_ENV=production
GENERATE_SOURCEMAP=false
EOF
    log_success "Archivo .env.production creado"
fi

# Construir frontend con configuración de producción
log_info "Construyendo frontend para producción..."
cd "$APP_DIR/frontend"
sudo -u "$APP_USER" NODE_ENV=production npm run build

if [[ $? -eq 0 ]]; then
    log_success "Frontend construido exitosamente"
else
    log_error "Error al construir el frontend"
    
    # Restaurar backup si existe
    if [[ -f "$BACKUP_DIR/frontend-build-backup-$DATE.tar.gz" ]]; then
        log_info "Restaurando backup anterior..."
        cd "$APP_DIR/frontend"
        sudo -u "$APP_USER" tar -xzf "$BACKUP_DIR/frontend-build-backup-$DATE.tar.gz"
        log_warning "Backup restaurado"
    fi
    
    exit 1
fi

# Verificar que el build se creó correctamente
if [[ ! -d "$APP_DIR/frontend/build" ]]; then
    log_error "El directorio build no se creó correctamente"
    exit 1
fi

# Verificar archivos críticos
log_info "Verificando archivos del build..."
if [[ -f "$APP_DIR/frontend/build/index.html" ]]; then
    log_success "index.html encontrado"
else
    log_error "index.html no encontrado en el build"
    exit 1
fi

# Buscar archivos JS principales
JS_FILES=$(find "$APP_DIR/frontend/build/static/js" -name "main.*.js" 2>/dev/null | wc -l)
if [[ $JS_FILES -gt 0 ]]; then
    log_success "Archivos JavaScript encontrados: $JS_FILES"
    
    # Verificar que no contengan rutas duplicadas
    log_info "Verificando rutas duplicadas en archivos JS..."
    DUPLICATE_ROUTES=$(find "$APP_DIR/frontend/build/static/js" -name "*.js" -exec grep -l "/api/api" {} \; 2>/dev/null | wc -l)
    
    if [[ $DUPLICATE_ROUTES -gt 0 ]]; then
        log_error "¡ATENCIÓN! Se encontraron rutas duplicadas /api/api en $DUPLICATE_ROUTES archivos"
        log_error "El problema persiste. Revisa la configuración del frontend."
        exit 1
    else
        log_success "No se encontraron rutas duplicadas /api/api"
    fi
else
    log_error "No se encontraron archivos JavaScript en el build"
    exit 1
fi

# Reiniciar aplicación
log_info "Reiniciando aplicación..."
cd "$APP_DIR"
sudo -u "$APP_USER" pm2 start ecosystem.config.js

# Esperar a que la aplicación se inicie
log_info "Esperando a que la aplicación se inicie..."
sleep 10

# Verificar estado de PM2
log_info "Verificando estado de la aplicación..."
PM2_STATUS=$(sudo -u "$APP_USER" pm2 list | grep "online" | wc -l)
if [[ $PM2_STATUS -gt 0 ]]; then
    log_success "Aplicación ejecutándose correctamente"
else
    log_error "La aplicación no se inició correctamente"
    sudo -u "$APP_USER" pm2 logs --lines 20
    exit 1
fi

# Test de conectividad
log_info "Probando conectividad..."
if command -v curl &> /dev/null; then
    # Probar endpoint de salud
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health || echo "000")
    
    if [[ $HTTP_STATUS == "200" ]]; then
        log_success "API respondiendo correctamente (HTTP $HTTP_STATUS)"
    else
        log_warning "API no responde correctamente (HTTP $HTTP_STATUS)"
    fi
else
    log_warning "curl no disponible, saltando test de conectividad"
fi

# Limpiar backups antiguos (mantener solo los últimos 5)
log_info "Limpiando backups antiguos..."
find "$BACKUP_DIR" -name "frontend-build-backup-*.tar.gz" -type f -mtime +7 -delete 2>/dev/null || true

echo ""
echo "================================================"
echo "✅ RECONSTRUCCIÓN COMPLETADA"
echo "================================================"
echo "📅 Fecha: $(date)"
echo "📁 Build ubicado en: $APP_DIR/frontend/build/"
echo "💾 Backup guardado en: $BACKUP_DIR/frontend-build-backup-$DATE.tar.gz"
echo "🌐 URL: https://tractoreando.softreria.com"
echo ""
echo "🔍 PRÓXIMOS PASOS:"
echo "1. Probar el login en: https://tractoreando.softreria.com"
echo "2. Verificar que no aparezcan errores /api/api en la consola"
echo "3. Si persisten problemas, revisar logs: sudo -u $APP_USER pm2 logs"
echo ""
log_success "¡Reconstrucción del frontend completada exitosamente!"