#!/bin/bash

# Script para configurar automáticamente el proxy reverso externo
# Configura la aplicación para funcionar detrás de Nginx Proxy Manager

set -e

echo "🔧 Configurando Tractoreando para proxy reverso externo..."
echo "======================================================"
echo "📡 Este script configura la aplicación para funcionar detrás de un proxy manager"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
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

# Configuración
APP_NAME="tractoreando"
APP_DIR="/opt/$APP_NAME"
APP_USER="$APP_NAME"
ENV_FILE="$APP_DIR/.env"
NGINX_CONFIG="/etc/nginx/sites-available/$APP_NAME"

# Función para solicitar información del usuario
get_user_input() {
    echo "📋 Configuración del proxy reverso"
    echo "==================================="
    echo ""
    
    # Dominio principal
    read -p "🌐 Dominio principal (ej: tractoreando.miempresa.com): " DOMAIN
    if [[ -z "$DOMAIN" ]]; then
        log_error "El dominio es obligatorio"
        exit 1
    fi
    
    # IP del proxy manager
    read -p "📡 IP del servidor Nginx Proxy Manager (ej: 192.168.1.100): " PROXY_IP
    if [[ -z "$PROXY_IP" ]]; then
        log_warning "No se especificó IP del proxy manager, usando configuración genérica"
        PROXY_IP="0.0.0.0/0"
    fi
    
    # Protocolo
    read -p "🔒 ¿Usar HTTPS? (y/N): " USE_HTTPS
    if [[ "$USE_HTTPS" =~ ^[Yy]$ ]]; then
        PROTOCOL="https"
    else
        PROTOCOL="http"
    fi
    
    # Red interna
    read -p "🔗 Red interna (ej: 192.168.1.0/24) [Enter para auto-detectar]: " INTERNAL_NETWORK
    if [[ -z "$INTERNAL_NETWORK" ]]; then
        # Auto-detectar red interna
        INTERNAL_NETWORK=$(ip route | grep -E '192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.' | head -1 | awk '{print $1}' || echo "192.168.1.0/24")
        log_info "Red interna auto-detectada: $INTERNAL_NETWORK"
    fi
    
    echo ""
    log_info "Configuración a aplicar:"
    echo "   • Dominio: $DOMAIN"
    echo "   • Protocolo: $PROTOCOL"
    echo "   • IP Proxy Manager: $PROXY_IP"
    echo "   • Red interna: $INTERNAL_NETWORK"
    echo ""
    
    read -p "¿Continuar con esta configuración? (Y/n): " CONFIRM
    if [[ "$CONFIRM" =~ ^[Nn]$ ]]; then
        log_info "Configuración cancelada"
        exit 0
    fi
}

# Función para verificar permisos
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        log_error "Este script no debe ejecutarse como root"
        log_info "Ejecuta: sudo -u $APP_USER $0"
        exit 1
    fi
    
    if [[ ! -d "$APP_DIR" ]]; then
        log_error "Directorio de aplicación no encontrado: $APP_DIR"
        log_info "Ejecuta primero: sudo ./install-standalone.sh"
        exit 1
    fi
}

# Función para hacer backup de configuración actual
backup_config() {
    log_info "Creando backup de configuración actual..."
    
    BACKUP_DIR="$APP_DIR/config-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup del .env
    if [[ -f "$ENV_FILE" ]]; then
        cp "$ENV_FILE" "$BACKUP_DIR/.env.backup"
    fi
    
    # Backup de configuración de Nginx
    if [[ -f "$NGINX_CONFIG" ]]; then
        sudo cp "$NGINX_CONFIG" "$BACKUP_DIR/nginx.conf.backup"
    fi
    
    log_success "Backup creado en: $BACKUP_DIR"
}

# Función para configurar variables de entorno
configure_environment() {
    log_info "Configurando variables de entorno para proxy reverso..."
    
    # Crear archivo temporal con nueva configuración
    TEMP_ENV="/tmp/.env.proxy.$$"
    
    if [[ -f "$ENV_FILE" ]]; then
        cp "$ENV_FILE" "$TEMP_ENV"
    else
        cp "$APP_DIR/.env.production" "$TEMP_ENV"
    fi
    
    # Actualizar configuraciones específicas para proxy
    sed -i "s|^BASE_URL=.*|BASE_URL=${PROTOCOL}://${DOMAIN}|g" "$TEMP_ENV"
    sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=${PROTOCOL}://${DOMAIN}|g" "$TEMP_ENV"
    sed -i "s|^BACKEND_URL=.*|BACKEND_URL=${PROTOCOL}://${DOMAIN}/api|g" "$TEMP_ENV"
    sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=${PROTOCOL}://${DOMAIN}|g" "$TEMP_ENV"
    
    # Configuración de proxy
    sed -i "s|^TRUST_PROXY=.*|TRUST_PROXY=true|g" "$TEMP_ENV"
    
    # Configurar IPs confiables
    if [[ "$PROXY_IP" != "0.0.0.0/0" ]]; then
        TRUSTED_IPS="10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,${PROXY_IP}"
    else
        TRUSTED_IPS="10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
    fi
    sed -i "s|^TRUSTED_PROXIES=.*|TRUSTED_PROXIES=${TRUSTED_IPS}|g" "$TEMP_ENV"
    
    # Configuración de red interna
    sed -i "s|^INTERNAL_NETWORK=.*|INTERNAL_NETWORK=${INTERNAL_NETWORK}|g" "$TEMP_ENV"
    
    # Configuración SSL
    if [[ "$PROTOCOL" == "https" ]]; then
        sed -i "s|^SSL_ENABLED=.*|SSL_ENABLED=false|g" "$TEMP_ENV"
        sed -i "s|^SSL_REDIRECT=.*|SSL_REDIRECT=false|g" "$TEMP_ENV"
    fi
    
    # Mover archivo temporal al lugar final
    mv "$TEMP_ENV" "$ENV_FILE"
    
    log_success "Variables de entorno configuradas"
}

# Función para configurar firewall
configure_firewall() {
    log_info "Configurando firewall para proxy reverso..."
    
    # Detectar sistema de firewall
    if command -v ufw &> /dev/null; then
        # UFW (Ubuntu/Debian)
        log_info "Configurando UFW..."
        
        # Permitir tráfico desde el proxy manager
        if [[ "$PROXY_IP" != "0.0.0.0/0" ]]; then
            sudo ufw allow from "$PROXY_IP" to any port 80
            sudo ufw allow from "$PROXY_IP" to any port 443
        fi
        
        # Permitir red interna
        sudo ufw allow from "$INTERNAL_NETWORK"
        
        # Mostrar estado
        sudo ufw status numbered
        
    elif command -v firewall-cmd &> /dev/null; then
        # Firewalld (CentOS/RHEL/Fedora)
        log_info "Configurando Firewalld..."
        
        if [[ "$PROXY_IP" != "0.0.0.0/0" ]]; then
            sudo firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='$PROXY_IP' port protocol='tcp' port='80' accept"
            sudo firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='$PROXY_IP' port protocol='tcp' port='443' accept"
        fi
        
        sudo firewall-cmd --permanent --add-source="$INTERNAL_NETWORK"
        sudo firewall-cmd --reload
        
    else
        log_warning "Sistema de firewall no detectado, configurar manualmente"
    fi
    
    log_success "Firewall configurado"
}

# Función para configurar Nginx
configure_nginx() {
    log_info "Configurando Nginx para proxy reverso..."
    
    # Crear configuración temporal
    TEMP_NGINX="/tmp/nginx.proxy.$$"
    
    if [[ -f "$APP_DIR/nginx-standalone.conf" ]]; then
        cp "$APP_DIR/nginx-standalone.conf" "$TEMP_NGINX"
    else
        log_error "Archivo de configuración nginx-standalone.conf no encontrado"
        return 1
    fi
    
    # Actualizar configuración para el dominio específico
    sed -i "s|server_name _;|server_name ${DOMAIN};|g" "$TEMP_NGINX"
    
    # Agregar IP del proxy manager a las IPs confiables
    if [[ "$PROXY_IP" != "0.0.0.0/0" ]]; then
        sed -i "/set_real_ip_from fc00::\/\/7;/a\        set_real_ip_from ${PROXY_IP};" "$TEMP_NGINX"
    fi
    
    # Copiar configuración actualizada
    sudo cp "$TEMP_NGINX" "$NGINX_CONFIG"
    rm "$TEMP_NGINX"
    
    # Verificar configuración
    if sudo nginx -t; then
        log_success "Configuración de Nginx válida"
    else
        log_error "Error en la configuración de Nginx"
        return 1
    fi
}

# Función para reiniciar servicios
restart_services() {
    log_info "Reiniciando servicios..."
    
    # Reiniciar aplicación
    if command -v pm2 &> /dev/null; then
        pm2 restart all
        log_success "Aplicación reiniciada"
    else
        log_warning "PM2 no encontrado, reiniciar manualmente"
    fi
    
    # Reiniciar Nginx
    if sudo systemctl reload nginx; then
        log_success "Nginx recargado"
    else
        log_error "Error al recargar Nginx"
    fi
}

# Función para verificar configuración
verify_configuration() {
    log_info "Verificando configuración..."
    
    # Verificar que la aplicación responde
    if curl -s http://localhost/health > /dev/null; then
        log_success "Health check local: OK"
    else
        log_error "Health check local: FALLO"
    fi
    
    # Verificar configuración de Nginx
    if sudo nginx -t > /dev/null 2>&1; then
        log_success "Configuración Nginx: OK"
    else
        log_error "Configuración Nginx: FALLO"
    fi
    
    # Verificar estado de PM2
    if pm2 list | grep -q "online"; then
        log_success "Estado PM2: OK"
    else
        log_error "Estado PM2: FALLO"
    fi
}

# Función para mostrar información de configuración
show_configuration_info() {
    echo ""
    echo "🎉 ¡Configuración de proxy reverso completada!"
    echo "============================================="
    echo ""
    echo "📋 Información de configuración:"
    echo "   • Dominio configurado: $DOMAIN"
    echo "   • Protocolo: $PROTOCOL"
    echo "   • IP Proxy Manager: $PROXY_IP"
    echo "   • Red interna: $INTERNAL_NETWORK"
    echo ""
    echo "🔧 Configuración en Nginx Proxy Manager:"
    echo "   • Domain Names: $DOMAIN"
    echo "   • Scheme: http"
    echo "   • Forward Hostname/IP: $(hostname -I | awk '{print $1}')"
    echo "   • Forward Port: 80"
    echo ""
    echo "🔍 URLs de verificación:"
    echo "   • Health check local: http://$(hostname -I | awk '{print $1}')/health"
    echo "   • Health check público: ${PROTOCOL}://${DOMAIN}/health"
    echo "   • Aplicación: ${PROTOCOL}://${DOMAIN}"
    echo ""
    echo "📁 Archivos modificados:"
    echo "   • Variables de entorno: $ENV_FILE"
    echo "   • Configuración Nginx: $NGINX_CONFIG"
    echo "   • Backup en: $BACKUP_DIR"
    echo ""
    echo "⚠️  Próximos pasos:"
    echo "   1. Configurar el proxy host en Nginx Proxy Manager"
    echo "   2. Configurar SSL/TLS en el proxy manager"
    echo "   3. Verificar que el dominio apunta al proxy manager"
    echo "   4. Probar la aplicación: ${PROTOCOL}://${DOMAIN}"
    echo ""
    echo "📖 Guía detallada: NGINX-PROXY-MANAGER-SETUP.md"
    echo ""
}

# Función para mostrar ayuda
show_help() {
    echo "Script de configuración para proxy reverso externo"
    echo ""
    echo "Uso:"
    echo "  $0                    # Configuración interactiva"
    echo "  $0 --domain <domain> # Configuración con dominio específico"
    echo "  $0 --help            # Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0"
    echo "  $0 --domain tractoreando.miempresa.com"
    echo ""
}

# Función principal
main() {
    case "${1:-}" in
        "--help"|"-h"|"help")
            show_help
            exit 0
            ;;
        "--domain")
            if [[ -z "${2:-}" ]]; then
                log_error "Debe especificar un dominio"
                exit 1
            fi
            DOMAIN="$2"
            PROXY_IP="0.0.0.0/0"
            PROTOCOL="https"
            INTERNAL_NETWORK=$(ip route | grep -E '192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.' | head -1 | awk '{print $1}' || echo "192.168.1.0/24")
            ;;
        "")
            get_user_input
            ;;
        *)
            log_error "Opción no válida: $1"
            show_help
            exit 1
            ;;
    esac
    
    check_permissions
    backup_config
    configure_environment
    configure_firewall
    configure_nginx
    restart_services
    verify_configuration
    show_configuration_info
}

# Ejecutar función principal
main "$@"