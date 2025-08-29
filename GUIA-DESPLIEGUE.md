# 🚀 Guía de Despliegue - Tractoreando

## 📋 Resumen

Guía completa para desplegar Tractoreando en producción con PostgreSQL.

## 🔄 Migración de MongoDB a PostgreSQL

### 1. Instalación de PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb

# Iniciar servicio
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Configuración de Base de Datos

```bash
# Crear base de datos y usuario
sudo -u postgres psql
CREATE DATABASE tractoreando_prod;
CREATE USER tractoreando_user WITH ENCRYPTED PASSWORD 'SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE tractoreando_prod TO tractoreando_user;
ALTER USER tractoreando_user CREATEDB;
\q
```

### 3. Variables de Entorno

```bash
# Configurar .env.production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tractoreando_prod
DB_USER=tractoreando_user
DB_PASSWORD=SECURE_PASSWORD
DB_DIALECT=postgres

JWT_SECRET=your_secure_jwt_secret_here
SESSION_SECRET=your_secure_session_secret_here
NODE_ENV=production
PORT=8000
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=warn
```

## 🚀 Despliegue Automático

```bash
# Instalación completa
./install.sh

# O paso a paso:
git clone <repository>
cd tractoreando
npm install
cd frontend && npm install && cd ..
cp .env.production .env
# Editar .env con configuraciones
npx sequelize-cli db:migrate --env production
node init-admin.js
cd frontend && npm run build:prod && cd ..
pm2 start ecosystem.config.js --env production
```

## 🔄 Actualización en Producción

```bash
# Actualización automática
./update-production.sh

# O usar npm script
npm run update:production
```

## 🌐 Configuración Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Frontend
    location / {
        root /path/to/tractoreando/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Cache headers
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

## 📊 Monitoreo

### Comandos Útiles

```bash
# Estado de la aplicación
pm2 status
pm2 logs tractoreando-backend

# Estado de servicios
sudo systemctl status postgresql nginx

# Health check
curl http://localhost:8000/api/health

# Uso de recursos
pm2 monit
```

### Backup Automático

```bash
# Crear script de backup
cat > /opt/tractoreando/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/opt/tractoreando/backups"
mkdir -p $BACKUP_DIR
pg_dump -h localhost -U tractoreando_user tractoreando_prod > $BACKUP_DIR/backup_$DATE.sql
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
EOF

chmod +x /opt/tractoreando/backup.sh

# Agregar a crontab
echo "0 2 * * * /opt/tractoreando/backup.sh" | crontab -
```

## 🚨 Solución de Problemas

### Error de Conexión PostgreSQL
```bash
sudo systemctl status postgresql
sudo systemctl restart postgresql
sudo -u postgres psql -c "SELECT version();"
```

### Error 502 Bad Gateway
```bash
pm2 restart tractoreando-backend
sudo systemctl restart nginx
nginx -t  # Verificar configuración
```

### Problemas de Rendimiento
```bash
# Verificar recursos
pm2 monit
htop
df -h

# Optimizar PostgreSQL
sudo -u postgres psql tractoreando_prod -c "VACUUM ANALYZE;"
```

### Restaurar desde Backup
```bash
# Detener aplicación
pm2 stop tractoreando-backend

# Restaurar base de datos
pg_dump -h localhost -U tractoreando_user tractoreando_prod > backup_current.sql
dropdb -h localhost -U tractoreando_user tractoreando_prod
createdb -h localhost -U tractoreando_user tractoreando_prod
psql -h localhost -U tractoreando_user tractoreando_prod < backup_YYYYMMDD_HHMMSS.sql

# Reiniciar aplicación
pm2 start tractoreando-backend
```

## ✅ Lista de Verificación

### Pre-despliegue
- [ ] PostgreSQL instalado y configurado
- [ ] Variables de entorno configuradas
- [ ] Certificados SSL configurados
- [ ] Backup de datos existentes

### Durante el despliegue
- [ ] Dependencias instaladas
- [ ] Migraciones ejecutadas
- [ ] Frontend construido
- [ ] PM2 configurado
- [ ] Nginx configurado

### Post-despliegue
- [ ] Health check exitoso
- [ ] Usuario admin creado
- [ ] Logs sin errores
- [ ] Backup automático configurado
- [ ] Monitoreo activo

## 🔐 Seguridad

### Variables Críticas
- `JWT_SECRET`: Clave secreta única
- `SESSION_SECRET`: Clave de sesión única
- `DB_PASSWORD`: Contraseña segura de base de datos

### Configuración de Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### SSL/TLS
- Usar certificados válidos (Let's Encrypt recomendado)
- Configurar HSTS headers
- Deshabilitar protocolos inseguros

---

**Para soporte técnico, consulte la documentación completa o contacte al equipo de desarrollo.**