#!/bin/bash

# Script para corregir rutas duplicadas /api/api en producción
# Autor: Sistema de automatización
# Fecha: $(date)

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
    echo -e "${GREEN}[ÉXITO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[ADVERTENCIA]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar si estamos en el directorio correcto
if [ ! -f "package.json" ] || [ ! -d "frontend" ]; then
    log_error "Este script debe ejecutarse desde el directorio raíz del proyecto Tractoreando"
    exit 1
fi

log "=== INICIANDO CORRECCIÓN DE RUTAS API EN PRODUCCIÓN ==="

# 1. Hacer backup del estado actual
log "Creando backup del estado actual..."
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r frontend/src "$BACKUP_DIR/frontend_src_backup"
log_success "Backup creado en $BACKUP_DIR"

# 2. Actualizar código desde repositorio
log "Actualizando código desde repositorio..."
git fetch origin
git pull origin main
log_success "Código actualizado desde repositorio"

# 3. Verificar que los cambios están aplicados
log "Verificando correcciones en archivos..."

# Verificar api.js
if grep -q "'/api/auth/login'" frontend/src/utils/api.js; then
    log_error "Las rutas duplicadas aún existen en api.js"
    log "Aplicando corrección manual..."
    
    # Aplicar correcciones si no están aplicadas
    sed -i.bak "s|'/api/auth/|'/auth/|g" frontend/src/utils/api.js
    sed -i.bak "s|'/api/companies|'/companies|g" frontend/src/utils/api.js
    sed -i.bak "s|'/api/branches|'/branches|g" frontend/src/utils/api.js
    sed -i.bak "s|'/api/vehicles|'/vehicles|g" frontend/src/utils/api.js
    sed -i.bak "s|'/api/maintenance|'/maintenance|g" frontend/src/utils/api.js
    sed -i.bak "s|'/api/users|'/users|g" frontend/src/utils/api.js
    sed -i.bak "s|'/api/reports|'/reports|g" frontend/src/utils/api.js
    sed -i.bak "s|'/api/settings|'/settings|g" frontend/src/utils/api.js
    sed -i.bak "s|'/api/notifications|'/notifications|g" frontend/src/utils/api.js
    sed -i.bak "s|'/api/files|'/files|g" frontend/src/utils/api.js
    
    log_success "Correcciones aplicadas en api.js"
else
    log_success "Las correcciones ya están aplicadas en api.js"
fi

# Verificar archivos de páginas
for file in frontend/src/pages/Settings.js frontend/src/pages/Branches.js frontend/src/pages/Companies.js frontend/src/pages/Profile.js; do
    if [ -f "$file" ] && grep -q "'/api/" "$file"; then
        log "Corrigiendo rutas en $(basename $file)..."
        sed -i.bak "s|'/api/|'/|g" "$file"
        log_success "Correcciones aplicadas en $(basename $file)"
    fi
done

# 4. Instalar dependencias del frontend
log "Instalando dependencias del frontend..."
cd frontend
npm ci --production
log_success "Dependencias instaladas"

# 5. Construir frontend para producción
log "Construyendo frontend para producción..."
npm run build
if [ $? -eq 0 ]; then
    log_success "Frontend construido exitosamente"
else
    log_error "Error al construir el frontend"
    exit 1
fi

cd ..

# 6. Instalar dependencias del backend
log "Instalando dependencias del backend..."
npm ci --production
log_success "Dependencias del backend instaladas"

# 7. Reiniciar servicios con PM2 (si está disponible)
if command -v pm2 &> /dev/null; then
    log "Reiniciando aplicación con PM2..."
    pm2 restart tractoreando || pm2 start ecosystem.config.js
    log_success "Aplicación reiniciada con PM2"
else
    log_warning "PM2 no encontrado. Debes reiniciar manualmente el servidor."
fi

# 8. Verificar que el servidor esté funcionando
log "Verificando estado del servidor..."
sleep 5

# Verificar si el puerto está en uso
if lsof -i :8000 &> /dev/null; then
    log_success "Servidor ejecutándose en puerto 8000"
else
    log_warning "No se detecta servidor en puerto 8000"
fi

# 9. Probar endpoint de salud
log "Probando endpoint de salud..."
if command -v curl &> /dev/null; then
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health || echo "000")
    if [ "$HEALTH_RESPONSE" = "200" ]; then
        log_success "Endpoint de salud responde correctamente (200)"
    else
        log_warning "Endpoint de salud responde con código: $HEALTH_RESPONSE"
    fi
else
    log_warning "curl no disponible para probar endpoint"
fi

# 10. Limpiar archivos de backup de sed
log "Limpiando archivos temporales..."
find . -name "*.bak" -delete
log_success "Archivos temporales eliminados"

log "=== CORRECCIÓN COMPLETADA ==="
log_success "La corrección de rutas API ha sido aplicada exitosamente"
log "Backup disponible en: $BACKUP_DIR"
log "\nPróximos pasos:"
log "1. Verificar que la aplicación funcione correctamente"
log "2. Probar el login en la interfaz web"
log "3. Si todo funciona, eliminar el backup: rm -rf $BACKUP_DIR"
log "\nSi hay problemas, restaurar desde backup:"
log "cp -r $BACKUP_DIR/frontend_src_backup/* frontend/src/"
log "cd frontend && npm run build"

echo
log_success "¡Script completado exitosamente!"