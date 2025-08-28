#!/bin/bash

# Script integral para diagnosticar y solucionar problemas de MongoDB
# Combina funcionalidades de fix-mongodb-quick.sh y fix-mongodb-connection.sh
# Uso: ./fix-mongodb-comprehensive.sh [--quick|--full]

set -e

echo "🔍 Solución Integral para MongoDB - Tractoreando"
echo "==============================================="

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

# Verificar permisos
check_permissions() {
    if [ "$EUID" -ne 0 ] && [[ "$1" == "--full" ]]; then
        log_error "El modo completo requiere permisos de root"
        echo "💡 Ejecuta: sudo $0 --full"
        echo "💡 O usa modo rápido: $0 --quick"
        exit 1
    fi
}

# Función para detectar el tipo de problema
detect_problem() {
    log_info "Detectando tipo de problema..."
    
    # Verificar si MongoDB está instalado
    if ! command -v mongod &> /dev/null && ! command -v mongosh &> /dev/null; then
        log_error "MongoDB no está instalado"
        return 1  # Problema de instalación
    fi
    
    # Verificar si el servicio está ejecutándose (Linux)
    if command -v systemctl &> /dev/null; then
        if ! systemctl is-active --quiet mongod 2>/dev/null; then
            log_error "MongoDB no está ejecutándose (systemctl)"
            return 2  # Problema de servicio
        fi
    # Verificar procesos (macOS/otros)
    elif ! pgrep -f mongod >/dev/null 2>&1; then
        log_error "MongoDB no está ejecutándose (proceso)"
        return 2  # Problema de servicio
    fi
    
    # Verificar si el puerto está disponible
    port_check=false
    if command -v lsof &> /dev/null; then
        if lsof -i :27017 &> /dev/null; then
            port_check=true
        fi
    elif command -v ss &> /dev/null; then
        if ss -tuln | grep -q ":27017"; then
            port_check=true
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln | grep -q ":27017"; then
            port_check=true
        fi
    else
        # Probar conexión directa
        if timeout 5 bash -c "</dev/tcp/localhost/27017" &>/dev/null; then
            port_check=true
        fi
    fi
    
    if ! $port_check; then
        log_error "Puerto 27017 no está disponible"
        return 3  # Problema de puerto
    fi
    
    log_success "MongoDB está ejecutándose"
    
    # Probar conexión básica
    if timeout 10 mongosh --eval "db.adminCommand('ping')" --quiet &>/dev/null; then
        log_success "Conexión básica exitosa"
        return 4  # Problema de timeout en aplicación
    else
        log_error "No se puede conectar a MongoDB"
        return 5  # Problema de conexión
    fi
}

# Función para instalar MongoDB (solo Linux con root)
install_mongodb() {
    log_info "Instalando MongoDB..."
    
    if [ -f /etc/debian_version ]; then
        # Ubuntu/Debian
        log_info "Detectado sistema Debian/Ubuntu"
        curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
        apt-get update
        apt-get install -y mongodb-org
    elif [ -f /etc/redhat-release ]; then
        # CentOS/RHEL
        log_info "Detectado sistema CentOS/RHEL"
        cat > /etc/yum.repos.d/mongodb-org-7.0.repo << EOF
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-7.0.asc
EOF
        yum install -y mongodb-org
    else
        log_error "Distribución no soportada para instalación automática"
        log_info "Instala MongoDB manualmente desde: https://docs.mongodb.com/manual/installation/"
        exit 1
    fi
    
    log_success "MongoDB instalado correctamente"
}

# Función para configurar MongoDB
configure_mongodb() {
    log_info "Configurando MongoDB..."
    
    # Crear directorios necesarios
    mkdir -p /var/lib/mongodb /var/log/mongodb
    
    # Configurar permisos si existe usuario mongodb
    if id "mongodb" &>/dev/null; then
        chown mongodb:mongodb /var/lib/mongodb /var/log/mongodb
    fi
    
    # Configurar archivo de configuración
    cat > /etc/mongod.conf << EOF
# mongod.conf
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1,::1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo

security:
  authorization: disabled
EOF
    
    log_success "MongoDB configurado correctamente"
}

# Función para iniciar MongoDB
start_mongodb() {
    log_info "Iniciando MongoDB..."
    
    if command -v systemctl &> /dev/null; then
        # Linux con systemd
        systemctl enable mongod
        systemctl start mongod
        sleep 5
        
        if systemctl is-active --quiet mongod; then
            log_success "MongoDB iniciado correctamente (systemctl)"
        else
            log_error "Error al iniciar MongoDB"
            journalctl -u mongod --no-pager -n 20
            exit 1
        fi
    elif command -v brew &> /dev/null; then
        # macOS con Homebrew
        brew services start mongodb-community
        sleep 5
        
        if pgrep -f mongod >/dev/null 2>&1; then
            log_success "MongoDB iniciado correctamente (brew)"
        else
            log_error "Error al iniciar MongoDB con brew"
            exit 1
        fi
    else
        log_error "No se encontró método para iniciar MongoDB"
        log_info "Inicia MongoDB manualmente"
        exit 1
    fi
}

# Función para optimizar timeouts
optimize_timeouts() {
    log_info "Optimizando configuración de timeouts..."
    
    # Crear script de prueba de conexión
    cat > /tmp/test-connection.js << 'EOF'
const mongoose = require('mongoose');

console.log('🔌 Probando conexión con timeouts extendidos...');

mongoose.connect('mongodb://localhost:27017/tractoreando', {
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 60000,
    connectTimeoutMS: 60000,
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    waitQueueTimeoutMS: 60000,
    heartbeatFrequencyMS: 10000
}).then(async () => {
    console.log('✅ Conexión exitosa con timeouts extendidos');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Base de datos tiene ${collections.length} colecciones`);
    
    await mongoose.disconnect();
    console.log('✅ Desconexión exitosa');
    process.exit(0);
}).catch(err => {
    console.error('❌ Error de conexión:', err.message);
    process.exit(1);
});
EOF
    
    # Probar conexión
    if node /tmp/test-connection.js; then
        log_success "Conexión con timeouts extendidos exitosa"
    else
        log_error "Aún hay problemas de conexión"
        return 1
    fi
    
    # Limpiar archivo temporal
    rm -f /tmp/test-connection.js
}

# Función para aplicar solución según el problema detectado
apply_solution() {
    local problem_type=$1
    local mode=$2
    
    case $problem_type in
        1)
            if [[ "$mode" == "--full" ]]; then
                log_info "Aplicando solución: Instalación de MongoDB"
                install_mongodb
                configure_mongodb
                start_mongodb
            else
                log_error "Instalación requiere modo completo (--full)"
                return 1
            fi
            ;;
        2|3)
            if [[ "$mode" == "--full" ]]; then
                log_info "Aplicando solución: Configuración y reinicio de MongoDB"
                configure_mongodb
                start_mongodb
            else
                log_info "Aplicando solución: Reinicio rápido de MongoDB"
                if command -v brew &> /dev/null; then
                    brew services restart mongodb-community
                elif command -v systemctl &> /dev/null && [ "$EUID" -eq 0 ]; then
                    systemctl restart mongod
                else
                    log_warning "No se puede reiniciar automáticamente. Reinicia MongoDB manualmente."
                fi
            fi
            ;;
        4|5)
            log_info "Aplicando solución: Optimización de timeouts"
            optimize_timeouts
            ;;
        *)
            log_error "Tipo de problema desconocido"
            return 1
            ;;
    esac
}

# Función para probar la conexión final
test_connection() {
    log_info "Probando conexión final a MongoDB..."
    
    sleep 3
    
    if mongosh --eval "db.adminCommand('ping')" --quiet; then
        log_success "Conexión a MongoDB exitosa"
        return 0
    else
        log_error "No se pudo conectar a MongoDB"
        if [ -f /var/log/mongodb/mongod.log ]; then
            log_info "Últimas líneas del log:"
            tail -n 10 /var/log/mongodb/mongod.log
        fi
        return 1
    fi
}

# Función principal
main() {
    local mode=${1:-"--quick"}
    
    check_permissions "$mode"
    
    log_info "Iniciando diagnóstico automático (modo: $mode)..."
    
    # Detectar tipo de problema
    detect_problem
    problem_type=$?
    
    log_info "Tipo de problema detectado: $problem_type"
    
    # Aplicar solución correspondiente
    if apply_solution $problem_type "$mode"; then
        log_success "Solución aplicada correctamente"
    else
        log_error "Error aplicando solución"
        echo "💡 Comandos manuales sugeridos:"
        echo "   • sudo systemctl restart mongod (Linux)"
        echo "   • brew services restart mongodb-community (macOS)"
        echo "   • mongosh --eval 'db.adminCommand(\"ping\")' (probar conexión)"
        exit 1
    fi
    
    # Probar conexión final
    if test_connection; then
        log_success "🎉 MongoDB está funcionando correctamente"
        
        # Mostrar información útil
        echo ""
        echo "📋 INFORMACIÓN ÚTIL:"
        echo "• Puerto MongoDB: 27017"
        echo "• Base de datos: tractoreando"
        echo "• Probar conexión: mongosh"
        echo "• Ver logs: tail -f /var/log/mongodb/mongod.log"
        
        exit 0
    else
        log_error "🚨 Aún hay problemas de conexión"
        exit 1
    fi
}

# Mostrar ayuda
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Uso: $0 [--quick|--full|--help]"
    echo ""
    echo "Opciones:"
    echo "  --quick  Modo rápido (sin permisos de root)"
    echo "  --full   Modo completo (requiere root, puede instalar MongoDB)"
    echo "  --help   Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0                    # Modo rápido por defecto"
    echo "  $0 --quick           # Modo rápido explícito"
    echo "  sudo $0 --full       # Modo completo con instalación"
    exit 0
fi

# Ejecutar función principal
main "$@"