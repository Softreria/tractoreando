#!/bin/bash

# Script de verificación para el servidor de producción
# Ejecutar con: bash verificar-servidor.sh

echo "=== VERIFICACIÓN DEL SERVIDOR TRACTOREANDO ==="
echo "Fecha: $(date)"
echo "Usuario: $(whoami)"
echo "Directorio actual: $(pwd)"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar estado
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
    fi
}

check_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

echo "1. VERIFICANDO ARCHIVOS DE CONFIGURACIÓN..."
echo "─────────────────────────────────────────────"

# Verificar archivos principales
if [ -f ".env.production" ]; then
    echo -e "${GREEN}✓ .env.production existe${NC}"
    echo "   Contenido:"
    grep -E "^(NODE_ENV|PORT|BASE_URL)" .env.production | sed 's/^/   /'
else
    echo -e "${RED}✗ .env.production NO EXISTE${NC}"
fi

if [ -f ".env" ]; then
    echo -e "${GREEN}✓ .env existe${NC}"
else
    echo -e "${YELLOW}⚠ .env no existe (se usará .env.production)${NC}"
fi

if [ -f "frontend/.env.production" ]; then
    echo -e "${GREEN}✓ frontend/.env.production existe${NC}"
    echo "   API URL: $(grep REACT_APP_API_URL frontend/.env.production)"
else
    echo -e "${RED}✗ frontend/.env.production NO EXISTE${NC}"
fi

if [ -f "ecosystem.config.js" ]; then
    echo -e "${GREEN}✓ ecosystem.config.js existe${NC}"
else
    echo -e "${RED}✗ ecosystem.config.js NO EXISTE${NC}"
fi

if [ -f "server.js" ]; then
    echo -e "${GREEN}✓ server.js existe${NC}"
else
    echo -e "${RED}✗ server.js NO EXISTE${NC}"
fi

echo ""
echo "2. VERIFICANDO DEPENDENCIAS..."
echo "─────────────────────────────────"

# Verificar Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js instalado: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js NO INSTALADO${NC}"
fi

# Verificar npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm instalado: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm NO INSTALADO${NC}"
fi

# Verificar PM2
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version)
    echo -e "${GREEN}✓ PM2 instalado: $PM2_VERSION${NC}"
else
    echo -e "${RED}✗ PM2 NO INSTALADO${NC}"
fi

# Verificar dependencias del proyecto
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Dependencias del backend instaladas${NC}"
else
    echo -e "${RED}✗ Dependencias del backend NO INSTALADAS${NC}"
fi

if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✓ Dependencias del frontend instaladas${NC}"
else
    echo -e "${RED}✗ Dependencias del frontend NO INSTALADAS${NC}"
fi

# Verificar build del frontend
if [ -d "frontend/build" ]; then
    echo -e "${GREEN}✓ Build del frontend existe${NC}"
    if [ -f "frontend/build/index.html" ]; then
        echo -e "${GREEN}✓ index.html del build existe${NC}"
    else
        echo -e "${RED}✗ index.html del build NO EXISTE${NC}"
    fi
else
    echo -e "${RED}✗ Build del frontend NO EXISTE${NC}"
fi

echo ""
echo "3. VERIFICANDO SERVICIOS..."
echo "───────────────────────────"

# Verificar MongoDB
if command -v mongod &> /dev/null; then
    echo -e "${GREEN}✓ MongoDB instalado${NC}"
    if systemctl is-active --quiet mongod; then
        echo -e "${GREEN}✓ MongoDB está ejecutándose${NC}"
    else
        echo -e "${RED}✗ MongoDB NO está ejecutándose${NC}"
    fi
else
    echo -e "${RED}✗ MongoDB NO INSTALADO${NC}"
fi

# Verificar Nginx
if command -v nginx &> /dev/null; then
    NGINX_VERSION=$(nginx -v 2>&1 | cut -d' ' -f3)
    echo -e "${GREEN}✓ Nginx instalado: $NGINX_VERSION${NC}"
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✓ Nginx está ejecutándose${NC}"
    else
        echo -e "${RED}✗ Nginx NO está ejecutándose${NC}"
    fi
else
    echo -e "${RED}✗ Nginx NO INSTALADO${NC}"
fi

echo ""
echo "4. VERIFICANDO PUERTOS..."
echo "─────────────────────────"

# Verificar puerto 5000 (backend)
if lsof -i:5000 &> /dev/null; then
    PROCESS_5000=$(lsof -i:5000 | tail -n 1 | awk '{print $1, $2}')
    echo -e "${GREEN}✓ Puerto 5000 en uso por: $PROCESS_5000${NC}"
else
    echo -e "${YELLOW}⚠ Puerto 5000 libre${NC}"
fi

# Verificar puerto 80
if lsof -i:80 &> /dev/null; then
    echo -e "${GREEN}✓ Puerto 80 en uso (HTTP)${NC}"
else
    echo -e "${YELLOW}⚠ Puerto 80 libre${NC}"
fi

# Verificar puerto 443
if lsof -i:443 &> /dev/null; then
    echo -e "${GREEN}✓ Puerto 443 en uso (HTTPS)${NC}"
else
    echo -e "${YELLOW}⚠ Puerto 443 libre${NC}"
fi

echo ""
echo "5. VERIFICANDO PM2..."
echo "───────────────────────"

if command -v pm2 &> /dev/null; then
    echo "Estado de procesos PM2:"
    pm2 status
    echo ""
    
    if pm2 list | grep -q "tractoreando"; then
        echo -e "${GREEN}✓ Aplicación 'tractoreando' encontrada en PM2${NC}"
        echo "Últimas líneas del log:"
        pm2 logs tractoreando --lines 5 --nostream
    else
        echo -e "${YELLOW}⚠ Aplicación 'tractoreando' NO encontrada en PM2${NC}"
    fi
else
    echo -e "${RED}✗ PM2 no disponible${NC}"
fi

echo ""
echo "6. VERIFICANDO CONFIGURACIÓN DE NGINX..."
echo "────────────────────────────────────────"

if [ -f "/etc/nginx/sites-available/tractoreando" ]; then
    echo -e "${GREEN}✓ Configuración de Nginx existe${NC}"
else
    echo -e "${RED}✗ Configuración de Nginx NO EXISTE${NC}"
fi

if [ -L "/etc/nginx/sites-enabled/tractoreando" ]; then
    echo -e "${GREEN}✓ Sitio habilitado en Nginx${NC}"
else
    echo -e "${RED}✗ Sitio NO habilitado en Nginx${NC}"
fi

# Verificar sintaxis de Nginx
if command -v nginx &> /dev/null; then
    if nginx -t &> /dev/null; then
        echo -e "${GREEN}✓ Configuración de Nginx es válida${NC}"
    else
        echo -e "${RED}✗ Configuración de Nginx tiene errores${NC}"
        echo "Errores:"
        nginx -t 2>&1 | sed 's/^/   /'
    fi
fi

echo ""
echo "7. VERIFICANDO SSL..."
echo "───────────────────────"

if [ -f "/etc/letsencrypt/live/tractoreando.softreria.com/fullchain.pem" ]; then
    echo -e "${GREEN}✓ Certificado SSL existe${NC}"
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/tractoreando.softreria.com/fullchain.pem | cut -d= -f2)
    echo "   Expira: $CERT_EXPIRY"
else
    echo -e "${YELLOW}⚠ Certificado SSL NO EXISTE${NC}"
fi

echo ""
echo "8. VERIFICANDO CONECTIVIDAD..."
echo "─────────────────────────────"

# Test local del backend
echo "Probando backend local..."
if curl -s -f http://localhost:5000/api/health &> /dev/null; then
    echo -e "${GREEN}✓ Backend responde en localhost:5000${NC}"
else
    echo -e "${RED}✗ Backend NO responde en localhost:5000${NC}"
fi

# Test a través de Nginx local (importante para proxy manager)
echo "Probando a través de Nginx local..."
if curl -s -f http://localhost/health &> /dev/null; then
    echo -e "${GREEN}✓ Nginx local responde en puerto 80${NC}"
else
    echo -e "${RED}✗ Nginx local NO responde en puerto 80${NC}"
fi

# Test del dominio (si está configurado)
echo "Probando dominio público..."
if curl -s -f https://tractoreando.softreria.com/api/health &> /dev/null; then
    echo -e "${GREEN}✓ API pública responde${NC}"
else
    echo -e "${YELLOW}⚠ API pública NO responde (normal si SSL no está configurado)${NC}"
fi

if curl -s -f https://tractoreando.softreria.com &> /dev/null; then
    echo -e "${GREEN}✓ Frontend público responde${NC}"
else
    echo -e "${YELLOW}⚠ Frontend público NO responde (normal si SSL no está configurado)${NC}"
fi

echo ""
echo "9. INFORMACIÓN DEL SISTEMA..."
echo "────────────────────────────"

echo "Sistema operativo: $(lsb_release -d 2>/dev/null | cut -f2 || uname -s)"
echo "Arquitectura: $(uname -m)"
echo "Memoria total: $(free -h | awk '/^Mem:/ {print $2}')"
echo "Memoria disponible: $(free -h | awk '/^Mem:/ {print $7}')"
echo "Espacio en disco: $(df -h / | awk 'NR==2 {print $4" disponible de "$2}')"
echo "Carga del sistema: $(uptime | awk -F'load average:' '{print $2}')"

echo ""
echo "10. RESUMEN Y RECOMENDACIONES..."
echo "───────────────────────────────"

# Contador de problemas
PROBLEMS=0

# Verificaciones críticas
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ CRÍTICO: Falta archivo .env.production${NC}"
    ((PROBLEMS++))
fi

if [ ! -f "frontend/.env.production" ]; then
    echo -e "${RED}❌ CRÍTICO: Falta archivo frontend/.env.production${NC}"
    ((PROBLEMS++))
fi

if [ ! -d "frontend/build" ]; then
    echo -e "${RED}❌ CRÍTICO: Falta build del frontend${NC}"
    ((PROBLEMS++))
fi

if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ CRÍTICO: PM2 no está instalado${NC}"
    ((PROBLEMS++))
fi

if ! systemctl is-active --quiet mongod; then
    echo -e "${RED}❌ CRÍTICO: MongoDB no está ejecutándose${NC}"
    ((PROBLEMS++))
fi

if [ $PROBLEMS -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡Todo parece estar en orden!${NC}"
    echo "Puedes proceder con el despliegue."
else
    echo -e "${RED}⚠️  Se encontraron $PROBLEMS problemas críticos.${NC}"
    echo "Revisa los errores anteriores antes de continuar."
fi

echo ""
echo "=== FIN DE LA VERIFICACIÓN ==="
echo "Para más detalles, revisa el archivo COMANDOS-SERVIDOR-DIRECTO.md"