#!/bin/bash

# Script para construir la aplicación para producción
# Este script compila el frontend y prepara la aplicación para despliegue

set -e

echo "🚀 Iniciando construcción para producción..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json. Ejecuta este script desde el directorio raíz del proyecto."
    exit 1
fi

# Instalar dependencias del backend
echo "📦 Instalando dependencias del backend..."
npm install --production

# Cambiar al directorio del frontend
cd frontend

# Verificar que existe package.json en frontend
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json en el directorio frontend."
    exit 1
fi

# Instalar dependencias del frontend
echo "📦 Instalando dependencias del frontend..."
npm install

# Construir la aplicación para producción
echo "🔨 Construyendo aplicación frontend..."
npm run build

# Volver al directorio raíz
cd ..

echo "✅ Construcción completada exitosamente"
echo "📁 Los archivos de producción están en: frontend/build/"
echo "🚀 La aplicación está lista para despliegue"

# Mostrar información sobre el despliegue
echo ""
echo "📋 Pasos para desplegar:"
echo "1. Copia todos los archivos del proyecto al servidor"
echo "2. Configura las variables de entorno en .env"
echo "3. Ejecuta: NODE_ENV=production npm start"
echo "4. La aplicación estará disponible en el puerto configurado (por defecto 5000)"