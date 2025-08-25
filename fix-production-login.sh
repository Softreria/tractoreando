#!/bin/bash

# Script para solucionar el problema de login en producción
# Este script debe ejecutarse en el servidor de producción

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Variables
APP_DIR="/opt/tractoreando"
APP_USER="tractoreando"
BACKUP_DIR="/opt/tractoreando/backups"

# Verificar si se ejecuta como root
if [[ $EUID -eq 0 ]]; then
    log_error "Este script no debe ejecutarse como root"
    exit 1
fi

# Función principal
fix_production_login() {
    log_info "🔧 Iniciando reparación del login en producción..."
    
    # 1. Verificar que el directorio de la aplicación existe
    if [[ ! -d "$APP_DIR" ]]; then
        log_error "El directorio de la aplicación no existe: $APP_DIR"
        exit 1
    fi
    
    # 2. Crear backup del archivo .env actual si existe
    if [[ -f "$APP_DIR/.env" ]]; then
        log_info "Creando backup del archivo .env actual..."
        sudo mkdir -p "$BACKUP_DIR"
        sudo cp "$APP_DIR/.env" "$BACKUP_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
        log_success "Backup creado"
    fi
    
    # 3. Crear archivo .env basado en .env.production
    log_info "Creando archivo .env para producción..."
    
    if [[ -f "$APP_DIR/.env.production" ]]; then
        # Copiar desde .env.production y modificar valores críticos
        sudo cp "$APP_DIR/.env.production" "$APP_DIR/.env"
        
        # Generar JWT_SECRET único si no está configurado correctamente
        JWT_SECRET=$(openssl rand -base64 64 | tr -d "\n")
        
        # Actualizar variables críticas
        sudo sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/g" "$APP_DIR/.env"
        sudo sed -i "s/NODE_ENV=.*/NODE_ENV=production/g" "$APP_DIR/.env"
        
        log_success "Archivo .env creado y configurado"
    else
        # Crear archivo .env desde cero
        log_warning "No se encontró .env.production, creando archivo .env básico..."
        
        JWT_SECRET=$(openssl rand -base64 64 | tr -d "\n")
        
        sudo tee "$APP_DIR/.env" > /dev/null <<EOF
# Variables de entorno para producción - Tractoreando
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# URLs base de la aplicación
BASE_URL=https://tu-dominio.com
FRONTEND_URL=https://tu-dominio.com
BACKEND_URL=https://tu-dominio.com/api

# BASE DE DATOS
MONGODB_URI=mongodb://localhost:27017/tractoreando_prod

# AUTENTICACIÓN
JWT_SECRET=$JWT_SECRET
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12

# ARCHIVOS Y UPLOADS
UPLOAD_PATH=/opt/tractoreando/uploads
MAX_FILE_SIZE=10mb
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx

# CORS
CORS_ORIGIN=https://tu-dominio.com
CORS_CREDENTIALS=true
TRUST_PROXY=true
EOF
        
        log_success "Archivo .env básico creado"
    fi
    
    # 4. Establecer permisos correctos
    log_info "Configurando permisos del archivo .env..."
    sudo chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
    sudo chmod 600 "$APP_DIR/.env"
    log_success "Permisos configurados"
    
    # 5. Verificar que PM2 está instalado
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 no está instalado. Instálalo con: npm install -g pm2"
        exit 1
    fi
    
    # 6. Reiniciar la aplicación
    log_info "Reiniciando la aplicación..."
    
    # Detener la aplicación si está corriendo
    if sudo -u "$APP_USER" pm2 list | grep -q "tractoreando"; then
        log_info "Deteniendo aplicación actual..."
        sudo -u "$APP_USER" pm2 stop tractoreando || true
        sudo -u "$APP_USER" pm2 delete tractoreando || true
    fi
    
    # Iniciar la aplicación
    log_info "Iniciando aplicación..."
    cd "$APP_DIR"
    sudo -u "$APP_USER" pm2 start ecosystem.config.js
    sudo -u "$APP_USER" pm2 save
    
    # 7. Verificar que la aplicación está funcionando
    log_info "Verificando estado de la aplicación..."
    sleep 5
    
    if sudo -u "$APP_USER" pm2 list | grep -q "online"; then
        log_success "✅ Aplicación iniciada correctamente"
        
        # Probar endpoint de salud
        log_info "Probando endpoint de salud..."
        if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
            log_success "✅ API respondiendo correctamente"
        else
            log_warning "⚠️  API no responde en el endpoint de salud"
        fi
    else
        log_error "❌ Error al iniciar la aplicación"
        log_info "Logs de PM2:"
        sudo -u "$APP_USER" pm2 logs tractoreando --lines 20
        exit 1
    fi
    
    # 8. Mostrar información importante
    log_info "\n📋 Información importante:"
    echo "   • Archivo .env creado en: $APP_DIR/.env"
    echo "   • JWT_SECRET generado automáticamente"
    echo "   • Backup del .env anterior (si existía) en: $BACKUP_DIR"
    echo "   • Aplicación reiniciada con PM2"
    
    log_success "\n🎉 Reparación del login completada exitosamente"
    log_info "\n📝 Próximos pasos:"
    echo "   1. Actualiza las URLs en el archivo .env con tu dominio real"
    echo "   2. Configura la conexión a la base de datos si es necesario"
    echo "   3. Prueba el login en la aplicación web"
    echo "   4. Verifica los logs con: pm2 logs tractoreando"
}

# Función de ayuda
show_help() {
    echo "Uso: $0 [OPCIÓN]"
    echo ""
    echo "Opciones:"
    echo "  fix     Reparar el problema de login (por defecto)"
    echo "  status  Mostrar estado actual de la aplicación"
    echo "  logs    Mostrar logs de la aplicación"
    echo "  help    Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 fix     # Reparar problema de login"
    echo "  $0 status  # Ver estado de la aplicación"
    echo "  $0 logs    # Ver logs de PM2"
}

# Función para mostrar estado
show_status() {
    log_info "📊 Estado de la aplicación Tractoreando:"
    echo ""
    
    # Estado de PM2
    if command -v pm2 &> /dev/null; then
        echo "🔄 Estado de PM2:"
        sudo -u "$APP_USER" pm2 list
        echo ""
    else
        log_warning "PM2 no está instalado"
    fi
    
    # Verificar archivo .env
    if [[ -f "$APP_DIR/.env" ]]; then
        log_success "✅ Archivo .env existe"
        echo "   Ubicación: $APP_DIR/.env"
        echo "   Permisos: $(ls -la $APP_DIR/.env | awk '{print $1, $3, $4}')"
    else
        log_error "❌ Archivo .env no existe"
    fi
    
    # Probar conectividad
    echo ""
    log_info "🌐 Probando conectividad:"
    if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        log_success "✅ API responde correctamente"
    else
        log_error "❌ API no responde"
    fi
}

# Función para mostrar logs
show_logs() {
    if command -v pm2 &> /dev/null; then
        log_info "📋 Logs de la aplicación (últimas 50 líneas):"
        sudo -u "$APP_USER" pm2 logs tractoreando --lines 50
    else
        log_error "PM2 no está instalado"
    fi
}

# Procesamiento de argumentos
case "${1:-fix}" in
    fix)
        fix_production_login
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Opción no válida: $1"
        show_help
        exit 1
        ;;
esac