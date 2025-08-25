# Comandos para Ejecutar Directamente en el Servidor de Producción

## Información del Servidor
- **Dominio**: tractoreando.softreria.com
- **Puerto Backend**: 5001
- **Directorio de trabajo**: `/opt/tractoreando` (o el que uses)

---

## 1. Actualizar Código en el Servidor

```bash
# Ir al directorio del proyecto
cd /opt/tractoreando

# Hacer backup del estado actual
cp -r . ../tractoreando-backup-$(date +%Y%m%d-%H%M%S)

# Actualizar código desde repositorio
git pull origin main

# O si subes archivos manualmente, asegúrate de tener estos archivos:
# - .env.production
# - frontend/.env.production  
# - nginx-production.conf
# - ecosystem.config.js
```

## 2. Configurar Variables de Entorno

```bash
# Crear/actualizar archivo .env.production
cat > .env.production << 'EOF'
NODE_ENV=production
PORT=5001
HOST=0.0.0.0

# URLs base de la aplicación
BASE_URL=https://tractoreando.softreria.com
FRONTEND_URL=https://tractoreando.softreria.com
BACKEND_URL=https://tractoreando.softreria.com/api

# Base de datos
MONGODB_URI=mongodb://localhost:27017/tractoreando_prod

# Autenticación
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12

# CORS
CORS_ORIGIN=https://tractoreando.softreria.com
CORS_CREDENTIALS=true

# Configuración para proxy reverso
TRUST_PROXY=true
EOF

# Copiar como .env principal
cp .env.production .env

# Configurar frontend
cat > frontend/.env.production << 'EOF'
REACT_APP_API_URL=https://tractoreando.softreria.com/api
REACT_APP_ENV=production
GENERATE_SOURCEMAP=false
EOF
```

## 3. Instalar Dependencias y Construir

```bash
# Instalar dependencias del backend
npm install --production

# Ir al frontend e instalar dependencias
cd frontend
npm install

# Construir frontend para producción
npm run build

# Volver al directorio raíz
cd ..
```

## 4. Configurar Nginx

```bash
# Crear configuración de Nginx
sudo tee /etc/nginx/sites-available/tractoreando << 'EOF'
server {
    listen 80;
    server_name tractoreando.softreria.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tractoreando.softreria.com;

    # Configuración SSL (se configurará con certbot)
    ssl_certificate /etc/letsencrypt/live/tractoreando.softreria.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tractoreando.softreria.com/privkey.pem;
    
    # Configuración SSL moderna
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Servir archivos estáticos del frontend
    location / {
        root /opt/tractoreando/frontend/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # Headers de seguridad
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    }
    
    # Proxy para la API del backend
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Configuración de timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Headers CORS
        add_header 'Access-Control-Allow-Origin' 'https://tractoreando.softreria.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        # Manejar preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://tractoreando.softreria.com';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
    
    # Configuración de compresión
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
    
    # Configuración de caché para archivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Habilitar el sitio
sudo ln -sf /etc/nginx/sites-available/tractoreando /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t
```

## 5. Configurar SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d tractoreando.softreria.com

# Verificar renovación automática
sudo certbot renew --dry-run
```

## 6. Configurar MongoDB

```bash
# Verificar que MongoDB esté ejecutándose
sudo systemctl status mongod

# Si no está instalado, instalar MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Iniciar y habilitar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Crear base de datos y usuario (opcional, para mayor seguridad)
mongo
> use tractoreando_prod
> db.createUser({
    user: "tractoreando_user",
    pwd: "tu_password_seguro_aqui",
    roles: [{ role: "readWrite", db: "tractoreando_prod" }]
  })
> exit
```

## 7. Configurar PM2 para Gestión de Procesos

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Crear archivo de configuración PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'tractoreando',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 5001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5001
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

# Detener cualquier proceso anterior
pm2 delete tractoreando 2>/dev/null || true

# Iniciar aplicación con PM2
pm2 start ecosystem.config.js --env production

# Configurar PM2 para inicio automático
pm2 startup
pm2 save
```

## 8. Configurar Firewall

```bash
# Configurar UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

## 9. Verificar Despliegue

```bash
# Verificar que PM2 esté ejecutando la aplicación
pm2 status
pm2 logs tractoreando --lines 50

# Verificar que Nginx esté funcionando
sudo systemctl status nginx

# Probar endpoint de salud
curl -k https://tractoreando.softreria.com/api/health

# Verificar que el frontend cargue
curl -I https://tractoreando.softreria.com

# Verificar puertos
netstat -tlnp | grep :5001
netstat -tlnp | grep :443
```

## 10. Comandos de Mantenimiento

```bash
# Reiniciar aplicación
pm2 restart tractoreando

# Ver logs en tiempo real
pm2 logs tractoreando

# Recargar Nginx
sudo systemctl reload nginx

# Backup de base de datos
mongodump --db tractoreando_prod --out /opt/backups/$(date +%Y%m%d)

# Verificar espacio en disco
df -h

# Verificar memoria
free -h

# Verificar procesos
top
```

## Solución de Problemas

### Si el puerto 5001 está ocupado:
```bash
# Ver qué proceso usa el puerto
lsof -i:5001

# Cambiar a otro puerto (ej: 5002)
# Editar .env.production y ecosystem.config.js
# Actualizar nginx-production.conf
```

### Si hay errores de permisos:
```bash
# Cambiar propietario de archivos
sudo chown -R $USER:$USER /opt/tractoreando

# Dar permisos de ejecución
chmod +x /opt/tractoreando/server.js
```

### Si MongoDB no conecta:
```bash
# Verificar estado
sudo systemctl status mongod

# Ver logs
sudo tail -f /var/log/mongodb/mongod.log

# Reiniciar MongoDB
sudo systemctl restart mongod
```

---

**Nota**: Ejecuta estos comandos paso a paso y verifica que cada uno funcione antes de continuar con el siguiente.