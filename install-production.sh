#!/bin/bash

# Script de instalación para producción - Tractoreando
# Autor: Sistema de Gestión de Flotas
# Versión: 1.0

set -e  # Salir si hay algún error

echo "🚀 Iniciando instalación de Tractoreando en producción..."
echo "================================================"

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
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

show_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

show_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ] || [ ! -f "server.js" ]; then
    show_error "Este script debe ejecutarse desde el directorio raíz del proyecto Tractoreando"
    exit 1
fi

# 1. Verificar Node.js y npm
show_message "Verificando Node.js y npm..."
if ! command -v node &> /dev/null; then
    show_error "Node.js no está instalado. Por favor instala Node.js 18+ desde https://nodejs.org"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    show_error "npm no está instalado. Por favor instala npm"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    show_error "Se requiere Node.js 16 o superior. Versión actual: $(node --version)"
    exit 1
fi

show_success "Node.js $(node --version) y npm $(npm --version) están instalados"

# 2. Verificar PostgreSQL
show_message "Verificando PostgreSQL..."
if ! command -v psql &> /dev/null; then
    show_error "PostgreSQL no está instalado. Por favor instala PostgreSQL 12+"
    exit 1
fi

show_success "PostgreSQL está instalado"

# 3. Verificar PM2
show_message "Verificando PM2..."
if ! command -v pm2 &> /dev/null; then
    show_message "Instalando PM2 globalmente..."
    npm install -g pm2
fi

show_success "PM2 está disponible"

# 4. Instalar dependencias del backend
show_message "Instalando dependencias del backend..."
npm install --production
show_success "Dependencias del backend instaladas"

# 5. Instalar dependencias del frontend
show_message "Instalando dependencias del frontend..."
cd frontend
npm install
show_success "Dependencias del frontend instaladas"

# 6. Construir el frontend para producción
show_message "Construyendo frontend para producción..."
npm run build
show_success "Frontend construido exitosamente"

cd ..

# 7. Configurar base de datos
show_message "Configurando base de datos..."
if [ -f ".env.production" ]; then
    source .env.production
    
    # Crear base de datos si no existe
    show_message "Creando base de datos si no existe..."
    createdb $DB_NAME 2>/dev/null || show_warning "La base de datos $DB_NAME ya existe o no se pudo crear"
    
    # Sincronizar modelos
    show_message "Sincronizando modelos de base de datos..."
    NODE_ENV=production node sync-models.js
    
    # Crear usuario administrador
    show_message "Creando usuario administrador..."
    NODE_ENV=production node create-admin.js
    
    show_success "Base de datos configurada"
else
    show_error "Archivo .env.production no encontrado. Por favor configura las variables de entorno."
    exit 1
fi

# 8. Configurar PM2
show_message "Configurando PM2..."
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js --env production
    pm2 save
    pm2 startup
    show_success "Aplicación configurada con PM2"
else
    show_warning "ecosystem.config.js no encontrado. Iniciando con configuración básica..."
    pm2 start server.js --name "tractoreando-backend" --env production
    pm2 save
    pm2 startup
fi

# 9. Verificar instalación
show_message "Verificando instalación..."
sleep 5

if pm2 list | grep -q "online"; then
    show_success "✅ Aplicación iniciada correctamente"
    echo ""
    echo "================================================"
    echo "🎉 INSTALACIÓN COMPLETADA EXITOSAMENTE"
    echo "================================================"
    echo ""
    echo "📋 Información importante:"
    echo "   • Backend: http://localhost:8000"
    echo "   • Admin: admin@tractoreando.com / Admin123!"
    echo "   • Logs: pm2 logs tractoreando-backend"
    echo "   • Estado: pm2 status"
    echo "   • Reiniciar: pm2 restart tractoreando-backend"
    echo ""
    echo "🔧 Próximos pasos:"
    echo "   1. Configura tu servidor web (Nginx/Apache)"
    echo "   2. Configura SSL/HTTPS"
    echo "   3. Configura SMTP en .env.production"
    echo "   4. Cambia la contraseña del administrador"
    echo ""
else
    show_error "❌ Error en la instalación. Revisa los logs con: pm2 logs"
    exit 1
fi

echo "🚀 ¡Tractoreando está listo para producción!"