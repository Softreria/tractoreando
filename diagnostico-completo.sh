#!/bin/bash

# Script de Diagnóstico Completo - Tractoreando
# Identifica y resuelve problemas de acceso

# set -e # Comentado para permitir que el script continúe en caso de errores

echo "🔍 Diagnóstico Completo de Tractoreando"
echo "======================================="

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Variables globales
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

# Función para verificar servicios del sistema
check_system_services() {
    echo ""
    log_info "=== VERIFICACIÓN DE SERVICIOS DEL SISTEMA ==="
    
    # MongoDB
    if pgrep -f mongod >/dev/null 2>&1; then
        log_success "✓ mongod está ejecutándose"
        count_result "success"
    else
        log_error "✗ mongod no está ejecutándose"
        log_info "Intentando iniciar MongoDB..."
        brew services start mongodb-community >/dev/null 2>&1
        sleep 2
        if pgrep -f mongod >/dev/null 2>&1; then
            log_success "✓ MongoDB iniciado correctamente"
        fi
        count_result "error"
    fi
    
    # Nginx
    if pgrep -f nginx >/dev/null 2>&1; then
        log_success "✓ nginx está ejecutándose"
        count_result "success"
    else
        log_error "✗ nginx no está ejecutándose"
        log_info "Intentando iniciar Nginx..."
        brew services start nginx >/dev/null 2>&1 || sudo nginx >/dev/null 2>&1
        sleep 2
        if pgrep -f nginx >/dev/null 2>&1; then
            log_success "✓ Nginx iniciado correctamente"
        fi
        count_result "error"
    fi
}

# Función para verificar puertos
check_ports() {
    echo ""
    log_info "=== VERIFICACIÓN DE PUERTOS ==="
    
    local ports=("5000:Backend" "80:Nginx" "27017:MongoDB")
    
    for port_info in "${ports[@]}"; do
        local port=$(echo "$port_info" | cut -d':' -f1)
        local service=$(echo "$port_info" | cut -d':' -f2)
        
        if lsof -i :$port >/dev/null 2>&1; then
            local process=$(lsof -i :$port | tail -n 1 | awk '{print $1}')
            log_success "✓ Puerto $port ($service) está en uso por $process"
            count_result "success"
        else
            log_error "✗ Puerto $port ($service) no está en uso"
            count_result "error"
        fi
    done
}

# Función para verificar PM2
check_pm2() {
    echo ""
    log_info "=== VERIFICACIÓN DE PM2 ==="
    
    if command -v pm2 &> /dev/null; then
        log_success "✓ PM2 está instalado"
        count_result "success"
        
        # Verificar procesos PM2
        local pm2_output=$(pm2 list 2>/dev/null || echo "")
        if echo "$pm2_output" | grep -q "tractoreando"; then
            if echo "$pm2_output" | grep "tractoreando" | grep -q "online"; then
                log_success "✓ Aplicación Tractoreando está ejecutándose en PM2"
                count_result "success"
            else
                log_error "✗ Aplicación Tractoreando no está online en PM2"
                count_result "error"
                
                # Intentar reiniciar
                log_info "Intentando reiniciar la aplicación..."
                if [[ -f "/opt/tractoreando/ecosystem.config.js" ]]; then
                    pm2 restart tractoreando 2>/dev/null || pm2 start /opt/tractoreando/ecosystem.config.js
                    sleep 3
                    pm2 status
                fi
                
                # Mostrar estado detallado
                pm2 show tractoreando 2>/dev/null || true
            fi
        else
            log_error "✗ Aplicación Tractoreando no está configurada en PM2"
            count_result "error"
            
            # Intentar iniciar si existe el archivo de configuración
            if [[ -f "/opt/tractoreando/ecosystem.config.js" ]]; then
                log_info "Intentando iniciar la aplicación..."
                pm2 start /opt/tractoreando/ecosystem.config.js
                sleep 3
                pm2 status
            fi
        fi
    else
        log_error "✗ PM2 no está instalado"
        count_result "error"
        log_info "Para instalar PM2: sudo npm install -g pm2"
    fi
}

# Función para verificar MongoDB
check_mongodb() {
    echo ""
    log_info "=== VERIFICACIÓN DE MONGODB ==="
    
    # Verificar conexión a MongoDB
    if mongosh --eval "db.adminCommand('ping')" --quiet 2>/dev/null; then
        log_success "✓ MongoDB está accesible"
        count_result "success"
        
        # Verificar base de datos
        if mongosh tractoreando_prod --eval "db.stats()" --quiet 2>/dev/null; then
            log_success "✓ Base de datos tractoreando_prod existe"
            count_result "success"
        else
            log_warning "⚠ Base de datos tractoreando_prod no existe (se creará automáticamente)"
            count_result "warning"
        fi
    else
        log_error "✗ No se puede conectar a MongoDB"
        count_result "error"
        
        # Verificar logs de MongoDB
        if [[ -f "/var/log/mongodb/mongod.log" ]]; then
            log_info "Últimas líneas del log de MongoDB:"
            tail -10 /var/log/mongodb/mongod.log
        fi
    fi
}

# Función para verificar archivos de configuración
check_config_files() {
    echo ""
    log_info "=== VERIFICACIÓN DE ARCHIVOS DE CONFIGURACIÓN ==="
    
    local config_files=(
        "/opt/tractoreando/.env:Variables de entorno"
        "/opt/tractoreando/ecosystem.config.js:Configuración PM2"
        "/etc/nginx/sites-enabled/tractoreando:Configuración Nginx"
        "/opt/tractoreando/package.json:Package.json"
    )
    
    for file_info in "${config_files[@]}"; do
        local file=$(echo "$file_info" | cut -d':' -f1)
        local desc=$(echo "$file_info" | cut -d':' -f2)
        
        if [[ -f "$file" ]]; then
            log_success "✓ $desc existe ($file)"
            count_result "success"
        else
            log_error "✗ $desc no existe ($file)"
            count_result "error"
        fi
    done
}

# Función para verificar conectividad
check_connectivity() {
    echo ""
    log_info "=== VERIFICACIÓN DE CONECTIVIDAD ==="
    
    # Verificar frontend local
    local frontend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null)
    if [[ "$frontend_response" =~ ^(200|301|302)$ ]]; then
        log_success "✓ Frontend accesible localmente (puerto 80) - código: $frontend_response"
        count_result "success"
    else
        log_error "✗ Frontend no accesible localmente (puerto 80) - código: $frontend_response"
        log_info "Verificando configuración de Nginx..."
        if [[ -f "/etc/nginx/sites-available/tractoreando" ]]; then
            log_info "Configuración de Nginx encontrada"
        else
            log_warning "⚠ Configuración de Nginx no encontrada"
        fi
        count_result "error"
    fi
    
    # Verificar backend local
    local backend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null)
    if [[ "$backend_response" =~ ^(200|404)$ ]]; then
        log_success "✓ Backend accesible localmente (puerto 5000) - código: $backend_response"
        count_result "success"
    else
        log_error "✗ Backend no accesible localmente (puerto 5000) - código: $backend_response"
        log_info "Verificando logs del backend..."
        if [[ -f "$HOME/.pm2/logs/tractoreando-error.log" ]]; then
            echo "Últimos errores del backend:"
            tail -n 5 "$HOME/.pm2/logs/tractoreando-error.log"
        fi
        count_result "error"
    fi
    
    # Verificar API health endpoint
    local health_response=$(curl -s http://localhost:5000/api/health 2>/dev/null)
    if echo "$health_response" | grep -q "ok\|healthy\|success"; then
        log_success "✓ API health endpoint responde correctamente"
        count_result "success"
    else
        log_warning "⚠ API health endpoint no responde (normal si no está implementado)"
        count_result "warning"
    fi
}

# Función para verificar logs
check_logs() {
    echo ""
    log_info "=== VERIFICACIÓN DE LOGS ==="
    
    local log_files=(
        "/opt/tractoreando/logs/app.log:Log de aplicación"
        "/opt/tractoreando/logs/pm2-error.log:Log de errores PM2"
        "/var/log/nginx/tractoreando_error.log:Log de errores Nginx"
    )
    
    for log_info in "${log_files[@]}"; do
        local log_file=$(echo "$log_info" | cut -d':' -f1)
        local desc=$(echo "$log_info" | cut -d':' -f2)
        
        if [[ -f "$log_file" ]]; then
            local size=$(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null || echo "0")
            if [[ $size -gt 0 ]]; then
                log_info "📄 $desc existe y tiene contenido ($size bytes)"
                
                # Mostrar últimas líneas si hay errores recientes
                if tail -20 "$log_file" | grep -i "error\|exception\|failed" >/dev/null 2>&1; then
                    log_warning "⚠ Se encontraron errores recientes en $desc:"
                    tail -10 "$log_file" | grep -i "error\|exception\|failed" | tail -3
                    count_result "warning"
                else
                    log_success "✓ No se encontraron errores recientes en $desc"
                    count_result "success"
                fi
            else
                log_info "📄 $desc existe pero está vacío"
            fi
        else
            log_warning "⚠ $desc no existe"
            count_result "warning"
        fi
    done
}

# Función para verificar recursos del sistema
check_system_resources() {
    echo ""
    log_info "=== VERIFICACIÓN DE RECURSOS DEL SISTEMA ==="
    
    # Verificar memoria
    local mem_total=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    local mem_used=$(free -m | awk 'NR==2{printf "%.0f", $3}')
    local mem_percent=$((mem_used * 100 / mem_total))
    
    if [[ $mem_percent -lt 80 ]]; then
        log_success "✓ Memoria: ${mem_used}MB/${mem_total}MB (${mem_percent}%)"
        count_result "success"
    else
        log_warning "⚠ Memoria alta: ${mem_used}MB/${mem_total}MB (${mem_percent}%)"
        count_result "warning"
    fi
    
    # Verificar espacio en disco
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -lt 90 ]]; then
        log_success "✓ Espacio en disco: ${disk_usage}% usado"
        count_result "success"
    else
        log_warning "⚠ Espacio en disco alto: ${disk_usage}% usado"
        count_result "warning"
    fi
    
    # Verificar carga del sistema
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    log_info "📊 Carga del sistema: $load_avg"
}

# Función para generar recomendaciones
generate_recommendations() {
    echo ""
    log_info "=== RECOMENDACIONES ==="
    
    if [[ $ERRORS -gt 0 ]]; then
        echo ""
        log_error "🚨 SE ENCONTRARON $ERRORS ERRORES CRÍTICOS:"
        
        # Recomendaciones específicas basadas en errores comunes
        if ! systemctl is-active --quiet mongod 2>/dev/null; then
            echo "   • Instalar/iniciar MongoDB: sudo systemctl start mongod"
        fi
        
        if ! systemctl is-active --quiet nginx 2>/dev/null; then
            echo "   • Instalar/iniciar Nginx: sudo systemctl start nginx"
        fi
        
        if ! command -v pm2 &> /dev/null; then
            echo "   • Instalar PM2: sudo npm install -g pm2"
        fi
        
        if ! netstat -tlnp 2>/dev/null | grep -q ":5000 "; then
            echo "   • Iniciar aplicación: cd /opt/tractoreando && pm2 start ecosystem.config.js"
        fi
        
        echo "   • Ejecutar script de instalación rápida: sudo ./instalacion-rapida.sh"
    fi
    
    if [[ $WARNINGS -gt 0 ]]; then
        echo ""
        log_warning "⚠ SE ENCONTRARON $WARNINGS ADVERTENCIAS:"
        echo "   • Revisar logs para más detalles"
        echo "   • Verificar configuración de Nginx Proxy Manager"
    fi
    
    if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
        echo ""
        log_success "🎉 ¡TODO ESTÁ FUNCIONANDO CORRECTAMENTE!"
        echo "   • Aplicación accesible en: https://tractoreando.softreria.com"
        echo "   • Configurar Nginx Proxy Manager si aún no está hecho"
    fi
}

# Función para mostrar información de acceso
show_access_info() {
    echo ""
    log_info "=== INFORMACIÓN DE ACCESO ==="
    
    local server_ip=$(hostname -I | awk '{print $1}' || echo 'localhost')
    
    echo "📍 DIRECCIONES DE ACCESO:"
    echo "   • Local (servidor): http://$server_ip"
    echo "   • Público: https://tractoreando.softreria.com"
    echo ""
    echo "🔧 CONFIGURACIÓN NGINX PROXY MANAGER:"
    echo "   • Domain Names: tractoreando.softreria.com"
    echo "   • Forward Hostname/IP: $server_ip"
    echo "   • Forward Port: 80"
    echo "   • Cache Assets: ✓ Habilitado"
    echo "   • Block Common Exploits: ✓ Habilitado"
    echo "   • Websockets Support: ✓ Habilitado"
    echo "   • SSL Certificate: ✓ Let's Encrypt"
}

# Función principal
main() {
    echo "Iniciando diagnóstico completo..."
    echo "Fecha: $(date)"
    echo "Servidor: $(hostname)"
    echo "Usuario: $(whoami)"
    
    check_system_services
    check_ports
    check_pm2
    check_mongodb
    check_config_files
    check_connectivity
    check_logs
    check_system_resources
    
    echo ""
    echo "🏁 RESUMEN DEL DIAGNÓSTICO"
    echo "========================="
    echo "✅ Éxitos: $successes"
    echo "⚠️  Advertencias: $warnings"
    echo "❌ Errores: $errors"
    
    generate_recommendations
    show_access_info
    
    echo ""
    if [[ $errors -eq 0 ]]; then
        log_success "🎉 Diagnóstico completado - Sistema funcionando correctamente"
        exit 0
    else
        log_error "🚨 Diagnóstico completado - Se encontraron errores que requieren atención"
        exit 1
    fi
}

# Verificar si se ejecuta como root
if [[ $EUID -ne 0 ]]; then
    log_warning "Ejecutando como usuario normal. Algunas verificaciones pueden requerir permisos de root."
    log_info "Para un diagnóstico completo, ejecuta: sudo ./diagnostico-completo.sh"
fi

# Ejecutar función principal
main "$@"