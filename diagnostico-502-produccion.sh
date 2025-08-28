#!/bin/bash

# Script de diagnóstico completo para error 502 en producción
# Tractoreando - Diagnóstico de conectividad

echo "🔍 DIAGNÓSTICO COMPLETO - ERROR 502 BAD GATEWAY"
echo "================================================"
echo "Fecha: $(date)"
echo ""

# 1. Verificar estado de PM2
echo "📋 1. ESTADO DE PM2"
echo "------------------"
pm2 status
echo ""

# 2. Verificar puertos en uso
echo "🌐 2. PUERTOS EN USO"
echo "-------------------"
echo "Puerto 3002 (Backend esperado):"
lsof -i :3002 || echo "❌ Puerto 3002 no está en uso"
echo ""
echo "Puerto 8000 (Desarrollo):"
lsof -i :8000 || echo "✅ Puerto 8000 libre"
echo ""
echo "Puerto 5000 (Conflicto anterior):"
lsof -i :5000 || echo "✅ Puerto 5000 libre"
echo ""

# 3. Verificar logs recientes de PM2
echo "📝 3. LOGS RECIENTES DE PM2"
echo "---------------------------"
echo "Últimas 10 líneas del log de salida:"
pm2 logs tractoreando-backend --lines 10 --nostream
echo ""

# 4. Verificar conectividad local
echo "🔗 4. CONECTIVIDAD LOCAL"
echo "------------------------"
echo "Test directo al backend (puerto 3002):"
curl -s -o /dev/null -w "Status: %{http_code}\nTime: %{time_total}s\n" http://localhost:3002/api/health || echo "❌ No se puede conectar al backend"
echo ""

# 5. Verificar archivo .env
echo "⚙️  5. CONFIGURACIÓN .ENV"
echo "-------------------------"
if [ -f "/opt/tractoreando/.env" ]; then
    echo "Archivo .env encontrado:"
    grep -E "^(NODE_ENV|PORT|MONGODB_URI)=" /opt/tractoreando/.env || echo "Variables principales no encontradas"
else
    echo "❌ Archivo .env no encontrado en /opt/tractoreando/.env"
fi
echo ""

# 6. Verificar MongoDB
echo "🗄️  6. ESTADO DE MONGODB"
echo "----------------------"
echo "Verificando servicio MongoDB:"
sudo systemctl status mongod --no-pager -l || echo "❌ Error verificando MongoDB"
echo ""
echo "Test de conexión a MongoDB:"
if command -v mongosh >/dev/null 2>&1; then
    mongosh --eval "db.adminCommand('ismaster')" --quiet || echo "❌ No se puede conectar a MongoDB"
elif command -v mongo >/dev/null 2>&1; then
    mongo --eval "db.adminCommand('ismaster')" --quiet || echo "❌ No se puede conectar a MongoDB"
else
    echo "⚠️  Cliente MongoDB (mongo/mongosh) no encontrado, verificando servicio..."
    if pgrep mongod >/dev/null; then
        echo "✅ Proceso mongod está ejecutándose"
    else
        echo "❌ Proceso mongod no está ejecutándose"
    fi
fi
echo ""

# 7. Verificar procesos Node.js
echo "🔄 7. PROCESOS NODE.JS"
echo "---------------------"
echo "Procesos Node.js activos:"
ps aux | grep node | grep -v grep || echo "❌ No hay procesos Node.js activos"
echo ""

# 8. Verificar espacio en disco
echo "💾 8. ESPACIO EN DISCO"
echo "---------------------"
df -h /opt/tractoreando || echo "❌ Error verificando espacio en disco"
echo ""

# 9. Verificar memoria
echo "🧠 9. USO DE MEMORIA"
echo "-------------------"
free -h
echo ""

# 10. Test de conectividad externa
echo "🌍 10. CONECTIVIDAD EXTERNA"
echo "---------------------------"
echo "Test desde el exterior (simulando Nginx Proxy Manager):"
curl -s -o /dev/null -w "Status: %{http_code}\nTime: %{time_total}s\n" http://127.0.0.1:3002/api/health || echo "❌ No se puede conectar externamente"
echo ""

echo "🏁 DIAGNÓSTICO COMPLETADO"
echo "========================="
echo "Si todos los componentes muestran ✅, el problema puede estar en:"
echo "1. Configuración de Nginx Proxy Manager"
echo "2. Firewall bloqueando conexiones"
echo "3. Configuración de red del servidor"
echo "4. Problemas de DNS interno"
echo ""
echo "Para ejecutar este diagnóstico en producción:"
echo "scp diagnostico-502-produccion.sh user@servidor:/tmp/"
echo "ssh user@servidor 'chmod +x /tmp/diagnostico-502-produccion.sh && /tmp/diagnostico-502-produccion.sh'"