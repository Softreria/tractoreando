#!/bin/bash

# Tractoreando - Script de Actualización Simplificado
# Actualiza la aplicación manteniendo la configuración y datos existentes
# Uso: ./update.sh [--backup]

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

echo "🚛 Tractoreando - Actualización Simplificada"
echo "==========================================="
echo "Fecha: $(date)"
echo "Usuario: $(whoami)"
echo ""

# Configuración
BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")
CREATE_BACKUP=false

# Procesar argumentos
for arg in "$@"; do
    case $arg in
        --backup)
            CREATE_BACKUP=true
            shift
            ;;
        --help)
            echo "Uso: $0 [--backup] [--help]"
            echo "  --backup  Crear backup antes de actualizar"
            echo "  --help    Mostrar esta ayuda"
            exit 0
            ;;
    esac
done

# Verificar que estamos en el directorio correcto
if [[ ! -f "package.json" ]] || [[ ! -f "server.js" ]]; then
    log_error "Este script debe ejecutarse desde el directorio raíz de Tractoreando"
    exit 1
fi

# Crear backup si se solicita
create_backup() {
    if [[ "$CREATE_BACKUP" == "true" ]]; then
        log_info "Creando backup de la base de datos..."
        
        mkdir -p "$BACKUP_DIR"
        
        # Backup de PostgreSQL
        if command -v pg_dump >/dev/null 2>&1; then
            pg_dump -h localhost -U tractoreando_user tractoreando > "$BACKUP_DIR/backup_$DATE.sql"
            log_success "Backup creado: $BACKUP_DIR/backup_$DATE.sql"
        else
            log_warning "pg_dump no encontrado, saltando backup"
        fi
    fi
}

# Verificar estado actual
verify_current_state() {
    log_info "Verificando estado actual de la aplicación..."
    
    if command -v pm2 >/dev/null 2>&1; then
        if pm2 list | grep -q "tractoreando"; then
            log_success "Aplicación encontrada en PM2"
        else
            log_warning "Aplicación no encontrada en PM2"
        fi
    else
        log_warning "PM2 no encontrado"
    fi
}

# Detener aplicación
stop_application() {
    log_info "Deteniendo aplicación..."
    
    if command -v pm2 >/dev/null 2>&1; then
        pm2 stop tractoreando-backend 2>/dev/null || true
        log_success "Aplicación detenida"
    fi
}

# Actualizar código
update_code() {
    log_info "Actualizando código desde repositorio..."
    
    if [[ -d ".git" ]]; then
        git fetch origin
        git pull origin main
        log_success "Código actualizado"
    else
        log_warning "No es un repositorio Git, saltando actualización de código"
    fi
}

# Actualizar dependencias
update_dependencies() {
    log_info "Actualizando dependencias..."
    
    # Backend
    log_info "Actualizando dependencias del backend..."
    npm ci --production
    
    # Frontend
    log_info "Actualizando dependencias del frontend..."
    cd frontend
    npm ci
    cd ..
    
    log_success "Dependencias actualizadas"
}

# Ejecutar migraciones
run_migrations() {
    log_info "Ejecutando migraciones de base de datos..."
    
    if [[ -f "node_modules/.bin/sequelize" ]]; then
        npx sequelize-cli db:migrate --env production
        log_success "Migraciones ejecutadas"
    else
        log_warning "Sequelize CLI no encontrado, saltando migraciones"
    fi
}

# Construir frontend
build_frontend() {
    log_info "Construyendo frontend..."
    
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

# Iniciar aplicación
start_application() {
    log_info "Iniciando aplicación..."
    
    if [[ -f "ecosystem.config.js" ]]; then
        pm2 start ecosystem.config.js --env production
        pm2 save
        log_success "Aplicación iniciada con PM2"
    else
        pm2 start server.js --name tractoreando-backend
        pm2 save
        log_success "Aplicación iniciada"
    fi
}

# Verificar aplicación
verify_application() {
    log_info "Verificando que la aplicación esté funcionando..."
    
    sleep 5
    
    if curl -f http://localhost:8000/api/health >/dev/null 2>&1; then
        log_success "✅ Aplicación funcionando correctamente"
        log_success "🌐 Frontend: http://localhost:8080"
        log_success "🔌 API: http://localhost:8000/api"
    else
        log_warning "⚠️ La aplicación puede no estar respondiendo correctamente"
        log_info "Verifica los logs con: pm2 logs"
        return 1
    fi
}

# Limpiar archivos temporales
cleanup() {
    log_info "Limpiando archivos temporales..."
    
    # Limpiar cache de npm
    npm cache clean --force 2>/dev/null || true
    
    # Limpiar logs antiguos
    if [[ -d "logs" ]]; then
        find logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
    fi
    
    log_success "Limpieza completada"
}

# Función principal
main() {
    log_info "Iniciando actualización de Tractoreando..."
    
    # Verificar permisos
    if [[ ! -w "." ]]; then
        log_error "No tienes permisos de escritura en este directorio"
        exit 1
    fi
    
    # Ejecutar actualización
    create_backup
    verify_current_state
    stop_application
    update_code
    update_dependencies
    run_migrations
    build_frontend
    start_application
    verify_application
    cleanup
    
    echo ""
    log_success "🎉 ¡Actualización completada exitosamente!"
    log_info "Comandos útiles:"
    log_info "  - Ver estado: pm2 status"
    log_info "  - Ver logs: pm2 logs"
    log_info "  - Reiniciar: pm2 restart tractoreando-backend"
    echo ""
}

# Manejo de errores
trap 'log_error "Error durante la actualización. Verifica los logs."; exit 1' ERR

# Ejecutar función principal
main "$@"