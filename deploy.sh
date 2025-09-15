#!/bin/bash

# Script de despliegue simplificado para Tractoreando
# Uso: ./deploy.sh [--sync-only] [--no-restart]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNC_SCRIPT="$SCRIPT_DIR/sync-to-production.sh"

# Funciones de utilidad
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar argumentos
SYNC_ONLY=false
NO_RESTART=false

for arg in "$@"; do
    case $arg in
        --sync-only)
            SYNC_ONLY=true
            shift
            ;;
        --no-restart)
            NO_RESTART=true
            shift
            ;;
        --help|-h)
            echo "Uso: $0 [--sync-only] [--no-restart]"
            echo ""
            echo "Opciones:"
            echo "  --sync-only    Solo sincronizar archivos, no reiniciar servicios"
            echo "  --no-restart   Sincronizar y construir, pero no reiniciar PM2"
            echo "  --help, -h     Mostrar esta ayuda"
            exit 0
            ;;
        *)
            log_error "Argumento desconocido: $arg"
            echo "Usa --help para ver las opciones disponibles"
            exit 1
            ;;
    esac
done

# Verificar que el script de sincronización existe
if [ ! -f "$SYNC_SCRIPT" ]; then
    log_error "Script de sincronización no encontrado: $SYNC_SCRIPT"
    exit 1
fi

# Verificar que el script es ejecutable
if [ ! -x "$SYNC_SCRIPT" ]; then
    log_warning "Haciendo ejecutable el script de sincronización..."
    chmod +x "$SYNC_SCRIPT"
fi

log_info "Iniciando despliegue de Tractoreando..."

# Ejecutar sincronización
log_info "Ejecutando sincronización..."
if "$SYNC_SCRIPT"; then
    log_success "Sincronización completada"
else
    log_error "Error durante la sincronización"
    exit 1
fi

if [ "$SYNC_ONLY" = true ]; then
    log_success "Despliegue completado (solo sincronización)"
    exit 0
fi

# Verificar estado del servidor
log_info "Verificando estado del servidor..."
ssh root@192.168.18.13 "cd /opt/tractoreando && pm2 status" || {
    log_warning "PM2 no está configurado o no está ejecutándose"
    log_info "Para configurar PM2, ejecuta:"
    echo "ssh root@192.168.18.13 'cd /opt/tractoreando && pm2 start ecosystem.config.js --env production'"
}

if [ "$NO_RESTART" = false ]; then
    log_info "Reiniciando aplicación..."
    ssh root@192.168.18.13 "cd /opt/tractoreando && pm2 restart tractoreando" || {
        log_warning "No se pudo reiniciar con PM2, intentando inicio manual..."
        ssh root@192.168.18.13 "cd /opt/tractoreando && pm2 start ecosystem.config.js --env production"
    }
fi

log_success "¡Despliegue completado exitosamente!"
log_info "Para verificar el estado:"
echo "ssh root@192.168.18.13 'cd /opt/tractoreando && pm2 status && pm2 logs tractoreando --lines 10'"