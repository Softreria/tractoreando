#!/bin/bash

# Script para limpiar repositorios de MongoDB y reinstalar
# Uso: ./fix-mongodb-repo.sh

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

echo "🔧 Tractoreando - Reparación de Repositorio MongoDB"
echo "================================================="
echo "Fecha: $(date)"
echo ""

# Verificar si somos root o tenemos sudo
if [[ $EUID -eq 0 ]]; then
    SUDO_CMD=""
else
    SUDO_CMD="sudo"
fi

# Función para limpiar repositorios de MongoDB
clean_mongodb_repos() {
    log_info "Limpiando repositorios de MongoDB existentes..."
    
    # Eliminar archivos de lista de MongoDB
    $SUDO_CMD rm -f /etc/apt/sources.list.d/mongodb-org-*.list
    
    # Eliminar claves GPG de MongoDB
    $SUDO_CMD apt-key del $(apt-key list | grep -A1 "MongoDB" | grep "pub" | awk '{print $2}' | cut -d'/' -f2) 2>/dev/null || true
    
    log_success "Repositorios de MongoDB limpiados"
}

# Función para reinstalar MongoDB con repositorio correcto
reinstall_mongodb() {
    log_info "Reinstalando MongoDB con repositorio correcto..."
    
    # Detectar versión de Ubuntu
    UBUNTU_VERSION=$(lsb_release -rs)
    UBUNTU_CODENAME=$(lsb_release -cs)
    MONGO_VERSION="6.0"
    
    log_info "Detectado: Ubuntu $UBUNTU_VERSION ($UBUNTU_CODENAME)"
    
    # Instalar libssl1.1 si es necesario (para Ubuntu 22.04+)
    if [[ "$UBUNTU_VERSION" > "20.04" ]]; then
        log_info "Instalando libssl1.1 para compatibilidad con MongoDB..."
        wget -q http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb
        $SUDO_CMD dpkg -i libssl1.1_1.1.1f-1ubuntu2_amd64.deb 2>/dev/null || true
        rm -f libssl1.1_1.1.1f-1ubuntu2_amd64.deb
    fi
    
    # Importar clave pública de MongoDB
    log_info "Importando clave GPG de MongoDB..."
    wget -qO - https://www.mongodb.org/static/pgp/server-${MONGO_VERSION}.asc | $SUDO_CMD apt-key add -
    
    # Usar el codename correcto para el repositorio
    case "$UBUNTU_CODENAME" in
        "jammy")
            # Ubuntu 22.04 - usar focal como fallback
            REPO_CODENAME="focal"
            ;;
        "noble")
            # Ubuntu 24.04 - usar noble
            REPO_CODENAME="noble"
            ;;
        "oracular"|"plucky"|*)
            # Ubuntu 24.10+ o versiones futuras - usar noble como fallback
            log_warning "Ubuntu $UBUNTU_CODENAME detectado, usando repositorio 'noble' como fallback"
            REPO_CODENAME="noble"
            ;;
    esac
    
    log_info "Usando repositorio: $REPO_CODENAME"
    
    # Crear archivo de lista para MongoDB
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu ${REPO_CODENAME}/mongodb-org/${MONGO_VERSION} multiverse" | $SUDO_CMD tee /etc/apt/sources.list.d/mongodb-org-${MONGO_VERSION}.list
    
    # Actualizar paquetes e instalar MongoDB
    log_info "Actualizando paquetes..."
    $SUDO_CMD apt-get update
    
    log_info "Instalando MongoDB..."
    $SUDO_CMD apt-get install -y mongodb-org
    
    # Habilitar y iniciar MongoDB
    $SUDO_CMD systemctl enable mongod
    $SUDO_CMD systemctl start mongod
    
    log_success "MongoDB instalado y ejecutándose"
}

# Función principal
main() {
    log_info "Iniciando reparación de repositorio MongoDB..."
    
    clean_mongodb_repos
    reinstall_mongodb
    
    echo ""
    log_success "¡Reparación completada exitosamente!"
    echo ""
    echo "📋 Verificar instalación:"
    echo "   - Estado de MongoDB: systemctl status mongod"
    echo "   - Versión instalada: mongod --version"
    echo "   - Conectar a MongoDB: mongo"
    echo ""
}

# Verificar si el script se ejecuta directamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi