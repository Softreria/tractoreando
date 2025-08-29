#!/bin/bash

# Script para limpiar repositorios de MongoDB del sistema
# Ejecutar antes de install.sh si hay problemas con repositorios de MongoDB

set -e

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

echo "🧹 Limpieza de Repositorios MongoDB"
echo "==================================="
echo "Fecha: $(date)"
echo "Usuario: $(whoami)"
echo ""

# Verificar permisos sudo
if ! sudo -n true 2>/dev/null; then
    log_error "Este script requiere permisos sudo"
    exit 1
fi

# Función para limpiar repositorios de MongoDB
clean_mongodb_repos() {
    log_info "Limpiando repositorios de MongoDB..."
    
    # Eliminar archivos de lista de repositorios de MongoDB
    if [[ -f "/etc/apt/sources.list.d/mongodb-org-6.0.list" ]]; then
        sudo rm -f /etc/apt/sources.list.d/mongodb-org-6.0.list
        log_success "Eliminado: mongodb-org-6.0.list"
    fi
    
    if [[ -f "/etc/apt/sources.list.d/mongodb-org.list" ]]; then
        sudo rm -f /etc/apt/sources.list.d/mongodb-org.list
        log_success "Eliminado: mongodb-org.list"
    fi
    
    # Buscar y eliminar cualquier otro archivo de MongoDB
    find /etc/apt/sources.list.d/ -name "*mongo*" -type f 2>/dev/null | while read -r file; do
        if [[ -f "$file" ]]; then
            sudo rm -f "$file"
            log_success "Eliminado: $(basename "$file")"
        fi
    done
    
    # Limpiar claves GPG de MongoDB
    log_info "Limpiando claves GPG de MongoDB..."
    
    # Eliminar claves de MongoDB si existen
    sudo apt-key del 4B7C549A058F8B6B 2>/dev/null || true
    sudo apt-key del 656408E390CFB1F5 2>/dev/null || true
    
    # Limpiar del sources.list principal
    if grep -q "repo.mongodb.org" /etc/apt/sources.list 2>/dev/null; then
        log_info "Eliminando entradas de MongoDB del sources.list principal..."
        sudo sed -i '/repo\.mongodb\.org/d' /etc/apt/sources.list
        log_success "Entradas de MongoDB eliminadas del sources.list"
    fi
    
    log_success "Repositorios de MongoDB limpiados"
}

# Función para actualizar lista de paquetes
update_package_list() {
    log_info "Actualizando lista de paquetes..."
    
    if sudo apt-get update; then
        log_success "Lista de paquetes actualizada correctamente"
    else
        log_warning "Hubo algunos errores al actualizar, pero continuando..."
    fi
}

# Función principal
main() {
    log_info "Iniciando limpieza de repositorios MongoDB..."
    
    # Verificar sistema operativo
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        log_error "Este script está diseñado para sistemas Linux"
        exit 1
    fi
    
    # Ejecutar limpieza
    clean_mongodb_repos
    update_package_list
    
    echo ""
    log_success "🎉 ¡Limpieza completada!"
    log_info "Ahora puedes ejecutar ./install.sh sin problemas de repositorios MongoDB"
    echo ""
}

# Ejecutar función principal
main "$@"