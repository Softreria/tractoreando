#!/bin/bash

# Script de inicialización de PostgreSQL para Tractoreando
# Este script configura automáticamente PostgreSQL para desarrollo y producción

set -e

echo "🐘 Configurando PostgreSQL para Tractoreando..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar si PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL no está instalado. Por favor, instálalo primero:"
    echo "Ubuntu/Debian: sudo apt install postgresql postgresql-contrib"
    echo "macOS: brew install postgresql"
    echo "CentOS/RHEL: sudo yum install postgresql-server postgresql-contrib"
    exit 1
fi

# Verificar si PostgreSQL está ejecutándose
if ! pg_isready -q; then
    print_warning "PostgreSQL no está ejecutándose. Intentando iniciarlo..."
    
    # Intentar iniciar PostgreSQL según el sistema
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start postgresql
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql
    fi
    
    # Verificar nuevamente
    if ! pg_isready -q; then
        print_error "No se pudo iniciar PostgreSQL. Por favor, inícialo manualmente."
        exit 1
    fi
fi

print_status "PostgreSQL está ejecutándose"

# Función para ejecutar comandos SQL
execute_sql() {
    local sql="$1"
    local db="${2:-postgres}"
    local user="${3:-postgres}"
    
    echo "$sql" | sudo -u postgres psql -d "$db" -U "$user" -v ON_ERROR_STOP=1
}

# Crear usuario y base de datos de desarrollo
print_status "Configurando base de datos de desarrollo..."

# Verificar si el usuario postgres ya existe con la contraseña correcta
if sudo -u postgres psql -c "\du" | grep -q "postgres"; then
    print_status "Usuario postgres ya existe"
else
    execute_sql "ALTER USER postgres PASSWORD 'postgres';"
    print_status "Contraseña del usuario postgres actualizada"
fi

# Crear base de datos de desarrollo si no existe
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw tractoreando_dev; then
    print_status "Base de datos tractoreando_dev ya existe"
else
    execute_sql "CREATE DATABASE tractoreando_dev OWNER postgres;"
    execute_sql "GRANT ALL PRIVILEGES ON DATABASE tractoreando_dev TO postgres;"
    print_status "Base de datos tractoreando_dev creada"
fi

# Crear usuario y base de datos de producción
print_status "Configurando base de datos de producción..."

# Crear usuario de producción si no existe
if sudo -u postgres psql -c "\du" | grep -q "tractoreando_user"; then
    print_status "Usuario tractoreando_user ya existe"
else
    execute_sql "CREATE USER tractoreando_user WITH PASSWORD 'tractoreando123';"
    print_status "Usuario tractoreando_user creado"
fi

# Crear base de datos de producción si no existe
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw tractoreando; then
    print_status "Base de datos tractoreando ya existe"
else
    execute_sql "CREATE DATABASE tractoreando OWNER tractoreando_user;"
    execute_sql "GRANT ALL PRIVILEGES ON DATABASE tractoreando TO tractoreando_user;"
    print_status "Base de datos tractoreando creada"
fi

# Verificar conexiones
print_status "Verificando conexiones..."

# Verificar conexión de desarrollo
if PGPASSWORD=postgres psql -h localhost -U postgres -d tractoreando_dev -c "SELECT 1;" &> /dev/null; then
    print_status "Conexión de desarrollo: OK"
else
    print_warning "Conexión de desarrollo: FALLO"
fi

# Verificar conexión de producción
if PGPASSWORD=tractoreando123 psql -h localhost -U tractoreando_user -d tractoreando -c "SELECT 1;" &> /dev/null; then
    print_status "Conexión de producción: OK"
else
    print_warning "Conexión de producción: FALLO"
fi

echo ""
print_status "Configuración de PostgreSQL completada!"
echo ""
echo "📋 Información de conexión:"
echo "   Desarrollo:"
echo "     - Host: localhost"
echo "     - Puerto: 5432"
echo "     - Base de datos: tractoreando_dev"
echo "     - Usuario: postgres"
echo "     - Contraseña: postgres"
echo ""
echo "   Producción:"
echo "     - Host: localhost"
echo "     - Puerto: 5432"
echo "     - Base de datos: tractoreando"
echo "     - Usuario: tractoreando_user"
echo "     - Contraseña: tractoreando123"
echo ""
print_warning "IMPORTANTE: Cambia las contraseñas en producción por seguridad!"
echo ""
echo "🚀 Ahora puedes ejecutar:"
echo "   npm run dev    # Para desarrollo"
echo "   npm start      # Para producción"