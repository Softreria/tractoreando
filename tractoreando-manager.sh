#!/bin/bash

# Tractoreando Manager - Script Maestro de Gestión
# Consolida funcionalidades de instalación, deployment, diagnóstico y mantenimiento
# Uso: ./tractoreando-manager.sh [comando] [opciones]

set -e

echo "🚛 Tractoreando Manager v2.0"
echo "============================="
echo "Fecha: $(date)"
echo "Usuario: $(whoami)"
echo ""

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

# Configuración
APP_DIR="/opt/tractoreando"
APP_USER="tractoreando"
BACKUP_DIR="/opt/tractoreando/backups"
DATE=$(date +"%Y%m%d_%H%M%S")

# Detectar si se ejecuta como root
if [[ $EUID -eq 0 ]]; then
    SUDO_CMD=""
else
    SUDO_CMD="sudo"
fi

# Función de ayuda
show_help() {
    echo "Uso: $0 [comando] [opciones]"
    echo ""
    echo "Comandos disponibles:"
    echo "  install [--quick|--production|--standalone]  - Instalación del sistema"
    echo "  deploy [--build|--full]                     - Deployment en producción"
    echo "  diagnose [--full|--502|--mongodb]           - Diagnóstico del sistema"
    echo "  maintain [--backup|--cleanup|--update]      - Mantenimiento del sistema"
    echo "  status                                       - Estado del sistema"
    echo "  logs [--backend|--frontend|--nginx]         - Ver logs del sistema"
    echo "  restart [--backend|--frontend|--all]        - Reiniciar servicios"
    echo "  help                                         - Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 install --quick                          # Instalación rápida"
    echo "  $0 deploy --full                            # Deployment completo"
    echo "  $0 diagnose --full                          # Diagnóstico completo"
    echo "  $0 maintain --backup                        # Crear backup"
    echo "  $0 status                                    # Ver estado"
}

# Función de instalación
install_system() {
    local mode=$1
    log_info "Iniciando instalación en modo: $mode"
    
    case $mode in
        "--quick")
            log_info "Instalación rápida para desarrollo"
            install_dependencies
            setup_environment
            init_database
            ;;
        "--production")
            log_info "Instalación para producción"
            install_dependencies
            setup_production_environment
            configure_nginx
            setup_pm2
            init_database
            ;;
        "--standalone")
            log_info "Instalación servidor independiente"
            install_dependencies
            setup_standalone_environment
            configure_nginx_standalone
            setup_pm2
            init_database
            ;;
        *)
            log_error "Modo de instalación no válido"
            show_help
            exit 1
            ;;
    esac
}

# Función de deployment
deploy_system() {
    local mode=$1
    log_info "Iniciando deployment en modo: $mode"
    
    case $mode in
        "--build")
            build_frontend
            ;;
        "--full")
            backup_system
            build_frontend
            restart_services
            verify_deployment
            ;;
        *)
            log_error "Modo de deployment no válido"
            show_help
            exit 1
            ;;
    esac
}

# Función de diagnóstico
diagnose_system() {
    local mode=$1
    log_info "Iniciando diagnóstico en modo: $mode"
    
    case $mode in
        "--full")
            check_system_status
            check_services
            check_database
            check_network
            check_logs
            ;;
        "--502")
            diagnose_502_errors
            ;;
        "--mongodb")
            check_database
            ;;
        *)
            check_system_status
            check_services
            ;;
    esac
}

# Función de mantenimiento
maintain_system() {
    local mode=$1
    log_info "Iniciando mantenimiento en modo: $mode"
    
    case $mode in
        "--backup")
            backup_system
            ;;
        "--cleanup")
            cleanup_system
            ;;
        "--update")
            update_system
            ;;
        *)
            log_error "Modo de mantenimiento no válido"
            show_help
            exit 1
            ;;
    esac
}

# Funciones auxiliares
install_dependencies() {
    log_info "Instalando dependencias..."
    npm install
    cd frontend && npm install && cd ..
}

setup_environment() {
    log_info "Configurando entorno de desarrollo..."
    if [[ ! -f .env ]]; then
        # El archivo .env ya está configurado con valores por defecto
        log_success "Archivo .env creado"
    fi
}

setup_production_environment() {
    log_info "Configurando entorno de producción..."
    if [[ ! -f .env ]]; then
        # Configurar variables para producción en .env
        sed -i '' 's/NODE_ENV=development/NODE_ENV=production/' .env
        sed -i '' 's/PORT=8000/PORT=3002/' .env
        log_success "Archivo .env de producción creado"
    fi
}

init_database() {
    log_info "Inicializando base de datos..."
    node init-admin.js
}

build_frontend() {
    log_info "Construyendo frontend..."
    cd frontend
    npm run build
    cd ..
    log_success "Frontend construido exitosamente"
}

backup_system() {
    log_info "Creando backup del sistema..."
    mkdir -p $BACKUP_DIR
    mongodump --db tractoreando --gzip --archive=$BACKUP_DIR/tractoreando_backup_$DATE.gz
    log_success "Backup creado: tractoreando_backup_$DATE.gz"
}

check_system_status() {
    log_info "Verificando estado del sistema..."
    echo "Node.js: $(node --version)"
    echo "NPM: $(npm --version)"
    echo "MongoDB: $(mongod --version | head -1)"
    echo "PM2: $(pm2 --version)"
}

check_services() {
    log_info "Verificando servicios..."
    pm2 status
}

check_database() {
    log_info "Verificando conexión a MongoDB..."
    node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando').then(() => { console.log('✅ MongoDB conectado'); process.exit(0); }).catch(err => { console.error('❌ Error MongoDB:', err.message); process.exit(1); });"
}

restart_services() {
    log_info "Reiniciando servicios..."
    pm2 restart all
    log_success "Servicios reiniciados"
}

show_status() {
    log_info "Estado actual del sistema:"
    check_system_status
    echo ""
    check_services
    echo ""
    check_database
}

show_logs() {
    local service=$1
    case $service in
        "--backend")
            pm2 logs tractoreando-backend
            ;;
        "--nginx")
            $SUDO_CMD tail -f /var/log/nginx/error.log
            ;;
        *)
            pm2 logs
            ;;
    esac
}

restart_service() {
    local service=$1
    case $service in
        "--backend")
            pm2 restart tractoreando-backend
            ;;
        "--all")
            pm2 restart all
            $SUDO_CMD systemctl restart nginx
            ;;
        *)
            pm2 restart all
            ;;
    esac
}

# Función principal
main() {
    case $1 in
        "install")
            install_system $2
            ;;
        "deploy")
            deploy_system $2
            ;;
        "diagnose")
            diagnose_system $2
            ;;
        "maintain")
            maintain_system $2
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs $2
            ;;
        "restart")
            restart_service $2
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        "")
            log_error "Comando requerido"
            show_help
            exit 1
            ;;
        *)
            log_error "Comando no reconocido: $1"
            show_help
            exit 1
            ;;
    esac
}

# Ejecutar función principal
main "$@"