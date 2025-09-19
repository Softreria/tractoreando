#!/bin/bash

echo "🔧 Configurando Tractoreando para Producción - VERSIÓN CORREGIDA"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar errores
show_error() {
    echo -e "${RED}❌ Error: $1${NC}"
}

# Función para mostrar éxito
show_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Función para mostrar advertencias
show_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    show_error "No se encontró package.json. Ejecuta este script desde el directorio raíz del proyecto."
    exit 1
fi

# 2. Verificar Node.js
if ! command -v node &> /dev/null; then
    show_error "Node.js no está instalado"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    show_error "Se requiere Node.js 16 o superior. Versión actual: $(node -v)"
    exit 1
fi

show_success "Node.js $(node -v) detectado"

# 3. Verificar PostgreSQL
if ! command -v psql &> /dev/null; then
    show_error "PostgreSQL no está instalado"
    exit 1
fi

show_success "PostgreSQL detectado"

# 4. Crear usuario y base de datos PostgreSQL
echo "🗄️  Configurando base de datos PostgreSQL..."

# Ejecutar el script SQL como usuario postgres
sudo -u postgres psql -f fix-database-production.sql

if [ $? -eq 0 ]; then
    show_success "Base de datos configurada correctamente"
else
    show_error "Error configurando la base de datos"
    exit 1
fi

# 5. Instalar dependencias del backend
echo "📦 Instalando dependencias del backend..."
npm install --production

if [ $? -eq 0 ]; then
    show_success "Dependencias del backend instaladas"
else
    show_error "Error instalando dependencias del backend"
    exit 1
fi

# 6. Verificar variables de entorno
if [ ! -f ".env.production" ]; then
    show_error "Archivo .env.production no encontrado"
    exit 1
fi

show_success "Archivo .env.production encontrado"

# 7. Sincronizar modelos con la base de datos
echo "🔄 Sincronizando modelos con la base de datos..."
NODE_ENV=production node sync-models.js

if [ $? -eq 0 ]; then
    show_success "Modelos sincronizados correctamente"
else
    show_warning "Error sincronizando modelos, pero continuando..."
fi

# 8. Construir frontend
echo "🏗️  Construyendo frontend..."
cd frontend

# Instalar dependencias del frontend
npm install --production

if [ $? -eq 0 ]; then
    show_success "Dependencias del frontend instaladas"
else
    show_error "Error instalando dependencias del frontend"
    exit 1
fi

# Construir para producción
npm run build

if [ $? -eq 0 ]; then
    show_success "Frontend construido correctamente"
else
    show_error "Error construyendo el frontend"
    exit 1
fi

cd ..

# 9. Configurar PM2 si está disponible
if command -v pm2 &> /dev/null; then
    echo "🚀 Configurando PM2..."
    
    # Detener procesos existentes
    pm2 delete tractoreando 2>/dev/null || true
    
    # Iniciar con PM2
    pm2 start ecosystem.config.js --env production
    
    if [ $? -eq 0 ]; then
        show_success "Aplicación iniciada con PM2"
        pm2 save
        pm2 startup
    else
        show_error "Error iniciando con PM2"
        exit 1
    fi
else
    show_warning "PM2 no está instalado. Instálalo con: npm install -g pm2"
    echo "💡 Para iniciar manualmente: NODE_ENV=production node server.js"
fi

# 10. Crear usuario administrador
echo "👤 Creando usuario administrador..."
NODE_ENV=production node create-admin-production.js

if [ $? -eq 0 ]; then
    show_success "Usuario administrador creado"
else
    show_warning "Error creando usuario administrador, pero continuando..."
fi

# 11. Mostrar información final
echo ""
echo "🎉 ¡Instalación completada!"
echo ""
echo "📋 Información importante:"
echo "   • Puerto: 3000"
echo "   • Base de datos: tractoreando"
echo "   • Usuario DB: tractoreando_user"
echo "   • Logs: logs/"
echo ""
echo "🔧 Comandos útiles:"
echo "   • Ver logs: pm2 logs tractoreando"
echo "   • Reiniciar: pm2 restart tractoreando"
echo "   • Estado: pm2 status"
echo "   • Monitoreo: pm2 monit"
echo ""
echo "🌐 La aplicación debería estar disponible en:"
echo "   https://tractoreando.softreria.com"
echo ""

show_success "¡Tractoreando está listo para producción!"