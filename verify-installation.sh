#!/bin/bash

# Script de verificación post-instalación para Tractoreando
# Verifica que todos los servicios estén funcionando correctamente

set -e

# Configuración
APP_NAME="tractoreando"
APP_DIR="/var/www/$APP_NAME"
APP_USER="$APP_NAME"
PORT_BACKEND=5000

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

# Función para verificar si un puerto está en uso
check_port() {
    local port=$1
    local service_name=$2
    
    # Intentar con ss primero
    if command -v ss &> /dev/null; then
        if ss -tuln | grep -q ":$port "; then
            return 1  # Puerto en uso
        fi
    # Intentar con lsof
    elif command -v lsof &> /dev/null; then
        if lsof -i :$port &> /dev/null; then
            return 1  # Puerto en uso
        fi
    # Fallback con netstat si está disponible
    elif command -v netstat &> /dev/null; then
        if netstat -tuln | grep -q ":$port "; then
            return 1  # Puerto en uso
        fi
    else
        log_warning "No se encontraron herramientas para verificar puertos (ss, lsof, netstat)"
        return 0  # Asumir que no está en uso
    fi
    
    return 0  # Puerto libre
}

# Función para verificar estado de MongoDB
check_mongodb_status() {
    # Verificar si el proceso está ejecutándose
    if pgrep -x "mongod" > /dev/null; then
        # Verificar conectividad
        if command -v mongosh &> /dev/null; then
            if mongosh --eval "db.adminCommand('ping')" --quiet &> /dev/null; then
                return 0
            fi
        elif command -v mongo &> /dev/null; then
            if mongo --eval "db.adminCommand('ping')" --quiet &> /dev/null; then
                return 0
            fi
        fi
        return 1
    else
        return 1
    fi
}

# Función para probar conectividad a MongoDB
test_mongodb_connection() {
    local mongodb_uri=$1
    
    # Crear script temporal para probar conexión
    local temp_script="/tmp/test_mongodb_connection_$$.js"
    
    cat > "$temp_script" <<EOF
const { MongoClient } = require('mongodb');

async function testConnection() {
    const uri = '$mongodb_uri';
    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
    });
    
    try {
        await client.connect();
        await client.db().admin().ping();
        console.log('Conexión exitosa');
        process.exit(0);
    } catch (error) {
        console.error('Error de conexión:', error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

testConnection();
EOF
    
    # Ejecutar test desde el directorio de la aplicación
    cd "$APP_DIR" 2>/dev/null || {
        log_error "No se puede acceder al directorio de la aplicación: $APP_DIR"
        rm -f "$temp_script"
        return 1
    }
    
    # Ejecutar como usuario de la aplicación
    if sudo -u "$APP_USER" node "$temp_script" &>/dev/null; then
        rm -f "$temp_script"
        return 0
    else
        rm -f "$temp_script"
        return 1
    fi
}

# Función para verificar respuesta HTTP
check_http_response() {
    local url=$1
    local expected_status=${2:-200}
    
    if command -v curl &> /dev/null; then
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
        if [[ "$status" == "$expected_status" ]]; then
            return 0
        fi
    fi
    return 1
}

# Función principal de verificación
verify_installation() {
    echo ""
    echo "🔍 VERIFICACIÓN POST-INSTALACIÓN DE TRACTOREANDO"
    echo "================================================"
    echo ""
    
    local all_checks_passed=true
    local warnings_count=0
    local errors_count=0
    
    # 1. Verificar directorio de aplicación
    log_info "1️⃣ Verificando directorio de aplicación..."
    if [[ -d "$APP_DIR" ]]; then
        log_success "✅ Directorio de aplicación existe: $APP_DIR"
    else
        log_error "❌ Directorio de aplicación no encontrado: $APP_DIR"
        all_checks_passed=false
        ((errors_count++))
    fi
    
    # 2. Verificar usuario de aplicación
    log_info "2️⃣ Verificando usuario de aplicación..."
    if id "$APP_USER" &>/dev/null; then
        log_success "✅ Usuario de aplicación existe: $APP_USER"
    else
        log_error "❌ Usuario de aplicación no encontrado: $APP_USER"
        all_checks_passed=false
        ((errors_count++))
    fi
    
    # 3. Verificar archivo .env
    log_info "3️⃣ Verificando archivo .env..."
    if [[ -f "$APP_DIR/.env" ]]; then
        log_success "✅ Archivo .env existe"
        
        # Verificar variables críticas
        local critical_vars=("NODE_ENV" "MONGODB_URI" "JWT_SECRET")
        for var in "${critical_vars[@]}"; do
            if grep -q "^$var=" "$APP_DIR/.env" 2>/dev/null; then
                log_success "  ✅ Variable $var configurada"
            else
                log_warning "  ⚠️  Variable $var no encontrada"
                ((warnings_count++))
            fi
        done
    else
        log_error "❌ Archivo .env no encontrado"
        all_checks_passed=false
        ((errors_count++))
    fi
    
    # 4. Verificar MongoDB
    log_info "4️⃣ Verificando MongoDB..."
    if check_mongodb_status; then
        log_success "✅ MongoDB está funcionando correctamente"
        
        # Probar conectividad desde la aplicación
        if [[ -f "$APP_DIR/.env" ]]; then
            local mongodb_uri=$(grep "^MONGODB_URI=" "$APP_DIR/.env" | cut -d'=' -f2- | tr -d '"')
            if test_mongodb_connection "$mongodb_uri"; then
                log_success "  ✅ Conectividad desde la aplicación verificada"
            else
                log_warning "  ⚠️  No se pudo verificar conectividad desde la aplicación"
                ((warnings_count++))
            fi
        fi
    else
        log_error "❌ MongoDB no está funcionando"
        all_checks_passed=false
        ((errors_count++))
    fi
    
    # 5. Verificar Node.js y dependencias
    log_info "5️⃣ Verificando Node.js y dependencias..."
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        log_success "✅ Node.js instalado: $node_version"
        
        # Verificar dependencias del backend
        if [[ -f "$APP_DIR/package.json" ]]; then
            log_success "  ✅ package.json encontrado"
            if [[ -d "$APP_DIR/node_modules" ]]; then
                log_success "  ✅ Dependencias instaladas"
            else
                log_warning "  ⚠️  Directorio node_modules no encontrado"
                ((warnings_count++))
            fi
        else
            log_warning "  ⚠️  package.json no encontrado"
            ((warnings_count++))
        fi
    else
        log_error "❌ Node.js no está instalado"
        all_checks_passed=false
        ((errors_count++))
    fi
    
    # 6. Verificar PM2
    log_info "6️⃣ Verificando PM2..."
    if command -v pm2 &> /dev/null; then
        log_success "✅ PM2 instalado"
        
        # Verificar aplicación en PM2
        if sudo -u "$APP_USER" pm2 status &>/dev/null; then
            local app_status=$(sudo -u "$APP_USER" pm2 jlist | jq -r '.[] | select(.name=="'$APP_NAME'-backend") | .pm2_env.status' 2>/dev/null || echo "not_found")
            case $app_status in
                "online")
                    log_success "  ✅ Aplicación en línea en PM2"
                    ;;
                "stopped")
                    log_warning "  ⚠️  Aplicación detenida en PM2"
                    ((warnings_count++))
                    ;;
                "errored")
                    log_error "  ❌ Aplicación con errores en PM2"
                    ((errors_count++))
                    ;;
                "not_found")
                    log_warning "  ⚠️  Aplicación no encontrada en PM2"
                    ((warnings_count++))
                    ;;
                *)
                    log_warning "  ⚠️  Estado desconocido en PM2: $app_status"
                    ((warnings_count++))
                    ;;
            esac
        else
            log_warning "  ⚠️  No se puede acceder a PM2"
            ((warnings_count++))
        fi
    else
        log_error "❌ PM2 no está instalado"
        all_checks_passed=false
        ((errors_count++))
    fi
    
    # 7. Verificar Nginx
    log_info "7️⃣ Verificando Nginx..."
    if command -v nginx &> /dev/null; then
        log_success "✅ Nginx instalado"
        
        # Verificar si está ejecutándose
        if pgrep -x "nginx" > /dev/null; then
            log_success "  ✅ Nginx está ejecutándose"
            
            # Verificar configuración del sitio
            if [[ -f "/etc/nginx/sites-enabled/$APP_NAME" ]] || [[ -f "/etc/nginx/sites-available/$APP_NAME" ]]; then
                log_success "  ✅ Configuración del sitio encontrada"
            else
                log_warning "  ⚠️  Configuración del sitio no encontrada"
                ((warnings_count++))
            fi
        else
            log_warning "  ⚠️  Nginx no está ejecutándose"
            ((warnings_count++))
        fi
    else
        log_error "❌ Nginx no está instalado"
        all_checks_passed=false
        ((errors_count++))
    fi
    
    # 8. Verificar puertos
    log_info "8️⃣ Verificando puertos..."
    
    # Puerto del backend
    if ! check_port "$PORT_BACKEND" "Backend"; then
        log_success "  ✅ Puerto $PORT_BACKEND en uso (aplicación funcionando)"
    else
        log_warning "  ⚠️  Puerto $PORT_BACKEND libre (aplicación podría no estar funcionando)"
        ((warnings_count++))
    fi
    
    # Puerto 80 (Nginx)
    if ! check_port "80" "Nginx"; then
        log_success "  ✅ Puerto 80 en uso (Nginx funcionando)"
    else
        log_warning "  ⚠️  Puerto 80 libre (Nginx podría no estar funcionando)"
        ((warnings_count++))
    fi
    
    # 9. Verificar conectividad HTTP
    log_info "9️⃣ Verificando conectividad HTTP..."
    
    # Verificar localhost
    if check_http_response "http://localhost"; then
        log_success "  ✅ Respuesta HTTP en localhost"
    else
        log_warning "  ⚠️  No hay respuesta HTTP en localhost"
        ((warnings_count++))
    fi
    
    # Verificar API
    if check_http_response "http://localhost/api/health" || check_http_response "http://localhost:$PORT_BACKEND/api/health"; then
        log_success "  ✅ API responde correctamente"
    else
        log_warning "  ⚠️  API no responde"
        ((warnings_count++))
    fi
    
    # 10. Verificar logs
    log_info "🔟 Verificando logs..."
    
    # Logs de PM2
    if [[ -d "/home/$APP_USER/.pm2/logs" ]] || [[ -d "$APP_DIR/logs" ]]; then
        log_success "  ✅ Directorio de logs encontrado"
    else
        log_warning "  ⚠️  Directorio de logs no encontrado"
        ((warnings_count++))
    fi
    
    # Logs de Nginx
    if [[ -f "/var/log/nginx/$APP_NAME-access.log" ]] || [[ -f "/var/log/nginx/access.log" ]]; then
        log_success "  ✅ Logs de Nginx encontrados"
    else
        log_warning "  ⚠️  Logs de Nginx no encontrados"
        ((warnings_count++))
    fi
    
    # Resumen final
    echo ""
    echo "📊 RESUMEN DE VERIFICACIÓN"
    echo "=========================="
    
    if [[ "$all_checks_passed" == "true" && "$errors_count" -eq 0 ]]; then
        if [[ "$warnings_count" -eq 0 ]]; then
            log_success "🎉 ¡Instalación perfecta! Todos los servicios están funcionando correctamente."
        else
            log_success "✅ Instalación exitosa con $warnings_count advertencias menores."
        fi
    else
        log_error "❌ Instalación incompleta. Se encontraron $errors_count errores y $warnings_count advertencias."
    fi
    
    echo ""
    echo "📋 INFORMACIÓN ÚTIL:"
    echo "• Estado de servicios: sudo systemctl status mongod nginx"
    echo "• Estado de PM2: sudo -u $APP_USER pm2 status"
    echo "• Logs de aplicación: sudo -u $APP_USER pm2 logs"
    echo "• Logs de Nginx: sudo tail -f /var/log/nginx/$APP_NAME-*.log"
    echo "• Diagnóstico MongoDB: node $APP_DIR/diagnose-system.js --mongo-only"
    echo "• Reiniciar aplicación: sudo -u $APP_USER pm2 restart all"
    echo "• Reiniciar Nginx: sudo systemctl restart nginx"
    echo ""
    
    if [[ "$errors_count" -gt 0 ]]; then
        echo "🔧 SOLUCIONES RECOMENDADAS:"
        echo "• Ejecutar script de instalación nuevamente: ./install.sh"
        echo "• Verificar logs para errores específicos"
        echo "• Contactar soporte si los problemas persisten"
        echo ""
        return 1
    fi
    
    return 0
}

# Función de ayuda
show_help() {
    echo "Script de verificación post-instalación para Tractoreando"
    echo ""
    echo "Uso: $0 [opciones]"
    echo ""
    echo "Opciones:"
    echo "  -h, --help     Mostrar esta ayuda"
    echo "  -q, --quiet    Modo silencioso (solo errores)"
    echo "  -v, --verbose  Modo detallado"
    echo ""
    echo "Este script verifica que todos los componentes de Tractoreando"
    echo "estén instalados y funcionando correctamente."
    echo ""
}

# Procesar argumentos de línea de comandos
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -q|--quiet)
            # Redirigir info y success a /dev/null en modo silencioso
            exec 3>&1
            log_info() { :; }
            log_success() { :; }
            shift
            ;;
        -v|--verbose)
            # En modo verbose, mostrar más detalles
            set -x
            shift
            ;;
        *)
            echo "Opción desconocida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Verificar si se ejecuta como root (recomendado para verificaciones completas)
if [[ $EUID -ne 0 ]]; then
    log_warning "Se recomienda ejecutar este script como root para verificaciones completas"
    log_info "Ejecuta: sudo $0"
    echo ""
fi

# Ejecutar verificación principal
verify_installation
exit_code=$?

echo "Verificación completada."
exit $exit_code