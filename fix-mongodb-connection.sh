#!/bin/bash

# Script para diagnosticar y solucionar problemas de conexión con MongoDB
# Uso: ./fix-mongodb-connection.sh

set -e

echo "🔍 Diagnosticando problemas de MongoDB en producción..."
echo "================================================"

# Verificar si se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Este script debe ejecutarse como root"
    echo "💡 Ejecuta: sudo $0"
    exit 1
fi

echo "✅ Ejecutándose como root"

# Función para verificar el estado de MongoDB
check_mongodb_status() {
    echo "\n📊 Verificando estado de MongoDB..."
    
    # Verificar si MongoDB está instalado
    if ! command -v mongod &> /dev/null; then
        echo "❌ MongoDB no está instalado"
        return 1
    fi
    
    # Verificar si el servicio está ejecutándose
    if systemctl is-active --quiet mongod; then
        echo "✅ Servicio MongoDB está activo"
    else
        echo "❌ Servicio MongoDB no está activo"
        return 1
    fi
    
    # Verificar si el puerto está abierto
    port_check=false
    if command -v ss &> /dev/null; then
        # Usar ss si está disponible
        if ss -tuln | grep -q ":27017"; then
            port_check=true
        fi
    elif command -v lsof &> /dev/null; then
        # Usar lsof como alternativa
        if lsof -i :27017 &> /dev/null; then
            port_check=true
        fi
    elif command -v netstat &> /dev/null; then
        # Usar netstat si está disponible
        if netstat -tuln | grep -q ":27017"; then
            port_check=true
        fi
    else
        # Si no hay herramientas disponibles, intentar conexión directa
        echo "⚠️ No se encontraron herramientas para verificar puertos, probando conexión directa..."
        if timeout 5 bash -c "</dev/tcp/localhost/27017" &>/dev/null; then
            port_check=true
        fi
    fi
    
    if $port_check; then
        echo "✅ Puerto 27017 está abierto"
    else
        echo "❌ Puerto 27017 no está disponible"
        return 1
    fi
    
    return 0
}

# Función para instalar MongoDB
install_mongodb() {
    echo "\n📦 Instalando MongoDB..."
    
    # Detectar distribución
    if [ -f /etc/debian_version ]; then
        # Ubuntu/Debian
        echo "🐧 Detectado sistema Debian/Ubuntu"
        
        # Importar clave pública
        curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
        
        # Crear archivo de lista de fuentes
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
        
        # Actualizar paquetes e instalar
        apt-get update
        apt-get install -y mongodb-org
        
    elif [ -f /etc/redhat-release ]; then
        # CentOS/RHEL
        echo "🔴 Detectado sistema CentOS/RHEL"
        
        # Crear archivo de repositorio
        cat > /etc/yum.repos.d/mongodb-org-7.0.repo << EOF
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-7.0.asc
EOF
        
        # Instalar
        yum install -y mongodb-org
    else
        echo "❌ Distribución no soportada"
        exit 1
    fi
    
    echo "✅ MongoDB instalado correctamente"
}

# Función para configurar MongoDB
configure_mongodb() {
    echo "\n⚙️ Configurando MongoDB..."
    
    # Crear directorio de datos si no existe
    mkdir -p /var/lib/mongodb
    chown mongodb:mongodb /var/lib/mongodb
    
    # Crear directorio de logs si no existe
    mkdir -p /var/log/mongodb
    chown mongodb:mongodb /var/log/mongodb
    
    # Configurar archivo de configuración
    cat > /etc/mongod.conf << EOF
# mongod.conf

# for documentation of all options, see:
#   http://docs.mongodb.org/manual/reference/configuration-options/

# Where to store data.
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

# where to write logging data.
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

# network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1,::1

# process management
processManagement:
  timeZoneInfo: /usr/share/zoneinfo

# security
security:
  authorization: disabled
EOF
    
    echo "✅ MongoDB configurado correctamente"
}

# Función para iniciar MongoDB
start_mongodb() {
    echo "\n🚀 Iniciando MongoDB..."
    
    # Habilitar e iniciar el servicio
    systemctl enable mongod
    systemctl start mongod
    
    # Esperar a que inicie
    sleep 5
    
    # Verificar estado
    if systemctl is-active --quiet mongod; then
        echo "✅ MongoDB iniciado correctamente"
    else
        echo "❌ Error al iniciar MongoDB"
        echo "📋 Logs del servicio:"
        journalctl -u mongod --no-pager -n 20
        exit 1
    fi
}

# Función para probar la conexión
test_connection() {
    echo "\n🔌 Probando conexión a MongoDB..."
    
    # Esperar un poco más para asegurar que MongoDB esté listo
    sleep 3
    
    # Probar conexión básica
    if mongosh --eval "db.adminCommand('ping')" --quiet; then
        echo "✅ Conexión a MongoDB exitosa"
    else
        echo "❌ No se pudo conectar a MongoDB"
        echo "📋 Verificando logs..."
        tail -n 20 /var/log/mongodb/mongod.log
        exit 1
    fi
}

# Función principal
main() {
    echo "🔍 Iniciando diagnóstico..."
    
    # Verificar estado actual
    if check_mongodb_status; then
        echo "\n✅ MongoDB ya está funcionando correctamente"
        test_connection
        echo "\n🎉 ¡Todo listo! Puedes ejecutar el script de carga de datos."
        return 0
    fi
    
    echo "\n🔧 MongoDB necesita ser configurado..."
    
    # Instalar MongoDB si no está presente
    if ! command -v mongod &> /dev/null; then
        install_mongodb
    fi
    
    # Configurar MongoDB
    configure_mongodb
    
    # Iniciar MongoDB
    start_mongodb
    
    # Probar conexión
    test_connection
    
    echo "\n🎉 ¡MongoDB configurado y funcionando correctamente!"
    echo "\n📋 Comandos útiles:"
    echo "   • Ver estado: systemctl status mongod"
    echo "   • Ver logs: tail -f /var/log/mongodb/mongod.log"
    echo "   • Conectar: mongosh"
    echo "   • Reiniciar: systemctl restart mongod"
    echo "\n✨ Ahora puedes ejecutar: node data-loader.js spanish"
}

# Ejecutar función principal
main