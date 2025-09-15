#!/bin/bash

# Script para sincronizar cambios entre producción y desarrollo local
# Uso: ./sync-production.sh [pull|push|compare]

PRODUCTION_SERVER="root@192.168.18.13"
PRODUCTION_PATH="/opt/tractoreando"
LOCAL_PATH="."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

function log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

function log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

function compare_files() {
    log_info "Comparando archivos críticos entre local y producción..."
    
    # Archivos críticos a comparar
    CRITICAL_FILES=(
        "server.js"
        "package.json"
        ".env.production"
        "ecosystem.config.js"
    )
    
    for file in "${CRITICAL_FILES[@]}"; do
        log_info "Comparando $file..."
        
        # Crear backup temporal del archivo de producción
        ssh $PRODUCTION_SERVER "cat $PRODUCTION_PATH/$file" > "/tmp/prod_$file" 2>/dev/null
        
        if [ -f "/tmp/prod_$file" ] && [ -f "$LOCAL_PATH/$file" ]; then
            if ! diff -q "$LOCAL_PATH/$file" "/tmp/prod_$file" > /dev/null; then
                log_warning "DIFERENCIA encontrada en $file"
                echo "¿Quieres ver las diferencias? (y/n)"
                read -r response
                if [[ "$response" =~ ^[Yy]$ ]]; then
                    diff "$LOCAL_PATH/$file" "/tmp/prod_$file"
                fi
            else
                log_info "$file está sincronizado"
            fi
        else
            log_error "No se pudo comparar $file"
        fi
        
        # Limpiar archivo temporal
        rm -f "/tmp/prod_$file"
    done
}

function pull_from_production() {
    log_info "Descargando cambios desde producción..."
    
    # Crear directorio de backup
    BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup de archivos locales críticos
    cp server.js "$BACKUP_DIR/" 2>/dev/null
    cp package.json "$BACKUP_DIR/" 2>/dev/null
    cp .env.production "$BACKUP_DIR/" 2>/dev/null
    
    log_info "Backup local creado en $BACKUP_DIR"
    
    # Descargar archivos de producción
    scp $PRODUCTION_SERVER:$PRODUCTION_PATH/server.js ./server.js.prod
    scp $PRODUCTION_SERVER:$PRODUCTION_PATH/package.json ./package.json.prod
    scp $PRODUCTION_SERVER:$PRODUCTION_PATH/.env.production ./.env.production.prod
    
    log_info "Archivos de producción descargados con extensión .prod"
    log_warning "Revisa los archivos .prod y decide qué cambios aplicar manualmente"
}

function push_to_production() {
    log_warning "CUIDADO: Esto sobrescribirá archivos en producción"
    echo "¿Estás seguro de que quieres continuar? (yes/no)"
    read -r response
    
    if [[ "$response" != "yes" ]]; then
        log_info "Operación cancelada"
        return 1
    fi
    
    log_info "Subiendo cambios a producción..."
    
    # Usar el script de deploy existente
    ./deploy.sh
}

# Función principal
case "$1" in
    "compare")
        compare_files
        ;;
    "pull")
        pull_from_production
        ;;
    "push")
        push_to_production
        ;;
    *)
        echo "Uso: $0 [compare|pull|push]"
        echo ""
        echo "  compare  - Compara archivos entre local y producción"
        echo "  pull     - Descarga archivos de producción (con backup)"
        echo "  push     - Sube cambios locales a producción"
        exit 1
        ;;
esac