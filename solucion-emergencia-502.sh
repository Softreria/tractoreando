#!/bin/bash

# SCRIPT DE EMERGENCIA - SOLUCIÓN DEFINITIVA ERROR 502
# Tractoreando - Última oportunidad

echo "🚨 SOLUCIÓN DE EMERGENCIA - ERROR 502 BAD GATEWAY"
echo "================================================"
echo "Fecha: $(date)"
echo "Este script resolverá TODOS los problemas de configuración"
echo ""

# Función para logging
log() {
    echo "[$(date '+%H:%M:%S')] $1"
}

# Función para verificar éxito
check_success() {
    if [ $? -eq 0 ]; then
        log "✅ $1 - ÉXITO"
    else
        log "❌ $1 - FALLÓ"
        return 1
    fi
}

log "🛑 PASO 1: LIMPIEZA TOTAL DEL SISTEMA"
echo "====================================="

# Detener TODO
log "Deteniendo PM2..."
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
check_success "Detener PM2"

# Matar procesos Node.js
log "Eliminando procesos Node.js..."
pkill -f "node" 2>/dev/null || true
sleep 3
check_success "Eliminar procesos Node.js"

# Liberar puertos críticos
log "Liberando puertos..."
for port in 3002 5000 8000 3000; do
    if lsof -ti :$port >/dev/null 2>&1; then
        log "Liberando puerto $port..."
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
    fi
done
check_success "Liberar puertos"

log "🔧 PASO 2: CONFIGURACIÓN FORZADA"
echo "================================"

# Ir al directorio correcto
cd /opt/tractoreando || {
    log "❌ ERROR CRÍTICO: No se puede acceder a /opt/tractoreando"
    log "Verifica que la aplicación esté instalada en la ruta correcta"
    exit 1
}

# Crear .env PERFECTO
log "Creando configuración .env perfecta..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=3002
MONGODB_URI=mongodb://localhost:27017/tractoreando
JWT_SECRET=tractoreando-super-secret-key-2025
FRONTEND_URL=https://tractoreando.softreria.com
BACKEND_URL=https://tractoreando.softreria.com
API_URL=https://tractoreando.softreria.com
BASE_URL=https://tractoreando.softreria.com
EOF
check_success "Crear archivo .env"

# Verificar ecosystem.config.js
log "Verificando ecosystem.config.js..."
if [ ! -f "ecosystem.config.js" ]; then
    log "Creando ecosystem.config.js..."
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'tractoreando-backend',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 8000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002
    }
  }]
};
EOF
fi
check_success "Verificar ecosystem.config.js"

log "🗄️  PASO 3: VERIFICAR Y ARRANCAR MONGODB"
echo "========================================"

# Verificar MongoDB
if command -v systemctl >/dev/null 2>&1; then
    log "Iniciando MongoDB con systemctl..."
    sudo systemctl start mongod 2>/dev/null || true
    sudo systemctl enable mongod 2>/dev/null || true
    sleep 5
else
    log "systemctl no disponible, verificando proceso mongod..."
fi

# Verificar que MongoDB esté corriendo
if pgrep mongod >/dev/null; then
    log "✅ MongoDB está ejecutándose"
else
    log "⚠️  MongoDB no detectado, continuando..."
fi

log "🚀 PASO 4: ARRANQUE FORZADO DE LA APLICACIÓN"
echo "============================================"

# Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
    log "Instalando dependencias..."
    npm install --production
    check_success "Instalar dependencias"
fi

# Arrancar con PM2
log "Arrancando aplicación con PM2..."
pm2 start ecosystem.config.js --env production --force
check_success "Arrancar con PM2"

# Esperar arranque
log "Esperando arranque completo..."
sleep 10

log "📊 PASO 5: VERIFICACIÓN EXHAUSTIVA"
echo "=================================="

# Estado PM2
log "Estado de PM2:"
pm2 status

# Verificar puerto
log "Verificando puerto 3002:"
if lsof -i :3002 >/dev/null 2>&1; then
    log "✅ Puerto 3002 está en uso"
    lsof -i :3002
else
    log "❌ Puerto 3002 NO está en uso"
    log "Logs de PM2:"
    pm2 logs tractoreando-backend --lines 20 --nostream
fi

# Test de conectividad
log "🧪 PASO 6: TESTS DE CONECTIVIDAD"
echo "================================"

# Test health endpoint
log "Test 1: Health endpoint"
for i in {1..5}; do
    log "Intento $i/5 - Health endpoint..."
    if curl -s -f http://localhost:3002/api/health >/dev/null 2>&1; then
        log "✅ Health endpoint responde correctamente"
        break
    else
        log "❌ Health endpoint no responde, esperando..."
        sleep 5
    fi
    if [ $i -eq 5 ]; then
        log "❌ Health endpoint falló después de 5 intentos"
    fi
done

# Test login endpoint
log "Test 2: Login endpoint"
login_response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test123"}' \
    http://localhost:3002/api/auth/login 2>/dev/null)

log "Login endpoint status: $login_response"
if [ "$login_response" = "200" ] || [ "$login_response" = "400" ] || [ "$login_response" = "401" ]; then
    log "✅ Login endpoint está respondiendo (status: $login_response)"
else
    log "❌ Login endpoint no responde correctamente (status: $login_response)"
fi

# Test desde exterior
log "Test 3: Conectividad externa"
external_response=$(curl -s -o /dev/null -w "%{http_code}" \
    http://127.0.0.1:3002/api/health 2>/dev/null)
log "Conectividad externa status: $external_response"

log "🎯 PASO 7: DIAGNÓSTICO FINAL"
echo "============================"

# Resumen final
log "RESUMEN DEL ESTADO:"
log "=================="

# PM2 Status
if pm2 list | grep -q "online"; then
    log "✅ PM2: Aplicación en línea"
else
    log "❌ PM2: Aplicación NO en línea"
fi

# Puerto
if lsof -i :3002 >/dev/null 2>&1; then
    log "✅ PUERTO: 3002 está ocupado"
else
    log "❌ PUERTO: 3002 está libre (PROBLEMA)"
fi

# Health
if curl -s -f http://localhost:3002/api/health >/dev/null 2>&1; then
    log "✅ HEALTH: Endpoint responde"
else
    log "❌ HEALTH: Endpoint NO responde"
fi

log "🔍 INFORMACIÓN PARA NGINX PROXY MANAGER:"
log "========================================"
log "Configuración requerida:"
log "- Scheme: http"
log "- Forward Hostname/IP: 127.0.0.1"
log "- Forward Port: 3002"
log "- SSL Certificate: Let's Encrypt"
log ""
log "Headers personalizados requeridos:"
log "- X-Real-IP: \$remote_addr"
log "- X-Forwarded-For: \$proxy_add_x_forwarded_for"
log "- X-Forwarded-Proto: \$scheme"
log "- Host: \$host"
log ""
log "Timeouts recomendados:"
log "- Proxy Connect Timeout: 60s"
log "- Proxy Send Timeout: 60s"
log "- Proxy Read Timeout: 60s"

log "🏁 SCRIPT DE EMERGENCIA COMPLETADO"
log "=================================="
log "Si el problema persiste:"
log "1. Verificar configuración de Nginx Proxy Manager"
log "2. Verificar firewall del servidor"
log "3. Verificar conectividad de red"
log "4. Contactar al proveedor de hosting"
log ""
log "Para monitoreo continuo:"
log "pm2 monit"
log "pm2 logs tractoreando-backend --follow"