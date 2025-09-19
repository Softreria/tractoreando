#!/bin/bash

# Script de sincronización automática para despliegues
# Este script sincroniza el código local con el servidor de producción

set -e  # Salir si hay algún error

# Configuración
LOCAL_DIR="/Users/davidhernandezlujan/Documents/tractoreando"
REMOTE_HOST="192.168.18.13"
REMOTE_USER="root"
REMOTE_DIR="/opt/tractoreando"
BACKUP_DIR="/opt/tractoreando-backup-$(date +%Y%m%d-%H%M%S)"

echo "🚀 Iniciando sincronización con producción..."

# Verificar que estamos en el directorio correcto
if [ ! -f "$LOCAL_DIR/package.json" ]; then
    echo "❌ Error: No se encontró package.json en $LOCAL_DIR"
    exit 1
fi

# Crear backup en producción
echo "📦 Creando backup en producción..."
ssh $REMOTE_USER@$REMOTE_HOST "cp -r $REMOTE_DIR $BACKUP_DIR"

# Archivos críticos que NO deben sobrescribirse
EXCLUDE_FILES=(
    ".env.production"
    "node_modules/"
    "frontend/node_modules/"
    "frontend/build/"
    ".git/"
    "logs/"
    "uploads/"
)

# Crear lista de exclusiones para rsync
EXCLUDE_ARGS=""
for file in "${EXCLUDE_FILES[@]}"; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude=$file"
done

# Sincronizar archivos
echo "📁 Sincronizando archivos..."
rsync -avz --delete $EXCLUDE_ARGS \
    "$LOCAL_DIR/" \
    "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

# Instalar dependencias si es necesario
echo "📦 Verificando dependencias..."
ssh $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && npm install --production"

# Construir frontend si es necesario
echo "🏗️ Construyendo frontend..."
ssh $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR/frontend && npm install && npm run build"

# Reiniciar servicios
echo "🔄 Reiniciando servicios..."
ssh $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && pm2 restart tractoreando || echo 'PM2 no configurado, reinicio manual necesario'"

echo "✅ Sincronización completada exitosamente!"
echo "📦 Backup creado en: $BACKUP_DIR"
echo ""
echo "Para verificar el estado del servidor:"
echo "ssh $REMOTE_USER@$REMOTE_HOST 'cd $REMOTE_DIR && pm2 status'"
echo ""
echo "Para ver logs:"
echo "ssh $REMOTE_USER@$REMOTE_HOST 'cd $REMOTE_DIR && pm2 logs tractoreando'"