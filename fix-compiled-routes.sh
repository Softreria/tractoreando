#!/bin/bash

# Script para corregir rutas duplicadas /api/api directamente en archivos compilados
# Uso: ./fix-compiled-routes.sh

set -e

APP_DIR="$(pwd)"
LOG_FILE="$APP_DIR/fix-compiled-routes.log"
BUILD_DIR="$APP_DIR/frontend/build"
BACKUP_DIR="$APP_DIR/backup-build-$(date +%Y%m%d_%H%M%S)"

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1" | tee -a "$LOG_FILE"
}

log "=== INICIANDO CORRECCIÓN DE RUTAS COMPILADAS ==="

# Verificar que existe el directorio build
if [ ! -d "$BUILD_DIR" ]; then
    log_error "No se encontró el directorio build: $BUILD_DIR"
    exit 1
fi

# Crear backup del build actual
log "Creando backup del build actual..."
cp -r "$BUILD_DIR" "$BACKUP_DIR"
log_success "Backup creado en: $BACKUP_DIR"

# Buscar archivos JS con rutas duplicadas
log "Buscando archivos JS con rutas /api/api..."
JS_FILES=$(find "$BUILD_DIR/static/js" -name "*.js" -exec grep -l "/api/api" {} \; 2>/dev/null || true)

if [ -z "$JS_FILES" ]; then
    log_success "No se encontraron rutas duplicadas /api/api"
    rm -rf "$BACKUP_DIR"
    exit 0
fi

log "Archivos con rutas duplicadas encontrados:"
echo "$JS_FILES" | tee -a "$LOG_FILE"

# Corregir cada archivo
for file in $JS_FILES; do
    log "Corrigiendo archivo: $file"
    
    # Crear backup del archivo específico
    cp "$file" "${file}.backup"
    
    # Reemplazar /api/api con /api usando sed
    sed -i.tmp 's|\/api\/api|\/api|g' "$file"
    rm -f "${file}.tmp"
    
    # Verificar que el cambio se aplicó
    if grep -q "/api/api" "$file"; then
        log_error "Falló la corrección en: $file"
        # Restaurar desde backup
        cp "${file}.backup" "$file"
    else
        log_success "Corregido: $file"
        rm -f "${file}.backup"
    fi
done

# Verificación final
log "Verificación final..."
REMAINING=$(find "$BUILD_DIR/static/js" -name "*.js" -exec grep -l "/api/api" {} \; 2>/dev/null | wc -l)

if [ "$REMAINING" -eq 0 ]; then
    log_success "¡Todas las rutas duplicadas han sido corregidas!"
    log "Eliminando backup..."
    rm -rf "$BACKUP_DIR"
    
    # Reiniciar servicios si PM2 está disponible
    if command -v pm2 >/dev/null 2>&1; then
        log "Reiniciando aplicación con PM2..."
        pm2 restart all || log_error "Error al reiniciar PM2"
    fi
    
    log_success "=== CORRECCIÓN COMPLETADA EXITOSAMENTE ==="
else
    log_error "Aún quedan $REMAINING archivos con rutas duplicadas"
    log "Restaurando desde backup..."
    rm -rf "$BUILD_DIR"
    mv "$BACKUP_DIR" "$BUILD_DIR"
    exit 1
fi

log "Logs guardados en: $LOG_FILE"
log "Para verificar, ejecuta: grep -r '/api/api' frontend/build/static/js/ || echo 'Sin rutas duplicadas'"