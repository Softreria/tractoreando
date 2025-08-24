#!/bin/bash

# Script para limpiar el proyecto antes de subirlo a Git
# Elimina archivos temporales y reduce el tamaño del repositorio

set -e

echo "🧹 Limpiando proyecto para Git..."
echo "================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Función para obtener tamaño de directorio
get_size() {
    if [[ -d "$1" ]]; then
        du -sh "$1" 2>/dev/null | cut -f1
    else
        echo "0B"
    fi
}

# Mostrar tamaño inicial
log_info "Tamaño inicial del proyecto:"
echo "   • Directorio raíz: $(get_size .)"
echo "   • node_modules: $(get_size node_modules)"
echo "   • frontend/node_modules: $(get_size frontend/node_modules)"
echo "   • frontend/build: $(get_size frontend/build)"
echo ""

# Limpiar node_modules
log_info "Eliminando node_modules..."
if [[ -d "node_modules" ]]; then
    rm -rf node_modules
    log_success "node_modules eliminado"
else
    log_warning "node_modules no encontrado"
fi

if [[ -d "frontend/node_modules" ]]; then
    rm -rf frontend/node_modules
    log_success "frontend/node_modules eliminado"
else
    log_warning "frontend/node_modules no encontrado"
fi

# Limpiar archivos de build
log_info "Eliminando archivos de build..."
if [[ -d "frontend/build" ]]; then
    rm -rf frontend/build
    log_success "frontend/build eliminado"
fi

if [[ -d "frontend/dist" ]]; then
    rm -rf frontend/dist
    log_success "frontend/dist eliminado"
fi

if [[ -d "build" ]]; then
    rm -rf build
    log_success "build eliminado"
fi

if [[ -d "dist" ]]; then
    rm -rf dist
    log_success "dist eliminado"
fi

# Limpiar logs
log_info "Eliminando archivos de log..."
find . -name "*.log" -type f -delete 2>/dev/null || true
find . -name "npm-debug.log*" -type f -delete 2>/dev/null || true
find . -name "yarn-debug.log*" -type f -delete 2>/dev/null || true
find . -name "yarn-error.log*" -type f -delete 2>/dev/null || true
log_success "Logs eliminados"

# Limpiar archivos temporales
log_info "Eliminando archivos temporales..."
find . -name "*.tmp" -type f -delete 2>/dev/null || true
find . -name "*.temp" -type f -delete 2>/dev/null || true
find . -name "*~" -type f -delete 2>/dev/null || true
log_success "Archivos temporales eliminados"

# Limpiar archivos de sistema
log_info "Eliminando archivos de sistema..."
find . -name ".DS_Store" -type f -delete 2>/dev/null || true
find . -name ".DS_Store?" -type f -delete 2>/dev/null || true
find . -name "._*" -type f -delete 2>/dev/null || true
find . -name "Thumbs.db" -type f -delete 2>/dev/null || true
find . -name "ehthumbs.db" -type f -delete 2>/dev/null || true
log_success "Archivos de sistema eliminados"

# Limpiar cache
log_info "Eliminando archivos de cache..."
if [[ -d ".cache" ]]; then
    rm -rf .cache
    log_success ".cache eliminado"
fi

if [[ -d ".parcel-cache" ]]; then
    rm -rf .parcel-cache
    log_success ".parcel-cache eliminado"
fi

if [[ -d "coverage" ]]; then
    rm -rf coverage
    log_success "coverage eliminado"
fi

if [[ -d ".nyc_output" ]]; then
    rm -rf .nyc_output
    log_success ".nyc_output eliminado"
fi

# Mostrar tamaño final
echo ""
log_info "Tamaño final del proyecto:"
echo "   • Directorio raíz: $(get_size .)"
echo ""

log_success "¡Proyecto limpiado exitosamente!"
echo ""
log_info "Pasos siguientes:"
echo "   1. Verificar que .gitignore esté actualizado"
echo "   2. Hacer commit de los cambios"
echo "   3. Subir al repositorio Git"
echo "   4. En el servidor, ejecutar 'npm install' para restaurar dependencias"
echo ""
log_warning "Recuerda: Después de clonar el repositorio, ejecuta 'npm run install:all' para instalar todas las dependencias"