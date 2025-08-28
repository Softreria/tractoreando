# 📚 Documentación Completa - Sistema Tractoreando

## 📋 Índice

1. [Información General](#información-general)
2. [Requisitos del Sistema](#requisitos-del-sistema)
3. [Instalación](#instalación)
4. [Configuración de Red y Proxy](#configuración-de-red-y-proxy)
5. [Despliegue en Producción](#despliegue-en-producción)
6. [Solución de Problemas](#solución-de-problemas)
7. [Mantenimiento](#mantenimiento)
8. [Monitoreo](#monitoreo)

---

## 📖 Información General

### Descripción del Sistema

Tractoreando es un sistema integral de gestión para empresas de transporte y logística que incluye:

**Características Principales:**
- 🏢 **Multi-empresa**: Gestión de múltiples empresas desde una sola instalación
- 🚛 **Gestión de Vehículos**: Control completo del parque vehicular
- 🔧 **Mantenimiento**: Programación y seguimiento de mantenimientos
- 📊 **Reportes**: Informes detallados y análisis de datos
- 👥 **Gestión de Usuarios**: Control de acceso y permisos
- 🚗 **[Sistema de Tipos de Vehículos](./SISTEMA-TIPOS-VEHICULOS.md)**: Control de acceso granular por tipos

**Tecnologías Utilizadas:**
- **Backend**: Node.js, Express.js, MongoDB
- **Frontend**: React, Material-UI
- **Gestión de Procesos**: PM2
- **Servidor Web**: Nginx
- **Base de Datos**: MongoDB

---

## 🖥️ Requisitos del Sistema

### Requisitos Mínimos
- **CPU**: 2 cores
- **RAM**: 4GB
- **Almacenamiento**: 20GB SSD
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Node.js**: v18.x o superior
- **MongoDB**: v6.0 o superior

### Requisitos Recomendados
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Almacenamiento**: 50GB+ SSD
- **Conexión**: 100Mbps+

### Compatibilidad de Navegadores
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 🚀 Instalación

### Instalación Automática

Use el script de instalación completa que consolida todas las funcionalidades:

```bash
# Descargar e instalar
wget https://raw.githubusercontent.com/tu-repo/tractoreando/main/instalacion-completa.sh
chmod +x instalacion-completa.sh

# Opciones de instalación:
./instalacion-completa.sh --quick          # Instalación rápida
./instalacion-completa.sh --standalone     # Servidor independiente
./instalacion-completa.sh --production     # Instalación interactiva
./instalacion-completa.sh --proxy-config   # Solo configurar proxy
./instalacion-completa.sh --verify         # Verificar instalación
```

### Instalación Manual

#### 1. Preparar el Sistema
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias básicas
sudo apt install -y curl wget git nginx mongodb-org nodejs npm

# Instalar PM2
sudo npm install -g pm2
```

#### 2. Clonar y Configurar
```bash
# Clonar repositorio
git clone https://github.com/tu-repo/tractoreando.git /opt/tractoreando
cd /opt/tractoreando

# Instalar dependencias
npm install --production
cd frontend && npm install && npm run build && cd ..
```

#### 3. Configurar Variables de Entorno
```bash
# Crear archivo .env
cp .env.example .env

# Editar configuración
vim .env
```

**Variables Críticas:**
```env
NODE_ENV=production
PORT=5000
BASE_URL=https://tu-dominio.com
FRONTEND_URL=https://tu-dominio.com
BACKEND_URL=https://tu-dominio.com/api
MONGODB_URI=mongodb://localhost:27017/tractoreando_prod
JWT_SECRET=tu-clave-jwt-super-segura
CORS_ORIGIN=https://tu-dominio.com
TRUST_PROXY=true
```

---

## 🌐 Configuración de Red y Proxy

### Escenarios de Deployment

#### Escenario 1: Servidor Independiente con Proxy Manager
```
┌─────────────────────┐    ┌─────────────────────┐
│   Nginx Proxy      │    │   Servidor          │
│   Manager           │────│   Tractoreando      │
│   (Servidor A)      │    │   (Servidor B)      │
│   - SSL/TLS         │    │   - App: Puerto 5000│
│   - Dominios        │    │   - Nginx: Puerto 80│
│   - Certificados    │    │   - Sin SSL local   │
└─────────────────────┘    └─────────────────────┘
```

#### Escenario 2: Servidor Todo-en-Uno
```
┌─────────────────────────────────────┐
│   Servidor Único                   │
│   - Nginx con SSL                  │
│   - Tractoreando App                │
│   - Base de Datos                  │
│   - Certificados Let's Encrypt     │
└─────────────────────────────────────┘
```

### Configuración de Puertos

| Puerto | Servicio | Descripción | Acceso |
|--------|----------|-------------|--------|
| 80 | Nginx | Servidor web principal | Público/Proxy |
| 443 | Nginx SSL | HTTPS | Público |
| 5000 | Node.js | API Backend | Solo localhost |
| 27017 | MongoDB | Base de datos | Solo localhost |
| 22 | SSH | Administración | Red privada |

### Configuración de Nginx

#### Para Servidor Independiente (sin SSL)
```nginx
server {
    listen 80;
    server_name _;
    
    # Servir archivos estáticos del frontend
    location / {
        root /opt/tractoreando/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy para la API del backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Para Servidor con SSL
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com;
    
    # Configuración SSL
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    
    # Resto de configuración igual que arriba...
}
```

### Configuración en Nginx Proxy Manager

#### Configuración del Proxy Host
- **Domain Names**: `tu-dominio.com`
- **Scheme**: `http`
- **Forward Hostname/IP**: `[IP_DEL_SERVIDOR_TRACTOREANDO]`
- **Forward Port**: `80`
- **SSL**: Habilitado con certificado automático

#### Headers Avanzados
```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Port $server_port;

client_max_body_size 50M;
proxy_connect_timeout 30s;
proxy_send_timeout 30s;
proxy_read_timeout 30s;

# Headers de seguridad
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Configuración de Firewall

#### Para Servidor Independiente
```bash
# Permitir tráfico desde proxy manager
sudo ufw allow from 192.168.1.0/24 to any port 80
sudo ufw allow from [IP_PROXY_MANAGER] to any port 80

# Permitir SSH desde red de administración
sudo ufw allow from 192.168.1.0/24 to any port 22

# Denegar acceso directo desde internet
sudo ufw deny 80
sudo ufw deny 443
sudo ufw deny 5000
```

#### Para Servidor Todo-en-Uno
```bash
# Permitir tráfico web público
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw --force enable
```

---

## 🏭 Despliegue en Producción

### Preparación Local

1. **Construir Frontend**
```bash
cd frontend
npm install
npm run build
```

2. **Preparar Backend**
```bash
npm install --production
```

3. **Configurar Variables de Entorno**
```bash
# Crear .env.production
cp .env.example .env.production
# Editar con valores de producción
```

### Subida al Servidor

```bash
# Comprimir archivos
tar -czf tractoreando-prod.tar.gz --exclude=node_modules --exclude=.git .

# Subir al servidor
scp tractoreando-prod.tar.gz usuario@servidor:/opt/

# En el servidor
cd /opt
tar -xzf tractoreando-prod.tar.gz
mv tractoreando-prod tractoreando
```

### Configuración en el Servidor

1. **Instalar Dependencias**
```bash
cd /opt/tractoreando
npm install --production
```

2. **Configurar MongoDB**
```bash
# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Crear usuario (opcional)
mongo
> use tractoreando_prod
> db.createUser({
    user: "tractoreando_user",
    pwd: "password_seguro",
    roles: [{ role: "readWrite", db: "tractoreando_prod" }]
  })
```

3. **Configurar PM2**
```bash
# Crear configuración PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'tractoreando',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Crear directorio de logs
mkdir -p logs

# Iniciar aplicación
pm2 start ecosystem.config.js --env production
pm2 startup
pm2 save
```

4. **Configurar SSL (si aplica)**
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com

# Verificar renovación automática
sudo certbot renew --dry-run
```

### Verificación del Despliegue

```bash
# Verificar servicios
pm2 status
sudo systemctl status nginx mongod

# Verificar conectividad
curl http://localhost:5000/api/health
curl http://localhost/health
curl https://tu-dominio.com/health

# Verificar puertos
netstat -tlnp | grep -E ':(80|443|5000|27017)'
```

---

## 🔧 Solución de Problemas

### Problemas Comunes

#### 1. Error: "Network Error" en Frontend

**Síntomas:**
- Frontend no puede conectarse a la API
- Errores CORS en consola del navegador
- Requests fallan con "Network Error"

**Diagnóstico:**
```bash
# Verificar configuración de frontend
cat frontend/.env.production

# Verificar backend
curl http://localhost:5000/api/health

# Verificar CORS
curl -H "Origin: https://tu-dominio.com" http://localhost:5000/api/health
```

**Solución:**
```bash
# 1. Verificar variables de entorno
vim .env
# Asegurar:
CORS_ORIGIN=https://tu-dominio.com
BACKEND_URL=https://tu-dominio.com/api

# 2. Verificar frontend
vim frontend/.env.production
# Asegurar:
REACT_APP_API_URL=https://tu-dominio.com/api

# 3. Reconstruir y reiniciar
cd frontend && npm run build && cd ..
pm2 restart tractoreando
```

#### 2. Error: "502 Bad Gateway"

**Síntomas:**
- Nginx devuelve error 502
- Backend no responde

**Diagnóstico:**
```bash
# Verificar estado del backend
pm2 status
pm2 logs tractoreando

# Verificar puerto
lsof -i:5000

# Verificar logs de Nginx
sudo tail -f /var/log/nginx/error.log
```

**Solución:**
```bash
# 1. Reiniciar backend
pm2 restart tractoreando

# 2. Verificar configuración de Nginx
sudo nginx -t
sudo systemctl reload nginx

# 3. Verificar conectividad
curl http://localhost:5000/api/health
```

#### 3. Problemas de MongoDB

**Síntomas:**
- Error de conexión a base de datos
- "MongoNetworkError" en logs

**Diagnóstico:**
```bash
# Verificar estado de MongoDB
sudo systemctl status mongod

# Verificar conectividad
mongo --eval "db.adminCommand('ismaster')"

# Verificar logs
sudo tail -f /var/log/mongodb/mongod.log
```

**Solución:**
```bash
# 1. Reiniciar MongoDB
sudo systemctl restart mongod

# 2. Verificar configuración
vim .env
# Verificar MONGODB_URI

# 3. Test de conexión
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando_prod').then(() => console.log('✅ MongoDB OK')).catch(err => console.log('❌ MongoDB Error:', err.message));"
```

#### 4. Problemas de Login

**Síntomas:**
- No se puede hacer login
- JWT errors
- Sesión no persiste

**Diagnóstico:**
```bash
# Verificar JWT_SECRET
grep JWT_SECRET .env

# Verificar logs de autenticación
pm2 logs tractoreando | grep -i auth
```

**Solución:**
```bash
# 1. Generar nuevo JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 2. Actualizar .env
vim .env
# Agregar: JWT_SECRET=nuevo_secret_generado

# 3. Reiniciar aplicación
pm2 restart tractoreando
```

### Scripts de Diagnóstico Automático

Use los scripts consolidados para diagnóstico rápido:

```bash
# Diagnóstico integral del sistema
./diagnostico-integral.sh

# Solución automática de problemas de MongoDB
./fix-mongodb-comprehensive.sh

# Gestión de producción
./gestion-produccion.sh --status
```

---

## 🔧 Mantenimiento

### Tareas de Mantenimiento Regular

Use el script de mantenimiento integral:

```bash
# Mantenimiento completo
./mantenimiento-integral.sh --full

# Mantenimiento rápido
./mantenimiento-integral.sh --quick

# Solo backup
./mantenimiento-integral.sh --backup

# Solo limpieza
./mantenimiento-integral.sh --cleanup
```

### Backups

#### Backup Automático
```bash
# Configurar cron para backup diario
crontab -e
# Agregar:
0 2 * * * /opt/tractoreando/mantenimiento-integral.sh --backup
```

#### Backup Manual
```bash
# Backup de base de datos
mongodump --db tractoreando_prod --out /opt/backups/$(date +%Y%m%d)

# Backup de archivos
tar -czf /opt/backups/tractoreando-$(date +%Y%m%d).tar.gz /opt/tractoreando
```

### Actualizaciones

```bash
# Actualización automática
./gestion-produccion.sh --update

# Actualización manual
cd /opt/tractoreando
git pull origin main
npm install --production
cd frontend && npm install && npm run build && cd ..
pm2 restart tractoreando
```

### Limpieza del Sistema

```bash
# Limpiar logs antiguos
find /opt/tractoreando/logs -name "*.log" -mtime +30 -delete

# Limpiar archivos temporales
npm cache clean --force

# Limpiar backups antiguos
find /opt/backups -name "*.tar.gz" -mtime +90 -delete
```

---

## 📊 Monitoreo

### Monitoreo de Aplicación

```bash
# Estado de PM2
pm2 status
pm2 monit

# Logs en tiempo real
pm2 logs tractoreando --lines 50

# Métricas de rendimiento
pm2 show tractoreando
```

### Monitoreo del Sistema

```bash
# Uso de recursos
htop
iotop
nethogs

# Espacio en disco
df -h

# Memoria
free -h

# Procesos
ps aux | grep -E '(node|nginx|mongod)'
```

### Monitoreo de Red

```bash
# Puertos en uso
netstat -tlnp | grep -E ':(80|443|5000|27017)'

# Conexiones activas
ss -tuln

# Tráfico de red
iftop
```

### Health Checks

```bash
# Health check de la aplicación
curl http://localhost:5000/api/health

# Health check público
curl https://tu-dominio.com/api/health

# Verificación completa
./diagnostico-integral.sh --health
```

### Alertas y Notificaciones

#### Configurar Monitoreo con PM2
```bash
# Instalar PM2 Plus (opcional)
pm2 install pm2-server-monit

# Configurar alertas por email
pm2 set pm2:autodump true
pm2 set pm2:watch true
```

#### Script de Monitoreo Personalizado
```bash
#!/bin/bash
# /opt/tractoreando/monitor.sh

# Verificar servicios críticos
if ! pm2 list | grep -q "online"; then
    echo "ALERTA: Aplicación no está corriendo" | mail -s "Tractoreando Down" admin@empresa.com
fi

if ! systemctl is-active --quiet mongod; then
    echo "ALERTA: MongoDB no está corriendo" | mail -s "MongoDB Down" admin@empresa.com
fi

# Verificar espacio en disco
USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $USAGE -gt 80 ]; then
    echo "ALERTA: Espacio en disco al $USAGE%" | mail -s "Disk Space Warning" admin@empresa.com
fi
```

---

## 📞 Soporte y Recursos Adicionales

### Comandos de Emergencia

```bash
# Reiniciar todos los servicios
sudo systemctl restart mongod nginx
pm2 restart all

# Verificación rápida del sistema
./diagnostico-integral.sh --quick

# Restaurar desde backup
./gestion-produccion.sh --restore /path/to/backup
```

### Archivos de Configuración Importantes

- `/opt/tractoreando/.env` - Variables de entorno principales
- `/opt/tractoreando/ecosystem.config.js` - Configuración PM2
- `/etc/nginx/sites-available/tractoreando` - Configuración Nginx
- `/opt/tractoreando/frontend/.env.production` - Variables del frontend

### Scripts Disponibles

- `instalacion-completa.sh` - Instalación completa del sistema
- `diagnostico-integral.sh` - Diagnóstico completo del sistema
- `fix-mongodb-comprehensive.sh` - Solución de problemas de MongoDB
- `gestion-produccion.sh` - Gestión de producción
- `mantenimiento-integral.sh` - Mantenimiento del sistema
- `utilidades-tractoreando.sh` - Utilidades varias

### Lista de Verificación Final

- [ ] ✅ Sistema operativo actualizado
- [ ] ✅ Node.js v18+ instalado
- [ ] ✅ MongoDB corriendo y accesible
- [ ] ✅ Nginx configurado correctamente
- [ ] ✅ PM2 gestionando la aplicación
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Frontend construido para producción
- [ ] ✅ SSL/HTTPS configurado (si aplica)
- [ ] ✅ Firewall configurado
- [ ] ✅ Backups programados
- [ ] ✅ Monitoreo activo
- [ ] ✅ Health checks funcionando

---

**¡Documentación completada!** 🎉

Esta guía consolida toda la información necesaria para instalar, configurar, desplegar y mantener el sistema Tractoreando en producción.