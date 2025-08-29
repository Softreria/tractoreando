# 🚛 Tractoreando - Guía Completa del Sistema

## 📖 Descripción General

Tractoreando es un sistema integral de gestión para empresas de transporte y logística optimizado con estructura de datos simplificada para mejor rendimiento.

### ✨ Características Principales

- 🏢 **Multi-empresa**: Gestión de múltiples empresas desde una sola instalación
- 🚛 **Gestión de Vehículos**: Control completo del parque vehicular con diferenciación por tipos
- 🚗 **Tipos de Vehículos**: Soporte para automóviles, motocicletas, tractores, aperos agrícolas y más
- 🔐 **Control de Acceso por Tipo**: Los usuarios solo ven vehículos de tipos autorizados
- 🔧 **Mantenimiento**: Programación y seguimiento de mantenimientos
- 📊 **Reportes**: Informes detallados y análisis de datos
- 👥 **Gestión de Usuarios**: Control de acceso y permisos granulares
- ⚡ **Modelo Optimizado**: Estructura simplificada para mejor rendimiento

### 🛠️ Tecnologías

- **Backend**: Node.js, Express.js, MongoDB
- **Frontend**: React, Material-UI
- **Gestión de Procesos**: PM2
- **Servidor Web**: Nginx

---

## 🚀 Instalación y Configuración

### Instalación Rápida con Script Maestro

```bash
# Hacer ejecutable el script maestro
chmod +x tractoreando-manager.sh

# Instalación rápida para desarrollo
./tractoreando-manager.sh install --quick

# Instalación para producción
./tractoreando-manager.sh install --production

# Instalación servidor independiente
./tractoreando-manager.sh install --standalone
```

### Requisitos del Sistema

#### Mínimos
- **CPU**: 2 cores
- **RAM**: 4GB
- **Almacenamiento**: 20GB SSD
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Node.js**: v18.x o superior
- **MongoDB**: v6.0 o superior

#### Recomendados
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Almacenamiento**: 50GB+ SSD
- **Conexión**: 100Mbps+

### Configuración Manual

#### 1. Dependencias del Sistema

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm mongodb nginx pm2

# CentOS/RHEL
sudo yum install -y nodejs npm mongodb-server nginx
sudo npm install -g pm2
```

#### 2. Configuración de la Base de Datos

```bash
# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Crear usuario administrador
node init-admin.js
```

#### 3. Variables de Entorno

```bash
# Copiar archivo de ejemplo
# El archivo .env ya está preconfigurado con valores por defecto
# Editar .env según tu entorno (desarrollo/producción)

# Editar configuración
nano .env
```

**Variables principales:**
```env
MONGODB_URI=mongodb://localhost:27017/tractoreando
JWT_SECRET=tu_jwt_secret_muy_seguro
PORT=8000
NODE_ENV=production
```

---

## 🔧 Deployment y Gestión

### Comandos del Script Maestro

```bash
# Ver estado del sistema
./tractoreando-manager.sh status

# Deployment completo
./tractoreando-manager.sh deploy --full

# Solo build del frontend
./tractoreando-manager.sh deploy --build

# Diagnóstico completo
./tractoreando-manager.sh diagnose --full

# Diagnóstico específico de errores 502
./tractoreando-manager.sh diagnose --502

# Crear backup
./tractoreando-manager.sh maintain --backup

# Limpiar sistema
./tractoreando-manager.sh maintain --cleanup

# Ver logs
./tractoreando-manager.sh logs --backend
./tractoreando-manager.sh logs --nginx

# Reiniciar servicios
./tractoreando-manager.sh restart --all
./tractoreando-manager.sh restart --backend
```

### Arquitectura de Producción

```
[Cliente] → [Nginx:8080] → [Backend Node.js:8000] → [MongoDB]
                ↓
         [Frontend React Build]
```

### Configuración de Nginx

**Archivo**: `/etc/nginx/sites-available/tractoreando`

```nginx
server {
    listen 8080;
    server_name _;
    
    # Frontend estático
    location / {
        root /opt/tractoreando/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Cache para archivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API Backend
    location /api/ {
        proxy_pass http://localhost:8000;
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

### Configuración de PM2

**Archivo**: `ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'tractoreando-backend',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

---

## 🔍 Diagnóstico y Solución de Problemas

### Problemas Comunes

#### Error 502 Bad Gateway

```bash
# Diagnóstico automático
./tractoreando-manager.sh diagnose --502

# Verificación manual
sudo systemctl status nginx
pm2 status
netstat -tlnp | grep :8000
```

**Soluciones:**
1. Verificar que el backend esté ejecutándose en el puerto correcto
2. Comprobar configuración de proxy en Nginx
3. Revisar logs de PM2 y Nginx

#### Problemas de Conexión a MongoDB

```bash
# Verificar estado de MongoDB
sudo systemctl status mongod

# Probar conexión
mongo --eval "db.adminCommand('ismaster')"

# Verificar desde la aplicación
./tractoreando-manager.sh diagnose --mongodb
```

#### Problemas de Permisos

```bash
# Corregir permisos de archivos
sudo chown -R tractoreando:tractoreando /opt/tractoreando
sudo chmod -R 755 /opt/tractoreando

# Permisos específicos para logs
sudo mkdir -p /opt/tractoreando/logs
sudo chown tractoreando:tractoreando /opt/tractoreando/logs
```

### Logs Importantes

```bash
# Logs de la aplicación
tail -f /opt/tractoreando/logs/combined.log

# Logs de Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Logs de MongoDB
sudo tail -f /var/log/mongodb/mongod.log

# Logs del sistema
sudo journalctl -u nginx -f
sudo journalctl -u mongod -f
```

---

## 🔧 Mantenimiento

### Backups Automáticos

```bash
# Crear backup manual
./tractoreando-manager.sh maintain --backup

# Configurar backup automático (crontab)
0 2 * * * /opt/tractoreando/tractoreando-manager.sh maintain --backup
```

### Actualizaciones

```bash
# Actualizar dependencias
./tractoreando-manager.sh maintain --update

# Proceso manual
git pull origin main
npm install
cd frontend && npm install && npm run build && cd ..
pm2 restart all
```

### Limpieza del Sistema

```bash
# Limpiar archivos temporales y logs antiguos
./tractoreando-manager.sh maintain --cleanup

# Limpiar manualmente
find /opt/tractoreando/logs -name "*.log" -mtime +30 -delete
npm cache clean --force
cd frontend && npm cache clean --force
```

### Monitoreo

```bash
# Estado general
./tractoreando-manager.sh status

# Monitoreo en tiempo real
watch -n 5 './tractoreando-manager.sh status'

# Métricas de PM2
pm2 monit

# Uso de recursos
htop
df -h
free -h
```

---

## 📊 Optimizaciones de Rendimiento

### Base de Datos

```javascript
// Índices recomendados
db.users.createIndex({ email: 1 }, { unique: true })
db.vehicles.createIndex({ company: 1, isActive: 1 })
db.maintenance.createIndex({ vehicle: 1, scheduledDate: 1 })
db.companies.createIndex({ isActive: 1 })
```

### Frontend

```bash
# Build optimizado
cd frontend
NODE_ENV=production npm run build

# Análisis del bundle
npm install -g webpack-bundle-analyzer
npx webpack-bundle-analyzer build/static/js/*.js
```

### Backend

```javascript
// Configuraciones de producción en server.js
app.use(compression());
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL }));
```

---

## 🔐 Seguridad

### Configuración SSL/TLS

```bash
# Certificados Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

### Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp
sudo ufw enable
```

### Variables de Entorno Seguras

```bash
# Generar JWT secret seguro
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Configurar variables sensibles
export JWT_SECRET="tu_jwt_secret_generado"
export MONGODB_URI="mongodb://usuario:password@localhost:27017/tractoreando"
```

---

## 📞 Soporte y Contacto

### Información del Sistema

- **Versión**: 2.0 (Modelo Optimizado)
- **Última actualización**: $(date)
- **Documentación**: Este archivo
- **Script principal**: `tractoreando-manager.sh`

### Comandos de Ayuda

```bash
# Ayuda del script maestro
./tractoreando-manager.sh help

# Verificar versiones
node --version
npm --version
mongod --version
nginx -v
pm2 --version
```

### Estructura de Archivos Importantes

```
tractoreando/
├── tractoreando-manager.sh    # Script maestro de gestión
├── GUIA-COMPLETA.md           # Esta documentación
├── server.js                  # Servidor backend
├── init-admin.js              # Inicialización de admin
├── ecosystem.config.js        # Configuración PM2
├── frontend/                  # Aplicación React
├── models/                    # Modelos de datos
├── routes/                    # Rutas de API
└── middleware/                # Middleware personalizado
```

---

*Esta guía consolida toda la información necesaria para instalar, configurar, mantener y solucionar problemas del sistema Tractoreando optimizado.*