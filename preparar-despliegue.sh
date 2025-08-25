#!/bin/bash

# Script para preparar archivos para despliegue en servidor de producción
# Uso: ./preparar-despliegue.sh

set -e

echo "🚀 Preparando archivos para despliegue en servidor de producción..."
echo "📍 Servidor: tractoreando.softreria.com"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
show_message() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

show_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

show_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

show_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "server.js" ] || [ ! -d "frontend" ]; then
    show_error "Este script debe ejecutarse desde el directorio raíz del proyecto"
    exit 1
fi

# Limpiar builds anteriores
show_message "Limpiando builds anteriores..."
rm -rf frontend/build
rm -f tractoreando-deploy.tar.gz

# Instalar dependencias del frontend
show_message "Instalando dependencias del frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
else
    show_success "Dependencias del frontend ya instaladas"
fi

# Construir frontend
show_message "Construyendo frontend para producción..."
npm run build

if [ ! -d "build" ]; then
    show_error "Error: No se pudo construir el frontend"
    exit 1
fi

show_success "Frontend construido exitosamente"
cd ..

# Instalar dependencias del backend
show_message "Verificando dependencias del backend..."
if [ ! -d "node_modules" ]; then
    npm install
else
    show_success "Dependencias del backend ya instaladas"
fi

# Verificar archivos de configuración
show_message "Verificando archivos de configuración..."

if [ ! -f ".env.production" ]; then
    show_error "Archivo .env.production no encontrado"
    exit 1
fi

if [ ! -f "frontend/.env.production" ]; then
    show_error "Archivo frontend/.env.production no encontrado"
    exit 1
fi

if [ ! -f "nginx-production.conf" ]; then
    show_error "Archivo nginx-production.conf no encontrado"
    exit 1
fi

if [ ! -f "ecosystem.config.js" ]; then
    show_error "Archivo ecosystem.config.js no encontrado"
    exit 1
fi

show_success "Todos los archivos de configuración están presentes"

# Crear archivo comprimido para despliegue
show_message "Creando archivo comprimido para despliegue..."

tar -czf tractoreando-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.gitignore' \
    --exclude='frontend/node_modules' \
    --exclude='frontend/src' \
    --exclude='frontend/public' \
    --exclude='*.log' \
    --exclude='*.tmp' \
    --exclude='.DS_Store' \
    --exclude='preparar-despliegue.sh' \
    --exclude='DESPLIEGUE-SERVIDOR-PRODUCCION.md' \
    .

if [ ! -f "tractoreando-deploy.tar.gz" ]; then
    show_error "Error al crear archivo comprimido"
    exit 1
fi

show_success "Archivo comprimido creado: tractoreando-deploy.tar.gz"

# Mostrar información del archivo
FILE_SIZE=$(du -h tractoreando-deploy.tar.gz | cut -f1)
show_message "Tamaño del archivo: $FILE_SIZE"

# Mostrar resumen
echo ""
echo "📦 RESUMEN DEL DESPLIEGUE"
echo "========================"
echo "✓ Frontend construido en: frontend/build/"
echo "✓ Archivo de despliegue: tractoreando-deploy.tar.gz ($FILE_SIZE)"
echo "✓ Configuración de producción verificada"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Subir tractoreando-deploy.tar.gz al servidor de producción"
echo "2. Seguir la guía en DESPLIEGUE-SERVIDOR-PRODUCCION.md"
echo "3. Configurar Nginx, MongoDB y PM2 en el servidor"
echo ""
echo "🌐 Servidor de destino: https://tractoreando.softreria.com"
echo "🔧 Puerto del backend: 5001"
echo ""
show_success "¡Preparación completada! Archivos listos para despliegue."

# Mostrar comandos para subir al servidor
echo ""
echo "💡 COMANDOS SUGERIDOS PARA SUBIR AL SERVIDOR:"
echo ""
echo "# Opción 1: SCP"
echo "scp tractoreando-deploy.tar.gz usuario@tractoreando.softreria.com:/opt/"
echo ""
echo "# Opción 2: RSYNC"
echo "rsync -avz tractoreando-deploy.tar.gz usuario@tractoreando.softreria.com:/opt/"
echo ""
echo "# Opción 3: FTP/SFTP"
echo "sftp usuario@tractoreando.softreria.com"
echo "put tractoreando-deploy.tar.gz /opt/"
echo ""