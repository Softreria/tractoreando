#!/bin/bash

# Tractoreando - Script de Instalación Simplificado
# Instala la aplicación con PostgreSQL para producción
# Uso: ./install.sh

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Funciones de logging
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🚛 Tractoreando - Instalación Simplificada"
echo "========================================="
echo "Fecha: $(date)"
echo "Usuario: $(whoami)"
echo ""

# Verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Instalar Node.js
install_nodejs() {
    log_info "Verificando Node.js..."
    
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ "$NODE_VERSION" -ge "18" ]]; then
            log_success "Node.js ya está instalado ($(node --version))"
            return
        fi
    fi
    
    log_info "Instalando Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    log_success "Node.js instalado: $(node --version)"
}

# Instalar PostgreSQL
install_postgresql() {
    log_info "Verificando PostgreSQL..."
    
    if command_exists psql; then
        log_success "PostgreSQL ya está instalado"
        return
    fi
    
    log_info "Instalando PostgreSQL..."
    sudo apt-get update
    sudo apt-get install -y postgresql postgresql-contrib
    
    # Iniciar y habilitar PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    log_success "PostgreSQL instalado y ejecutándose"
}

# Instalar PM2
install_pm2() {
    log_info "Verificando PM2..."
    
    if command_exists pm2; then
        log_success "PM2 ya está instalado"
        return
    fi
    
    log_info "Instalando PM2..."
    sudo npm install -g pm2
    
    log_success "PM2 instalado"
}

# Instalar Nginx
install_nginx() {
    log_info "Verificando Nginx..."
    
    if command_exists nginx; then
        log_success "Nginx ya está instalado"
        return
    fi
    
    log_info "Instalando Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
    
    # Iniciar y habilitar Nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    log_success "Nginx instalado y ejecutándose"
}

# Configurar base de datos
setup_database() {
    log_info "Configurando base de datos PostgreSQL..."
    
    # Verificar si PostgreSQL está ejecutándose
    if ! systemctl is-active --quiet postgresql; then
        log_info "Iniciando servicio PostgreSQL..."
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        sleep 3
    fi
    
    # Verificar si la base de datos ya existe
    DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='tractoreando'" 2>/dev/null || echo "0")
    
    if [[ "$DB_EXISTS" != "1" ]]; then
        log_info "Creando base de datos tractoreando..."
        sudo -u postgres createdb tractoreando
    else
        log_info "Base de datos tractoreando ya existe"
    fi
    
    # Verificar si el usuario ya existe
    USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='tractoreando_user'" 2>/dev/null || echo "0")
    
    if [[ "$USER_EXISTS" != "1" ]]; then
        log_info "Creando usuario tractoreando_user..."
        sudo -u postgres psql << EOF
CREATE USER tractoreando_user WITH ENCRYPTED PASSWORD 'tractoreando123';
ALTER USER tractoreando_user WITH SUPERUSER;
ALTER USER tractoreando_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE tractoreando TO tractoreando_user;
\q
EOF
    else
        log_info "Usuario tractoreando_user ya existe - actualizando permisos..."
        # Asegurar que tiene los permisos correctos y actualizar contraseña
        sudo -u postgres psql << EOF
ALTER USER tractoreando_user WITH ENCRYPTED PASSWORD 'tractoreando123';
ALTER USER tractoreando_user WITH SUPERUSER;
ALTER USER tractoreando_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE tractoreando TO tractoreando_user;
\q
EOF
    fi
    
    # Configurar autenticación para el usuario
    log_info "Configurando autenticación PostgreSQL..."
    PG_VERSION=$(sudo -u postgres psql -tAc "SELECT version()" | grep -oP '\d+' | head -1)
    PG_HBA_FILE="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"
    
    if [[ -f "$PG_HBA_FILE" ]]; then
        # Backup del archivo original
        sudo cp "$PG_HBA_FILE" "${PG_HBA_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Remover configuraciones anteriores de tractoreando_user
        sudo sed -i '/tractoreando_user/d' "$PG_HBA_FILE"
        
        # Agregar configuración para tractoreando_user al inicio (antes de otras reglas)
        sudo sed -i '/^# Database administrative login by Unix domain socket/i\# Tractoreando user authentication\nlocal   tractoreando    tractoreando_user                     md5\nhost    tractoreando    tractoreando_user    127.0.0.1/32     md5\nhost    tractoreando    tractoreando_user    ::1/128          md5\n' "$PG_HBA_FILE"
        
        # Reiniciar PostgreSQL para aplicar cambios
        log_info "Reiniciando PostgreSQL para aplicar cambios de autenticación..."
        sudo systemctl restart postgresql
        sleep 5
        
        # Verificar que PostgreSQL esté funcionando
        if ! systemctl is-active --quiet postgresql; then
            log_error "PostgreSQL no se pudo reiniciar correctamente"
            exit 1
        fi
    else
        log_warning "Archivo pg_hba.conf no encontrado en la ruta esperada: $PG_HBA_FILE"
        # Buscar el archivo en ubicaciones alternativas
        PG_HBA_ALT=$(find /etc/postgresql -name "pg_hba.conf" 2>/dev/null | head -1)
        if [[ -n "$PG_HBA_ALT" ]]; then
            log_info "Encontrado pg_hba.conf en: $PG_HBA_ALT"
            PG_HBA_FILE="$PG_HBA_ALT"
            # Repetir configuración con la nueva ruta
            sudo cp "$PG_HBA_FILE" "${PG_HBA_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
            sudo sed -i '/tractoreando_user/d' "$PG_HBA_FILE"
            sudo sed -i '/^# Database administrative login by Unix domain socket/i\# Tractoreando user authentication\nlocal   tractoreando    tractoreando_user                     md5\nhost    tractoreando    tractoreando_user    127.0.0.1/32     md5\nhost    tractoreando    tractoreando_user    ::1/128          md5\n' "$PG_HBA_FILE"
            sudo systemctl restart postgresql
            sleep 5
        fi
    fi
    
    # Verificar conexión con el usuario creado
    log_info "Verificando conexión con tractoreando_user..."
    if PGPASSWORD='tractoreando123' psql -h localhost -U tractoreando_user -d tractoreando -c "SELECT 1;" >/dev/null 2>&1; then
        log_success "✅ Conexión con tractoreando_user verificada exitosamente"
    else
        log_error "❌ No se pudo conectar con tractoreando_user"
        log_info "Intentando diagnóstico..."
        
        # Mostrar información de diagnóstico
        log_info "Estado de PostgreSQL: $(systemctl is-active postgresql)"
        log_info "Usuarios de PostgreSQL:"
        sudo -u postgres psql -c "\du" | grep tractoreando || log_warning "Usuario tractoreando_user no encontrado"
        
        log_error "Por favor, verifica la configuración de PostgreSQL manualmente"
        exit 1
    fi
    
    log_success "Base de datos configurada exitosamente"
}

# Instalar dependencias de la aplicación
install_app_dependencies() {
    log_info "Instalando dependencias de la aplicación..."
    
    # Instalar dependencias del backend
    log_info "Instalando dependencias del backend..."
    npm install
    
    # Instalar dependencias del frontend
    log_info "Instalando dependencias del frontend..."
    cd frontend
    npm install
    cd ..
    
    log_success "Dependencias instaladas"
}

# Configurar variables de entorno
setup_environment() {
    log_info "Configurando variables de entorno..."
    
    if [[ ! -f .env ]]; then
        if [[ -f .env.production ]]; then
            cp .env.production .env
            log_success "Variables de entorno copiadas desde .env.production"
        else
            log_warning "Archivo .env.production no encontrado. Creando .env básico..."
            cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tractoreando
DB_USER=tractoreando_user
DB_PASSWORD=tractoreando123
DB_DIALECT=postgres

JWT_SECRET=your_jwt_secret_here_$(date +%s)
SESSION_SECRET=your_session_secret_here_$(date +%s)

NODE_ENV=production
PORT=8000
CORS_ORIGIN=http://localhost:8080
LOG_LEVEL=info
EOF
            log_warning "¡IMPORTANTE! Edita el archivo .env con configuraciones seguras antes de continuar"
        fi
    else
        log_success "Archivo .env ya existe"
    fi
}

# Ejecutar migraciones
run_migrations() {
    log_info "Ejecutando migraciones de base de datos..."
    
    if [[ -f "node_modules/.bin/sequelize" ]]; then
        npx sequelize-cli db:migrate --env production
        log_success "Migraciones ejecutadas"
    else
        log_warning "Sequelize CLI no encontrado. Saltando migraciones."
    fi
}

# Crear usuario administrador
create_admin_user() {
    log_info "Creando usuario administrador para producción..."
    
    # Verificar que la conexión a la base de datos funcione antes de crear el admin
    log_info "Verificando conexión a la base de datos antes de crear admin..."
    if ! PGPASSWORD='tractoreando123' psql -h localhost -U tractoreando_user -d tractoreando -c "SELECT 1;" >/dev/null 2>&1; then
        log_error "❌ No se puede conectar a la base de datos con tractoreando_user"
        log_warning "🔧 Detectado problema de autenticación PostgreSQL"
        
        if [[ -f "fix-postgresql-auth.sh" ]]; then
            log_info "🛠️ Ejecutando script de reparación automática..."
            if bash fix-postgresql-auth.sh; then
                log_success "✅ Problema de autenticación reparado"
                # Verificar nuevamente la conexión
                if PGPASSWORD='tractoreando123' psql -h localhost -U tractoreando_user -d tractoreando -c "SELECT 1;" >/dev/null 2>&1; then
                    log_success "✅ Conexión a PostgreSQL verificada después de la reparación"
                else
                    log_error "❌ La reparación no resolvió el problema"
                    return 1
                fi
            else
                log_error "❌ Error durante la reparación automática"
                log_info "💡 Ejecuta manualmente: bash fix-postgresql-auth.sh"
                return 1
            fi
        else
            log_error "Script de reparación no encontrado"
            log_info "💡 Soluciones manuales:"
            log_info "   1. Verificar que PostgreSQL esté funcionando: systemctl status postgresql"
            log_info "   2. Recrear usuario: sudo -u postgres psql -c \"CREATE USER tractoreando_user WITH PASSWORD 'tractoreando123';\""
            log_info "   3. Verificar pg_hba.conf y reiniciar PostgreSQL"
            return 1
        fi
    fi
    
    if [[ -f "create-admin-production.js" ]]; then
        log_info "Ejecutando script de creación de administrador..."
        
        # Ejecutar con más información de debug
        if node create-admin-production.js; then
            log_success "✅ Usuario administrador creado exitosamente"
            log_info "📧 Email: admin@tractoreando.com"
            log_info "🔑 Contraseña: Admin123!"
            log_warning "⚠️ IMPORTANTE: Cambia la contraseña por defecto después del primer login"
        else
            log_error "❌ Error al crear usuario administrador"
            log_info "💡 Soluciones posibles:"
            log_info "   1. Verificar que PostgreSQL esté funcionando: systemctl status postgresql"
            log_info "   2. Verificar conexión manual: PGPASSWORD='tractoreando123' psql -h localhost -U tractoreando_user -d tractoreando"
            log_info "   3. Ejecutar manualmente: node create-admin-production.js"
            log_info "   4. Usar script alternativo: node init-admin.js"
            return 1
        fi
    else
        log_warning "Script create-admin-production.js no encontrado"
        log_info "Puedes usar el script alternativo: node init-admin.js"
        return 1
    fi
}

# Construir frontend
build_frontend() {
    log_info "Construyendo frontend para producción..."
    
    cd frontend
    if npm run build:prod; then
        log_success "Frontend construido exitosamente"
    elif npm run build; then
        log_success "Frontend construido con script build estándar"
    else
        log_error "Error al construir frontend"
        exit 1
    fi
    cd ..
}

# Configurar PM2
setup_pm2() {
    log_info "Configurando PM2..."
    
    if [[ -f "ecosystem.config.js" ]]; then
        pm2 start ecosystem.config.js --env production
        pm2 save
        pm2 startup
        log_success "Aplicación iniciada con PM2"
    else
        log_warning "Archivo ecosystem.config.js no encontrado"
        log_info "Iniciando aplicación directamente..."
        pm2 start server.js --name tractoreando-backend
        pm2 save
    fi
}

# Verificar instalación
verify_installation() {
    log_info "Verificando instalación..."
    
    sleep 5
    
    if curl -f http://localhost:8000/api/health >/dev/null 2>&1; then
        log_success "✅ Aplicación funcionando correctamente"
        log_success "🌐 Frontend: http://localhost:8080"
        log_success "🔌 API: http://localhost:8000/api"
        log_success "❤️ Health Check: http://localhost:8000/api/health"
    else
        log_warning "⚠️ La aplicación puede no estar respondiendo correctamente"
        log_info "Verifica los logs con: pm2 logs"
    fi
}

# Función principal
main() {
    log_info "Iniciando instalación de Tractoreando..."
    
    # Verificar sistema operativo
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        log_error "Este script está diseñado para sistemas Linux"
        exit 1
    fi
    
    # Verificar permisos sudo
    if ! sudo -n true 2>/dev/null; then
        log_error "Este script requiere permisos sudo"
        exit 1
    fi
    
    # Ejecutar instalación
    install_nodejs
    install_postgresql
    install_pm2
    install_nginx
    setup_database
    install_app_dependencies
    setup_environment
    run_migrations
    create_admin_user
    build_frontend
    setup_pm2
    verify_installation
    
    echo ""
    log_success "🎉 ¡Instalación completada!"
    log_info "Para gestionar la aplicación:"
    log_info "  - Ver estado: pm2 status"
    log_info "  - Ver logs: pm2 logs"
    log_info "  - Reiniciar: pm2 restart tractoreando-backend"
    log_info "  - Actualizar: ./update-production.sh"
    echo ""
}

# Ejecutar función principal
main "$@"