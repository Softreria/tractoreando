#!/bin/bash

# Script de solución rápida para Tractoreando (sin permisos de root)
# Resuelve problemas comunes de acceso en entorno de desarrollo

echo "🔧 SOLUCIÓN RÁPIDA TRACTOREANDO"
echo "================================"
echo "Resolviendo problemas de acceso..."
echo ""

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

# Verificar y iniciar MongoDB
log_info "Verificando MongoDB..."
if pgrep -f mongod >/dev/null 2>&1; then
    log_success "✓ MongoDB está ejecutándose"
else
    log_warning "MongoDB no está ejecutándose, intentando iniciar..."
    brew services start mongodb-community
    sleep 3
    if pgrep -f mongod >/dev/null 2>&1; then
        log_success "✓ MongoDB iniciado correctamente"
    else
        log_error "✗ No se pudo iniciar MongoDB"
    fi
fi

# Instalar dependencias si es necesario
log_info "Verificando dependencias..."
if [[ ! -d "node_modules" ]]; then
    log_info "Instalando dependencias del backend..."
    npm install
fi

if [[ ! -d "frontend/node_modules" ]]; then
    log_info "Instalando dependencias del frontend..."
    cd frontend && npm install && cd ..
fi

# Construir frontend si es necesario
if [[ ! -d "frontend/build" ]]; then
    log_info "Construyendo frontend..."
    cd frontend && npm run build && cd ..
fi

# Verificar archivo .env
log_info "Verificando configuración..."
if [[ ! -f ".env" ]]; then
    log_info "Creando archivo .env..."
    cp .env.production .env
fi

# Detener procesos PM2 existentes
log_info "Limpiando procesos PM2..."
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

# Iniciar aplicación con PM2
log_info "Iniciando aplicación con PM2..."
pm2 start ecosystem.config.js
sleep 5

# Verificar estado
echo ""
log_info "=== VERIFICACIÓN FINAL ==="

# Verificar MongoDB
if pgrep -f mongod >/dev/null 2>&1; then
    log_success "✓ MongoDB está ejecutándose"
else
    log_error "✗ MongoDB no está ejecutándose"
fi

# Verificar PM2
if pm2 jlist | grep -q '"status":"online"'; then
    log_success "✓ Aplicación PM2 está online"
else
    log_error "✗ Aplicación PM2 no está online"
    log_info "Estado de PM2:"
    pm2 status
fi

# Verificar puertos
for port in 5000 27017; do
    if lsof -i :$port >/dev/null 2>&1; then
        log_success "✓ Puerto $port está en uso"
    else
        log_warning "⚠ Puerto $port no detectado"
    fi
done

# Verificar conectividad
log_info "Verificando conectividad..."
sleep 2

if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 | grep -q "200\|404"; then
    log_success "✓ Backend accesible en http://localhost:5000"
else
    log_error "✗ Backend no accesible"
fi

echo ""
echo "🎯 INFORMACIÓN DE ACCESO"
echo "========================"
echo "Backend API: http://localhost:5000"
echo "Frontend: Servido por el backend en http://localhost:5000"
echo ""
echo "📋 COMANDOS ÚTILES:"
echo "- Ver estado PM2: pm2 status"
echo "- Ver logs: pm2 logs"
echo "- Reiniciar app: pm2 restart tractoreando"
echo "- Detener app: pm2 stop tractoreando"
echo ""
echo "🔍 Para diagnóstico completo: ./diagnostico-completo.sh"
echo ""

if pm2 jlist | grep -q '"status":"online"' && pgrep -f mongod >/dev/null 2>&1; then
    log_success "🎉 ¡Aplicación lista! Accede en http://localhost:5000"
    exit 0
else
    log_error "🚨 Algunos componentes no están funcionando correctamente"
    exit 1
fi