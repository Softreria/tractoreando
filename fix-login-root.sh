#!/bin/bash

# Script optimizado para ejecutar como ROOT en el servidor de producción
# Soluciona el problema de login faltante del archivo .env

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de logging
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Variables
APP_DIR="/opt/tractoreando"
APP_USER="tractoreando"

# Verificar que se ejecuta como root
if [[ $EUID -ne 0 ]]; then
    log_error "Este script debe ejecutarse como root"
    log_info "Ejecuta: sudo $0"
    exit 1
fi

log_info "🔧 Reparando problema de login en Tractoreando..."

# 1. Verificar directorio de aplicación
if [[ ! -d "$APP_DIR" ]]; then
    log_error "Directorio de aplicación no encontrado: $APP_DIR"
    exit 1
fi

# 2. Backup del .env actual si existe
if [[ -f "$APP_DIR/.env" ]]; then
    log_info "Creando backup del .env actual..."
    cp "$APP_DIR/.env" "$APP_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
    log_success "Backup creado"
fi

# 3. Generar JWT_SECRET único
log_info "Generando JWT_SECRET seguro..."
JWT_SECRET=$(openssl rand -base64 64 | tr -d "\n")

# 4. Crear archivo .env
log_info "Creando archivo .env..."
cat > "$APP_DIR/.env" <<EOF
# Variables de entorno para producción - Tractoreando
# Generado automáticamente: $(date)

NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# URLs base (CAMBIAR POR TU DOMINIO REAL)
BASE_URL=https://tu-dominio.com
FRONTEND_URL=https://tu-dominio.com
BACKEND_URL=https://tu-dominio.com/api

# Base de datos
MONGODB_URI=mongodb://localhost:27017/tractoreando_prod

# Autenticación (CRÍTICO - NO CAMBIAR)
JWT_SECRET=$JWT_SECRET
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12

# Archivos y uploads
UPLOAD_PATH=/opt/tractoreando/uploads
MAX_FILE_SIZE=10mb
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx

# CORS (CAMBIAR POR TU DOMINIO REAL)
CORS_ORIGIN=https://tu-dominio.com
CORS_CREDENTIALS=true
TRUST_PROXY=true
EOF

# 5. Configurar permisos
log_info "Configurando permisos..."
chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"
log_success "Permisos configurados"

# 6. Verificar PM2
if ! command -v pm2 &> /dev/null; then
    log_error "PM2 no está instalado"
    log_info "Instalando PM2..."
    npm install -g pm2
fi

# 7. Reiniciar aplicación
log_info "Reiniciando aplicación..."

# Detener aplicación actual
if su - "$APP_USER" -c "pm2 list" | grep -q "tractoreando"; then
    log_info "Deteniendo aplicación actual..."
    su - "$APP_USER" -c "pm2 stop tractoreando" 2>/dev/null || true
    su - "$APP_USER" -c "pm2 delete tractoreando" 2>/dev/null || true
fi

# Iniciar aplicación
log_info "Iniciando aplicación..."
cd "$APP_DIR"
su - "$APP_USER" -c "cd $APP_DIR && pm2 start ecosystem.config.js" || {
    log_error "Error al iniciar con ecosystem.config.js"
    log_info "Intentando iniciar directamente..."
    su - "$APP_USER" -c "cd $APP_DIR && pm2 start server.js --name tractoreando"
}

# Guardar configuración PM2
su - "$APP_USER" -c "pm2 save"

# 8. Verificar estado
log_info "Verificando estado..."
sleep 3

PM2_STATUS=$(su - "$APP_USER" -c "pm2 list")
if echo "$PM2_STATUS" | grep -q "online"; then
    log_success "✅ Aplicación iniciada correctamente"
    
    # Probar API
    log_info "Probando API..."
    if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        log_success "✅ API responde correctamente"
    else
        log_warning "⚠️  API no responde (puede ser normal si no hay endpoint /api/health)"
    fi
else
    log_error "❌ Error al iniciar la aplicación"
    log_info "Estado de PM2:"
    echo "$PM2_STATUS"
    log_info "Logs recientes:"
    su - "$APP_USER" -c "pm2 logs --lines 10"
    exit 1
fi

# 9. Resumen
log_success "\n🎉 ¡Reparación completada!"
echo ""
log_info "📋 Resumen:"
echo "   ✅ Archivo .env creado con JWT_SECRET único"
echo "   ✅ Permisos configurados correctamente"
echo "   ✅ Aplicación reiniciada con PM2"
echo "   ✅ Estado: $(echo "$PM2_STATUS" | grep tractoreando | awk '{print $10}')"
echo ""
log_warning "📝 IMPORTANTE:"
echo "   • Actualiza las URLs en $APP_DIR/.env con tu dominio real"
echo "   • El JWT_SECRET se generó automáticamente y es único"
echo "   • Prueba el login en tu aplicación web ahora"
echo ""
log_info "🔍 Comandos útiles:"
echo "   • Ver estado: su - $APP_USER -c 'pm2 list'"
echo "   • Ver logs: su - $APP_USER -c 'pm2 logs tractoreando'"
echo "   • Reiniciar: su - $APP_USER -c 'pm2 restart tractoreando'"
echo ""
log_success "¡El problema de login debería estar resuelto!"