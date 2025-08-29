#!/bin/bash

# Script para diagnosticar y reparar problemas de autenticación de PostgreSQL
# Tractoreando - Reparación de Autenticación PostgreSQL

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de logging
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "🔧 Tractoreando - Reparador de Autenticación PostgreSQL"
echo "================================================="
echo ""

# Verificar si PostgreSQL está instalado
log_info "Verificando instalación de PostgreSQL..."
if ! command -v psql &> /dev/null; then
    log_error "PostgreSQL no está instalado"
    log_info "Instala PostgreSQL primero: sudo apt update && sudo apt install -y postgresql postgresql-contrib"
    exit 1
fi
log_success "PostgreSQL está instalado"

# Verificar si PostgreSQL está ejecutándose
log_info "Verificando estado del servicio PostgreSQL..."
if ! systemctl is-active --quiet postgresql; then
    log_warning "PostgreSQL no está ejecutándose. Intentando iniciar..."
    sudo systemctl start postgresql
    sleep 3
    if systemctl is-active --quiet postgresql; then
        log_success "PostgreSQL iniciado exitosamente"
    else
        log_error "No se pudo iniciar PostgreSQL"
        exit 1
    fi
else
    log_success "PostgreSQL está ejecutándose"
fi

# Verificar usuarios existentes
log_info "Verificando usuarios de PostgreSQL existentes..."
sudo -u postgres psql -c "\du"

# Verificar si existe la base de datos tractoreando
log_info "Verificando base de datos 'tractoreando'..."
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw tractoreando; then
    log_success "Base de datos 'tractoreando' existe"
else
    log_warning "Base de datos 'tractoreando' no existe. Creándola..."
    sudo -u postgres createdb tractoreando
    log_success "Base de datos 'tractoreando' creada"
fi

# Recrear usuario tractoreando_user
log_info "Recreando usuario 'tractoreando_user'..."
sudo -u postgres psql -c "DROP USER IF EXISTS tractoreando_user;"
sudo -u postgres psql -c "CREATE USER tractoreando_user WITH PASSWORD 'tractoreando123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE tractoreando TO tractoreando_user;"
sudo -u postgres psql -c "ALTER USER tractoreando_user CREATEDB;"
log_success "Usuario 'tractoreando_user' recreado con permisos completos"

# Configurar pg_hba.conf
log_info "Configurando autenticación en pg_hba.conf..."
PG_VERSION=$(sudo -u postgres psql -c "SHOW server_version;" | grep -oP '\d+\.\d+' | head -1)
PG_HBA_FILE="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"

if [[ -f "$PG_HBA_FILE" ]]; then
    # Hacer backup del archivo original
    sudo cp "$PG_HBA_FILE" "${PG_HBA_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Remover entradas existentes para tractoreando_user
    sudo sed -i '/tractoreando_user/d' "$PG_HBA_FILE"
    
    # Agregar nueva configuración al inicio del archivo (después de los comentarios)
    sudo sed -i '/^# TYPE/a\# Tractoreando database access\nlocal   tractoreando    tractoreando_user                     md5\nhost    tractoreando    tractoreando_user    127.0.0.1/32     md5\nhost    tractoreando    tractoreando_user    ::1/128          md5' "$PG_HBA_FILE"
    
    log_success "Configuración de pg_hba.conf actualizada"
else
    log_error "No se encontró el archivo pg_hba.conf en $PG_HBA_FILE"
    exit 1
fi

# Reiniciar PostgreSQL
log_info "Reiniciando PostgreSQL para aplicar cambios..."
sudo systemctl restart postgresql
sleep 5

if systemctl is-active --quiet postgresql; then
    log_success "PostgreSQL reiniciado exitosamente"
else
    log_error "Error al reiniciar PostgreSQL"
    exit 1
fi

# Probar conexión
log_info "Probando conexión con tractoreando_user..."
if PGPASSWORD='tractoreando123' psql -h localhost -U tractoreando_user -d tractoreando -c "SELECT 'Conexión exitosa' as resultado;" >/dev/null 2>&1; then
    log_success "✅ Conexión exitosa con tractoreando_user"
    log_success "🎉 Problema de autenticación resuelto"
else
    log_error "❌ Aún hay problemas de conexión"
    log_info "Información adicional de diagnóstico:"
    log_info "1. Verificar logs de PostgreSQL: sudo tail -f /var/log/postgresql/postgresql-${PG_VERSION}-main.log"
    log_info "2. Verificar configuración: sudo cat $PG_HBA_FILE | grep tractoreando"
    exit 1
fi

echo ""
log_success "🔧 Reparación completada exitosamente"
log_info "Ahora puedes ejecutar: node create-admin-production.js"
echo ""