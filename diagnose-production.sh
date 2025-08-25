#!/bin/bash

# Script de diagnóstico para problemas de producción
# Identifica y ayuda a resolver errores comunes en el servidor de producción

set -e

echo "🔍 Iniciando diagnóstico de producción..."
echo "==========================================="

# Función para mostrar estado con colores
show_status() {
    if [ $1 -eq 0 ]; then
        echo "✅ $2"
    else
        echo "❌ $2"
    fi
}

# Verificar si estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json. Ejecuta este script desde el directorio raíz del proyecto."
    exit 1
fi

echo "📋 VERIFICANDO CONFIGURACIÓN DEL SISTEMA"
echo "----------------------------------------"

# Verificar Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    show_status 0 "Node.js instalado: $NODE_VERSION"
else
    show_status 1 "Node.js no está instalado"
fi

# Verificar npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    show_status 0 "npm instalado: $NPM_VERSION"
else
    show_status 1 "npm no está instalado"
fi

# Verificar MongoDB
echo ""
echo "📋 VERIFICANDO MONGODB"
echo "----------------------"

if command -v mongod &> /dev/null; then
    show_status 0 "MongoDB instalado"
else
    show_status 1 "MongoDB no está instalado"
fi

# Verificar si MongoDB está ejecutándose
if pgrep -x "mongod" > /dev/null; then
    show_status 0 "MongoDB está ejecutándose"
else
    show_status 1 "MongoDB no está ejecutándose"
fi

# Verificar conexión a MongoDB
if node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://127.0.0.1:27017/test').then(() => { console.log('Conexión exitosa'); process.exit(0); }).catch(() => process.exit(1));" &> /dev/null; then
    show_status 0 "Conexión a MongoDB exitosa"
else
    show_status 1 "No se puede conectar a MongoDB"
fi

echo ""
echo "📋 VERIFICANDO ARCHIVOS DE CONFIGURACIÓN"
echo "----------------------------------------"

# Verificar archivos de entorno
if [ -f ".env.production" ]; then
    show_status 0 "Archivo .env.production existe"
else
    show_status 1 "Archivo .env.production no existe"
fi

if [ -f "frontend/.env.production" ]; then
    show_status 0 "Archivo frontend/.env.production existe"
else
    show_status 1 "Archivo frontend/.env.production no existe"
fi

# Verificar manifest.json
if [ -f "frontend/public/manifest.json" ]; then
    show_status 0 "Archivo manifest.json existe"
    # Verificar sintaxis JSON
    if node -e "JSON.parse(require('fs').readFileSync('frontend/public/manifest.json', 'utf8'))" &> /dev/null; then
        show_status 0 "manifest.json tiene sintaxis válida"
    else
        show_status 1 "manifest.json tiene errores de sintaxis"
    fi
else
    show_status 1 "Archivo manifest.json no existe"
fi

echo ""
echo "📋 VERIFICANDO PUERTOS"
echo "----------------------"

# Verificar puerto 5000 (backend)
if lsof -i :5000 &> /dev/null; then
    show_status 0 "Puerto 5000 está en uso (backend)"
    echo "   Proceso: $(lsof -i :5000 | tail -n 1 | awk '{print $1, $2}')"
else
    show_status 1 "Puerto 5000 no está en uso"
fi

# Verificar puerto 3000 (frontend dev)
if lsof -i :3000 &> /dev/null; then
    show_status 0 "Puerto 3000 está en uso (frontend dev)"
else
    show_status 1 "Puerto 3000 no está en uso"
fi

echo ""
echo "📋 VERIFICANDO CONSTRUCCIÓN DEL FRONTEND"
echo "----------------------------------------"

if [ -d "frontend/build" ]; then
    show_status 0 "Directorio frontend/build existe"
    if [ -f "frontend/build/index.html" ]; then
        show_status 0 "Archivo index.html existe en build"
    else
        show_status 1 "Archivo index.html no existe en build"
    fi
else
    show_status 1 "Directorio frontend/build no existe"
    echo "   💡 Ejecuta: npm run build en el directorio frontend"
fi

echo ""
echo "📋 RECOMENDACIONES"
echo "------------------"

echo "🔧 Para resolver problemas comunes:"
echo "1. Si MongoDB no está ejecutándose: sudo systemctl start mongod"
echo "2. Si faltan archivos de configuración: copia .env.production.example a .env.production"
echo "3. Si el frontend no está construido: cd frontend && npm run build"
echo "4. Si hay errores de conexión: verifica que REACT_APP_API_URL apunte al dominio correcto"
echo "5. Si hay errores CORS: configura nginx con el archivo nginx-production.conf"

echo ""
echo "✅ Diagnóstico completado"