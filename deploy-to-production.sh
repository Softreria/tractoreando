#!/bin/bash

# Script de despliegue a producción - Tractoreando
# Ejecutar desde el directorio local del proyecto

echo "🚀 Iniciando despliegue a producción..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración (ajustar según tu servidor)
SERVER_USER="root"  # o tu usuario
SERVER_HOST="tractoreando.softreria.com"  # o la IP de tu servidor
SERVER_PATH="/var/www/tractoreando"  # ruta en el servidor
BACKUP_PATH="/var/backups/tractoreando"

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

# Función para mostrar info
show_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 1. Verificar conexión SSH
echo "🔍 Verificando conexión SSH..."
if ! ssh -o ConnectTimeout=10 $SERVER_USER@$SERVER_HOST "echo 'Conexión SSH exitosa'" 2>/dev/null; then
    show_error "No se puede conectar al servidor via SSH"
    echo "Verifica:"
    echo "  - Que el servidor esté accesible"
    echo "  - Que tengas las claves SSH configuradas"
    echo "  - Que el usuario y host sean correctos"
    exit 1
fi
show_success "Conexión SSH verificada"

# 2. Crear backup en el servidor
echo "💾 Creando backup en el servidor..."
ssh $SERVER_USER@$SERVER_HOST "
    mkdir -p $BACKUP_PATH
    cd $SERVER_PATH
    tar -czf $BACKUP_PATH/backup-\$(date +%Y%m%d-%H%M%S).tar.gz \
        --exclude=node_modules \
        --exclude=frontend/node_modules \
        --exclude=logs \
        .
    echo 'Backup creado en $BACKUP_PATH'
"

if [ $? -eq 0 ]; then
    show_success "Backup creado exitosamente"
else
    show_error "Error creando backup"
    exit 1
fi

# 3. Subir archivos corregidos
echo "📤 Subiendo archivos corregidos..."

# Lista de archivos a subir
FILES_TO_UPLOAD=(
    "server.js"
    "middleware/auth.js"
    "routes/auth.js"
    "routes/companies.js"
    "routes/branches.js"
    "routes/vehicles.js"
    "routes/maintenance.js"
    "routes/users.js"
    "routes/reports.js"
    "routes/settings.js"
    "utils/reportHelpers.js"
    "fix-database-production.sql"
    "check-app-status.js"
    "setup-production-fixed.sh"
)

# Crear directorio utils si no existe
ssh $SERVER_USER@$SERVER_HOST "mkdir -p $SERVER_PATH/utils"

# Subir cada archivo
for file in "${FILES_TO_UPLOAD[@]}"; do
    if [ -f "$file" ]; then
        echo "  📁 Subiendo $file..."
        scp "$file" $SERVER_USER@$SERVER_HOST:$SERVER_PATH/$file
        if [ $? -eq 0 ]; then
            show_success "  $file subido"
        else
            show_error "  Error subiendo $file"
        fi
    else
        show_warning "  $file no encontrado localmente"
    fi
done

# 4. Ejecutar correcciones en el servidor
echo "🔧 Ejecutando correcciones en el servidor..."

ssh $SERVER_USER@$SERVER_HOST "
    cd $SERVER_PATH
    
    echo '🗄️  Arreglando base de datos PostgreSQL...'
    sudo -u postgres psql -f fix-database-production.sql
    
    if [ \$? -eq 0 ]; then
        echo '✅ Base de datos corregida'
    else
        echo '❌ Error en base de datos'
    fi
    
    echo '📦 Instalando dependencias si es necesario...'
    npm install --production
    
    echo '🔄 Reiniciando aplicación...'
    pm2 restart tractoreando || pm2 start ecosystem.config.js --env production
    
    echo '⏳ Esperando que la aplicación inicie...'
    sleep 10
    
    echo '🔍 Verificando estado...'
    node check-app-status.js
"

# 5. Verificar despliegue
echo "🔍 Verificando despliegue..."

# Esperar un poco más para que la aplicación inicie completamente
sleep 5

# Probar endpoint de salud
if curl -f -s "https://$SERVER_HOST/api/health" > /dev/null; then
    show_success "API funcionando correctamente"
else
    show_error "API no responde correctamente"
    echo "Verificando logs..."
    ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && pm2 logs tractoreando --lines 20"
fi

# 6. Mostrar resumen
echo ""
echo "📋 RESUMEN DEL DESPLIEGUE:"
echo "================================"
show_info "Servidor: $SERVER_HOST"
show_info "Ruta: $SERVER_PATH"
show_info "Backup: $BACKUP_PATH"
echo ""

# Mostrar comandos útiles
echo "🔧 COMANDOS ÚTILES:"
echo "Ver logs:     ssh $SERVER_USER@$SERVER_HOST 'pm2 logs tractoreando'"
echo "Reiniciar:    ssh $SERVER_USER@$SERVER_HOST 'pm2 restart tractoreando'"
echo "Estado:       ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_PATH && node check-app-status.js'"
echo "Rollback:     ssh $SERVER_USER@$SERVER_HOST 'cd $BACKUP_PATH && tar -xzf backup-*.tar.gz -C $SERVER_PATH'"
echo ""

show_success "¡Despliegue completado!"
echo "🌐 Verifica la aplicación en: https://$SERVER_HOST"