#!/bin/bash

# Script de Diagnóstico Integral - Tractoreando
# Combina funcionalidades de diagnostico-completo.sh, diagnose-production.sh y verificar-servidor.sh
# Uso: ./diagnostico-integral.sh [--quick|--full|--production]

set -e

echo "🔍 Diagnóstico Integral de Tractoreando"
echo "======================================="
echo "Fecha: $(date)"
echo "Usuario: $(whoami)"
echo "Directorio: $(pwd)"
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

# Contadores globales
errors=0
warnings=0
successes=0

# Función para contar resultados
count_result() {
    case $1 in
        "success")
            ((successes++))
            ;;
        "error")
            ((errors++))
            ;;
        "warning")
            ((warnings++))
            ;;
    esac
}

# Función para mostrar estado con íconos
show_status() {
    if [ $1 -eq 0 ]; then
        log_success "✓ $2"
        count_result "success"
    else
        log_error "✗ $2"
        count_result "error"
    fi
}

show_warning() {
    log_warning "⚠ $1"
    count_result "warning"
}

# Función para verificar si estamos en el directorio correcto
check_project_directory() {
    log_info "=== VERIFICACIÓN DEL DIRECTORIO DEL PROYECTO ==="
    
    if [ ! -f "package.json" ]; then
        log_error "No se encontró package.json. Ejecuta este script desde el directorio raíz del proyecto."
        exit 1
    fi
    
    log_success "Directorio del proyecto correcto"
    count_result "success"
    
    # Mostrar información del proyecto
    if command -v jq &> /dev/null && [ -f "package.json" ]; then
        local project_name=$(jq -r '.name // "N/A"' package.json)
        local project_version=$(jq -r '.version // "N/A"' package.json)
        log_info "Proyecto: $project_name v$project_version"
    fi
}

# Función para verificar dependencias del sistema
check_system_dependencies() {
    log_info "=== VERIFICACIÓN DE DEPENDENCIAS DEL SISTEMA ==="
    
    # Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        show_status 0 "Node.js instalado: $node_version"
        
        # Verificar versión mínima
        local node_major=$(echo $node_version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ $node_major -ge 16 ]; then
            log_success "Versión de Node.js compatible (>= 16)"
            count_result "success"
        else
            show_warning "Versión de Node.js antigua. Se recomienda Node.js 16+"
        fi
    else
        show_status 1 "Node.js no está instalado"
    fi
    
    # npm
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        show_status 0 "npm instalado: $npm_version"
    else
        show_status 1 "npm no está instalado"
    fi
    
    # PM2
    if command -v pm2 &> /dev/null; then
        local pm2_version=$(pm2 --version)
        show_status 0 "PM2 instalado: $pm2_version"
    else
        show_status 1 "PM2 no está instalado"
        log_info "Para instalar PM2: sudo npm install -g pm2"
    fi
}

# Función para verificar MongoDB
check_mongodb() {
    log_info "=== VERIFICACIÓN DE MONGODB ==="
    
    # Verificar instalación
    if command -v mongod &> /dev/null; then
        show_status 0 "MongoDB instalado"
    else
        show_status 1 "MongoDB no está instalado"
        return
    fi
    
    # Verificar si está ejecutándose
    if pgrep -f mongod >/dev/null 2>&1; then
        show_status 0 "MongoDB está ejecutándose"
    else
        show_status 1 "MongoDB no está ejecutándose"
        
        # Intentar iniciar MongoDB
        log_info "Intentando iniciar MongoDB..."
        if command -v brew &> /dev/null; then
            brew services start mongodb-community >/dev/null 2>&1 || true
        elif command -v systemctl &> /dev/null; then
            sudo systemctl start mongod >/dev/null 2>&1 || true
        fi
        
        sleep 3
        if pgrep -f mongod >/dev/null 2>&1; then
            log_success "MongoDB iniciado correctamente"
            count_result "success"
        fi
    fi
    
    # Verificar conexión
    if command -v mongosh &> /dev/null; then
        if mongosh --eval "db.adminCommand('ping')" --quiet 2>/dev/null; then
            show_status 0 "Conexión a MongoDB exitosa (mongosh)"
            
            # Verificar base de datos
            if mongosh tractoreando_prod --eval "db.stats()" --quiet 2>/dev/null; then
                show_status 0 "Base de datos tractoreando_prod accesible"
            else
                show_warning "Base de datos tractoreando_prod no existe (se creará automáticamente)"
            fi
        else
            show_status 1 "No se puede conectar a MongoDB"
        fi
    elif command -v mongo &> /dev/null; then
        if mongo --eval "db.adminCommand('ping')" --quiet 2>/dev/null; then
            show_status 0 "Conexión a MongoDB exitosa (mongo)"
        else
            show_status 1 "No se puede conectar a MongoDB"
        fi
    else
        show_warning "Cliente de MongoDB (mongosh/mongo) no encontrado"
    fi
    
    # Verificar logs si hay problemas
    if [ $errors -gt 0 ] && [ -f "/var/log/mongodb/mongod.log" ]; then
        log_info "Últimas líneas del log de MongoDB:"
        tail -5 /var/log/mongodb/mongod.log | sed 's/^/   /'
    fi
}

# Función para verificar servicios web
check_web_services() {
    log_info "=== VERIFICACIÓN DE SERVICIOS WEB ==="
    
    # Nginx
    if command -v nginx &> /dev/null; then
        local nginx_version=$(nginx -v 2>&1 | cut -d' ' -f3)
        show_status 0 "Nginx instalado: $nginx_version"
        
        if pgrep -f nginx >/dev/null 2>&1; then
            show_status 0 "Nginx está ejecutándose"
        else
            show_status 1 "Nginx no está ejecutándose"
            
            # Intentar iniciar Nginx
            log_info "Intentando iniciar Nginx..."
            if command -v brew &> /dev/null; then
                brew services start nginx >/dev/null 2>&1 || true
            elif command -v systemctl &> /dev/null; then
                sudo systemctl start nginx >/dev/null 2>&1 || true
            fi
            
            sleep 2
            if pgrep -f nginx >/dev/null 2>&1; then
                log_success "Nginx iniciado correctamente"
                count_result "success"
            fi
        fi
    else
        show_status 1 "Nginx no está instalado"
    fi
}

# Función para verificar puertos
check_ports() {
    log_info "=== VERIFICACIÓN DE PUERTOS ==="
    
    local ports=("5000:Backend" "80:HTTP" "443:HTTPS" "27017:MongoDB" "3000:Frontend-Dev")
    
    for port_info in "${ports[@]}"; do
        local port=$(echo "$port_info" | cut -d':' -f1)
        local service=$(echo "$port_info" | cut -d':' -f2)
        
        if command -v lsof &> /dev/null && lsof -i :$port >/dev/null 2>&1; then
            local process=$(lsof -i :$port | tail -n 1 | awk '{print $1}')
            show_status 0 "Puerto $port ($service) en uso por $process"
        elif command -v ss &> /dev/null && ss -tuln | grep -q ":$port "; then
            show_status 0 "Puerto $port ($service) está en uso"
        elif command -v netstat &> /dev/null && netstat -tuln | grep -q ":$port "; then
            show_status 0 "Puerto $port ($service) está en uso"
        else
            if [[ "$service" == "Frontend-Dev" ]]; then
                show_warning "Puerto $port ($service) libre (normal en producción)"
            else
                show_status 1 "Puerto $port ($service) no está en uso"
            fi
        fi
    done
}

# Función para verificar archivos de configuración
check_config_files() {
    log_info "=== VERIFICACIÓN DE ARCHIVOS DE CONFIGURACIÓN ==="
    
    local config_files=(
        ".env:Variables de entorno principales"
        ".env.production:Variables de entorno de producción"
        "frontend/.env.production:Variables de entorno del frontend"
        "ecosystem.config.js:Configuración PM2"
        "server.js:Servidor principal"
        "frontend/public/manifest.json:Manifest del frontend"
    )
    
    for file_info in "${config_files[@]}"; do
        local file=$(echo "$file_info" | cut -d':' -f1)
        local desc=$(echo "$file_info" | cut -d':' -f2)
        
        if [[ -f "$file" ]]; then
            show_status 0 "$desc existe ($file)"
            
            # Verificaciones específicas
            case "$file" in
                "frontend/public/manifest.json")
                    if command -v node &> /dev/null; then
                        if node -e "JSON.parse(require('fs').readFileSync('$file', 'utf8'))" &> /dev/null; then
                            log_success "manifest.json tiene sintaxis válida"
                            count_result "success"
                        else
                            log_error "manifest.json tiene errores de sintaxis"
                            count_result "error"
                        fi
                    fi
                    ;;
                ".env.production")
                    if grep -q "NODE_ENV=production" "$file" 2>/dev/null; then
                        log_success "NODE_ENV configurado correctamente"
                        count_result "success"
                    else
                        show_warning "NODE_ENV no está configurado como 'production'"
                    fi
                    ;;
                "frontend/.env.production")
                    if grep -q "REACT_APP_API_URL" "$file" 2>/dev/null; then
                        local api_url=$(grep "REACT_APP_API_URL" "$file" | cut -d'=' -f2)
                        log_info "API URL configurada: $api_url"
                    else
                        show_warning "REACT_APP_API_URL no configurada"
                    fi
                    ;;
            esac
        else
            show_status 1 "$desc no existe ($file)"
        fi
    done
    
    # Verificar configuración de Nginx
    local nginx_configs=(
        "/etc/nginx/sites-available/tractoreando"
        "/etc/nginx/sites-enabled/tractoreando"
        "/opt/homebrew/etc/nginx/servers/tractoreando.conf"
    )
    
    local nginx_found=false
    for config in "${nginx_configs[@]}"; do
        if [[ -f "$config" ]]; then
            show_status 0 "Configuración Nginx encontrada: $config"
            nginx_found=true
            break
        fi
    done
    
    if ! $nginx_found; then
        show_warning "No se encontró configuración de Nginx"
    fi
}

# Función para verificar dependencias del proyecto
check_project_dependencies() {
    log_info "=== VERIFICACIÓN DE DEPENDENCIAS DEL PROYECTO ==="
    
    # Backend dependencies
    if [ -d "node_modules" ]; then
        show_status 0 "Dependencias del backend instaladas"
    else
        show_status 1 "Dependencias del backend NO instaladas"
        log_info "Para instalar: npm install"
    fi
    
    # Frontend dependencies
    if [ -d "frontend/node_modules" ]; then
        show_status 0 "Dependencias del frontend instaladas"
    else
        show_status 1 "Dependencias del frontend NO instaladas"
        log_info "Para instalar: cd frontend && npm install"
    fi
    
    # Frontend build
    if [ -d "frontend/build" ]; then
        show_status 0 "Build del frontend existe"
        
        if [ -f "frontend/build/index.html" ]; then
            show_status 0 "index.html del build existe"
        else
            show_status 1 "index.html del build NO existe"
        fi
        
        # Verificar tamaño del build
        local build_size=$(du -sh frontend/build 2>/dev/null | cut -f1)
        if [[ -n "$build_size" ]]; then
            log_info "Tamaño del build: $build_size"
        fi
    else
        show_status 1 "Build del frontend NO existe"
        log_info "Para construir: cd frontend && npm run build"
    fi
}

# Función para verificar PM2
check_pm2_processes() {
    log_info "=== VERIFICACIÓN DE PROCESOS PM2 ==="
    
    if ! command -v pm2 &> /dev/null; then
        show_status 1 "PM2 no está disponible"
        return
    fi
    
    # Mostrar estado general de PM2
    log_info "Estado de procesos PM2:"
    pm2 status 2>/dev/null || log_warning "No se pudo obtener el estado de PM2"
    
    # Verificar proceso específico de Tractoreando
    if pm2 list 2>/dev/null | grep -q "tractoreando"; then
        if pm2 list 2>/dev/null | grep "tractoreando" | grep -q "online"; then
            show_status 0 "Aplicación Tractoreando está online en PM2"
        else
            show_status 1 "Aplicación Tractoreando no está online en PM2"
            
            # Mostrar detalles del proceso
            log_info "Detalles del proceso:"
            pm2 show tractoreando 2>/dev/null | head -20 || true
        fi
        
        # Mostrar últimas líneas del log
        log_info "Últimas líneas del log:"
        pm2 logs tractoreando --lines 5 --nostream 2>/dev/null || true
    else
        show_status 1 "Aplicación Tractoreando no está configurada en PM2"
        
        if [[ -f "ecosystem.config.js" ]]; then
            log_info "Para iniciar: pm2 start ecosystem.config.js"
        fi
    fi
}

# Función para verificar conectividad
check_connectivity() {
    log_info "=== VERIFICACIÓN DE CONECTIVIDAD ==="
    
    # Verificar conectividad local
    local endpoints=("http://localhost:5000" "http://127.0.0.1:5000")
    
    for endpoint in "${endpoints[@]}"; do
        if command -v curl &> /dev/null; then
            if curl -s --connect-timeout 5 "$endpoint/api/health" >/dev/null 2>&1; then
                show_status 0 "Backend accesible en $endpoint"
            else
                show_status 1 "Backend no accesible en $endpoint"
            fi
        elif command -v wget &> /dev/null; then
            if wget -q --timeout=5 --tries=1 "$endpoint/api/health" -O /dev/null 2>&1; then
                show_status 0 "Backend accesible en $endpoint"
            else
                show_status 1 "Backend no accesible en $endpoint"
            fi
        else
            show_warning "curl/wget no disponible para verificar conectividad"
            break
        fi
    done
}

# Función para mostrar resumen y recomendaciones
show_summary() {
    echo ""
    log_info "=== RESUMEN DEL DIAGNÓSTICO ==="
    echo -e "${GREEN}✓ Éxitos: $successes${NC}"
    echo -e "${YELLOW}⚠ Advertencias: $warnings${NC}"
    echo -e "${RED}✗ Errores: $errors${NC}"
    
    echo ""
    log_info "=== RECOMENDACIONES ==="
    
    if [ $errors -gt 0 ]; then
        echo "🔧 Para resolver problemas comunes:"
        echo "1. Si MongoDB no está ejecutándose:"
        echo "   • Linux: sudo systemctl start mongod"
        echo "   • macOS: brew services start mongodb-community"
        echo "2. Si faltan archivos de configuración:"
        echo "   • Copia .env.production.example a .env.production"
        echo "   • Configura las variables de entorno necesarias"
        echo "3. Si el frontend no está construido:"
        echo "   • cd frontend && npm run build"
        echo "4. Si hay errores de conexión:"
        echo "   • Verifica que REACT_APP_API_URL apunte al dominio correcto"
        echo "5. Si hay errores CORS:"
        echo "   • Configura nginx correctamente"
        echo "6. Si PM2 no está funcionando:"
        echo "   • pm2 restart tractoreando"
        echo "   • pm2 logs tractoreando"
    else
        echo "🎉 ¡Todo parece estar funcionando correctamente!"
    fi
    
    echo ""
    echo "📋 Comandos útiles:"
    echo "• Ver logs de PM2: pm2 logs tractoreando"
    echo "• Reiniciar aplicación: pm2 restart tractoreando"
    echo "• Ver estado de servicios: systemctl status mongod nginx"
    echo "• Verificar puertos: lsof -i :5000"
    echo "• Logs de MongoDB: tail -f /var/log/mongodb/mongod.log"
    echo "• Logs de Nginx: tail -f /var/log/nginx/error.log"
}

# Función principal
main() {
    local mode=${1:-"--full"}
    
    case $mode in
        "--quick")
            log_info "Modo rápido: verificaciones básicas"
            check_project_directory
            check_system_dependencies
            check_ports
            ;;
        "--production")
            log_info "Modo producción: verificaciones completas para servidor"
            check_project_directory
            check_system_dependencies
            check_mongodb
            check_web_services
            check_ports
            check_config_files
            check_project_dependencies
            check_pm2_processes
            check_connectivity
            ;;
        "--full"|*)
            log_info "Modo completo: todas las verificaciones"
            check_project_directory
            check_system_dependencies
            check_mongodb
            check_web_services
            check_ports
            check_config_files
            check_project_dependencies
            check_pm2_processes
            check_connectivity
            ;;
    esac
    
    show_summary
    
    # Código de salida basado en errores
    if [ $errors -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Mostrar ayuda
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Uso: $0 [--quick|--full|--production|--help]"
    echo ""
    echo "Opciones:"
    echo "  --quick      Verificaciones básicas rápidas"
    echo "  --full       Verificaciones completas (por defecto)"
    echo "  --production Verificaciones específicas para servidor de producción"
    echo "  --help       Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0                    # Diagnóstico completo"
    echo "  $0 --quick           # Verificaciones rápidas"
    echo "  $0 --production      # Modo producción"
    exit 0
fi

# Ejecutar función principal
main "$@"