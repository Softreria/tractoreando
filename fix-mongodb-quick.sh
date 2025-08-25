#!/bin/bash

# Script de solución rápida para problemas de MongoDB
# Detecta automáticamente el tipo de problema y aplica la solución correspondiente
# Uso: ./fix-mongodb-quick.sh

set -e

echo "🚀 Solución Rápida para MongoDB - Tractoreando"
echo "============================================="

# Verificar si se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Este script debe ejecutarse como root"
    echo "💡 Ejecuta: sudo $0"
    exit 1
fi

echo "✅ Ejecutándose como root"

# Función para detectar el tipo de problema
detect_problem() {
    echo "\n🔍 Detectando tipo de problema..."
    
    # Verificar si MongoDB está instalado
    if ! command -v mongod &> /dev/null; then
        echo "❌ MongoDB no está instalado"
        return 1  # Problema de instalación
    fi
    
    # Verificar si el servicio está ejecutándose
    if ! systemctl is-active --quiet mongod; then
        echo "❌ MongoDB no está ejecutándose"
        return 2  # Problema de servicio
    fi
    
    # Verificar si el puerto está disponible
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
        # Si no hay herramientas disponibles, asumir que el puerto no está disponible
        echo "⚠️ No se encontraron herramientas para verificar puertos (ss, lsof, netstat)"
        echo "❌ Puerto 27017 no está disponible"
        return 3  # Problema de puerto
    fi
    
    if ! $port_check; then
        echo "❌ Puerto 27017 no está disponible"
        return 3  # Problema de puerto
    fi
    
    # Si llegamos aquí, MongoDB está ejecutándose
    echo "✅ MongoDB está ejecutándose"
    
    # Probar conexión básica
    if timeout 10 mongosh --eval "db.adminCommand('ping')" --quiet &>/dev/null; then
        echo "✅ Conexión básica exitosa"
        return 4  # Problema de timeout en aplicación
    else
        echo "❌ No se puede conectar a MongoDB"
        return 5  # Problema de conexión
    fi
}

# Función para aplicar solución según el problema detectado
apply_solution() {
    local problem_type=$1
    
    case $problem_type in
        1)
            echo "\n🔧 Aplicando solución: Instalación de MongoDB"
            ./fix-mongodb-connection.sh
            ;;
        2|3|5)
            echo "\n🔧 Aplicando solución: Configuración y reinicio de MongoDB"
            ./fix-mongodb-connection.sh
            ;;
        4)
            echo "\n🔧 Aplicando solución: Optimización de timeouts"
            if [ -f "diagnose-system.js" ]; then
    node diagnose-system.js --optimize-only
else
    echo "⚠️ Script diagnose-system.js no encontrado"
                echo "💡 Aplicando configuración básica de timeouts..."
                
                # Crear configuración básica de timeouts
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
    
    // Probar operación básica
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
                    echo "✅ Conexión con timeouts extendidos exitosa"
                else
                    echo "❌ Aún hay problemas de conexión"
                    return 1
                fi
                
                # Limpiar archivo temporal
                rm -f /tmp/test-connection.js
            fi
            ;;
        *)
            echo "❌ Tipo de problema desconocido"
            return 1
            ;;
    esac
}

# Función para probar la carga de datos
test_data_loading() {
    echo "\n🧪 Probando carga de datos..."
    
    if [ -f "data-loader.js" ]; then
        echo "📦 Usando script optimizado de carga de datos"
        if timeout 300 node data-loader.js production; then
            echo "✅ Carga de datos exitosa"
            return 0
        else
            echo "⚠️ Error en carga optimizada, intentando script original..."
        fi
    fi
    
    if [ -f "data-loader.js" ]; then
        echo "📦 Usando script de datos españoles"
        if timeout 300 node data-loader.js spanish; then
            echo "✅ Carga de datos exitosa"
            return 0
        else
            echo "❌ Error en carga de datos original"
            return 1
        fi
    fi
    
    echo "❌ No se encontraron scripts de carga de datos"
    return 1
}

# Función principal
main() {
    echo "🔍 Iniciando diagnóstico automático..."
    
    # Detectar tipo de problema
    detect_problem
    problem_type=$?
    
    echo "\n📋 Tipo de problema detectado: $problem_type"
    
    # Aplicar solución correspondiente
    if apply_solution $problem_type; then
        echo "\n✅ Solución aplicada correctamente"
    else
        echo "\n❌ Error aplicando solución"
        echo "💡 Intenta ejecutar manualmente:"
        echo "   • ./fix-mongodb-connection.sh"
        echo "   • node diagnose-system.js --optimize-only"
        echo "   • node diagnose-system.js --mongo-only"
        exit 1
    fi
    
    # Probar carga de datos
    echo "\n🧪 Probando funcionalidad completa..."
    if test_data_loading; then
        echo "\n🎉 ¡Problema resuelto completamente!"
        echo "\n📋 Resumen de la solución:"
        echo "   ✅ MongoDB configurado y funcionando"
        echo "   ✅ Conexión estable establecida"
        echo "   ✅ Datos de ejemplo cargados correctamente"
        echo "\n🚀 Tu aplicación Tractoreando está lista para usar"
    else
        echo "\n⚠️ MongoDB funciona pero hay problemas con la carga de datos"
        echo "💡 Puedes intentar cargar los datos manualmente:"
        echo "   • node data-loader.js production"
        echo "   • node data-loader.js spanish"
    fi
    
    echo "\n📋 Comandos útiles para el futuro:"
    echo "   • Ver estado: systemctl status mongod"
    echo "   • Ver logs: tail -f /var/log/mongodb/mongod.log"
    echo "   • Conectar: mongosh"
    echo "   • Reiniciar: systemctl restart mongod"
}

# Ejecutar función principal
main