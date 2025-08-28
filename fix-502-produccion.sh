#!/bin/bash

# Script de solución rápida para error 502 en producción
# Tractoreando - Fix automático

echo "🔧 SCRIPT DE SOLUCIÓN RÁPIDA - ERROR 502"
echo "========================================"
echo "Fecha: $(date)"
echo ""

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Función para esperar y verificar
wait_and_check() {
    echo "⏳ Esperando 5 segundos..."
    sleep 5
    echo "✅ Continuando..."
}

echo "🛑 PASO 1: DETENER SERVICIOS"
echo "-----------------------------"
echo "Deteniendo PM2..."
pm2 stop all
wait_and_check

echo "🧹 PASO 2: LIMPIAR PROCESOS"
echo "----------------------------"
echo "Eliminando procesos Node.js residuales..."
pkill -f "node.*tractoreando" || echo "No hay procesos residuales"
wait_and_check

echo "🔍 PASO 3: VERIFICAR PUERTOS"
echo "-----------------------------"
echo "Verificando que los puertos estén libres..."
for port in 3002 5000 8000; do
    if lsof -i :$port >/dev/null 2>&1; then
        echo "❌ Puerto $port está ocupado, intentando liberar..."
        lsof -ti :$port | xargs kill -9 2>/dev/null || echo "No se pudo liberar el puerto $port"
    else
        echo "✅ Puerto $port está libre"
    fi
done
wait_and_check

echo "⚙️  PASO 4: VERIFICAR CONFIGURACIÓN"
echo "-----------------------------------"
echo "Verificando archivo .env..."
if [ -f "/opt/tractoreando/.env" ]; then
    echo "✅ Archivo .env encontrado"
    # Asegurar que PORT esté configurado correctamente
    if grep -q "^PORT=3002" /opt/tractoreando/.env; then
        echo "✅ PORT=3002 configurado correctamente"
    else
        echo "🔧 Configurando PORT=3002..."
        sed -i 's/^PORT=.*/PORT=3002/' /opt/tractoreando/.env || echo "PORT=3002" >> /opt/tractoreando/.env
    fi
    
    # Verificar NODE_ENV
    if grep -q "^NODE_ENV=production" /opt/tractoreando/.env; then
        echo "✅ NODE_ENV=production configurado correctamente"
    else
        echo "🔧 Configurando NODE_ENV=production..."
        sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' /opt/tractoreando/.env || echo "NODE_ENV=production" >> /opt/tractoreando/.env
    fi
else
    echo "❌ Archivo .env no encontrado, creando uno básico..."
    cat > /opt/tractoreando/.env << EOF
NODE_ENV=production
PORT=3002
MONGODB_URI=mongodb://localhost:27017/tractoreando
JWT_SECRET=your-secret-key-here
EOF
fi
wait_and_check

echo "🗄️  PASO 5: VERIFICAR MONGODB"
echo "-----------------------------"
echo "Verificando estado de MongoDB..."
if command_exists systemctl; then
    sudo systemctl status mongod --no-pager || {
        echo "🔧 Iniciando MongoDB..."
        sudo systemctl start mongod
        wait_and_check
    }
else
    echo "⚠️  systemctl no disponible, verificar MongoDB manualmente"
fi

echo "🚀 PASO 6: REINICIAR APLICACIÓN"
echo "-------------------------------"
echo "Cambiando al directorio de la aplicación..."
cd /opt/tractoreando || {
    echo "❌ No se puede acceder a /opt/tractoreando"
    exit 1
}

echo "Iniciando aplicación con PM2..."
pm2 start ecosystem.config.js --env production
wait_and_check

echo "📊 PASO 7: VERIFICAR ESTADO"
echo "---------------------------"
echo "Estado de PM2:"
pm2 status
echo ""
echo "Verificando puerto 3002:"
lsof -i :3002 || echo "❌ Puerto 3002 no está en uso"
echo ""

echo "🧪 PASO 8: TEST DE CONECTIVIDAD"
echo "-------------------------------"
echo "Test local del endpoint de health..."
for i in {1..3}; do
    echo "Intento $i/3:"
    if curl -s -f http://localhost:3002/api/health >/dev/null; then
        echo "✅ Backend responde correctamente"
        break
    else
        echo "❌ Backend no responde, esperando..."
        sleep 5
    fi
done

echo "Test del endpoint de login..."
curl -s -o /dev/null -w "Login endpoint - Status: %{http_code}\n" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test123"}' \
    http://localhost:3002/api/auth/login

echo ""
echo "🏁 SCRIPT COMPLETADO"
echo "==================="
echo "Si el problema persiste después de este script:"
echo "1. Verificar logs de PM2: pm2 logs tractoreando-backend"
echo "2. Verificar configuración de Nginx Proxy Manager"
echo "3. Verificar conectividad de red del servidor"
echo "4. Contactar al administrador del servidor"
echo ""
echo "Para monitorear en tiempo real:"
echo "pm2 monit"