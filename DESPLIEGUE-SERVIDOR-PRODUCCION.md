# Guía de Despliegue en Servidor de Producción

## Información del Servidor
- **URL**: https://tractoreando.softreria.com
- **Puerto Backend**: 5001 (para evitar conflicto con AirPlay en puerto 5000)
- **Dominio**: tractoreando.softreria.com

## Pasos para Desplegar en el Servidor de Producción

### 1. Preparar Archivos Localmente

```bash
# Construir el frontend
cd frontend
npm install
npm run build
cd ..

# Instalar dependencias del backend
npm install
```

### 2. Subir Archivos al Servidor

```bash
# Comprimir el proyecto (excluyendo node_modules)
tar -czf tractoreando-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='frontend/node_modules' \
  .

# Subir al servidor (reemplaza con tu método de subida)
scp tractoreando-deploy.tar.gz usuario@tractoreando.softreria.com:/opt/
```

### 3. Configurar en el Servidor de Producción

```bash
# Conectar al servidor
ssh usuario@tractoreando.softreria.com

# Ir al directorio de la aplicación
cd /opt

# Extraer archivos
tar -xzf tractoreando-deploy.tar.gz
cd tractoreando

# Instalar dependencias
npm install --production

# Copiar archivo de configuración
cp .env.production .env
```

### 4. Configurar Nginx en el Servidor

```bash
# Copiar configuración de Nginx
sudo cp nginx-production.conf /etc/nginx/sites-available/tractoreando
sudo ln -sf /etc/nginx/sites-available/tractoreando /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

### 5. Configurar SSL (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d tractoreando.softreria.com
```

### 6. Configurar MongoDB en el Servidor

```bash
# Instalar MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Crear base de datos y usuario
mongo
> use tractoreando_prod
> db.createUser({
    user: "tractoreando_user",
    pwd: "tu_password_seguro_aqui",
    roles: [{ role: "readWrite", db: "tractoreando_prod" }]
  })
> exit
```

### 7. Configurar PM2 para Gestión de Procesos

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar aplicación con PM2
pm2 start ecosystem.config.js --env production

# Configurar PM2 para inicio automático
pm2 startup
pm2 save
```

### 8. Verificar Despliegue

```bash
# Verificar que el servidor esté ejecutándose
pm2 status

# Verificar logs
pm2 logs

# Probar endpoint de salud
curl https://tractoreando.softreria.com/api/health

# Verificar que el frontend cargue
curl -I https://tractoreando.softreria.com
```

## Configuración de Firewall

```bash
# Configurar UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

## Monitoreo y Logs

```bash
# Ver logs de la aplicación
pm2 logs tractoreando

# Ver logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Ver logs de MongoDB
sudo tail -f /var/log/mongodb/mongod.log
```

## Solución de Problemas Comunes

### Error EADDRINUSE en puerto 5000
- **Causa**: macOS usa puerto 5000 para AirPlay
- **Solución**: Configurado para usar puerto 5001

### Error de archivos estáticos
- **Causa**: Frontend no construido
- **Solución**: Ejecutar `npm run build` en directorio frontend

### Error de conexión a MongoDB
- **Causa**: MongoDB no iniciado o configuración incorrecta
- **Solución**: Verificar servicio MongoDB y configuración en .env

### Error de CORS
- **Causa**: Configuración incorrecta de dominios
- **Solución**: Verificar CORS_ORIGIN en .env.production

## Comandos Útiles para el Servidor

```bash
# Reiniciar aplicación
pm2 restart tractoreando

# Actualizar aplicación
git pull origin main
npm install --production
cd frontend && npm run build && cd ..
pm2 restart tractoreando

# Backup de base de datos
mongodump --db tractoreando_prod --out /opt/backups/$(date +%Y%m%d)

# Restaurar base de datos
mongorestore --db tractoreando_prod /opt/backups/20240825/tractoreando_prod
```

## Archivos de Configuración Importantes

- `.env.production` - Variables de entorno para producción
- `frontend/.env.production` - Variables del frontend
- `nginx-production.conf` - Configuración de Nginx
- `ecosystem.config.js` - Configuración de PM2

## Contacto y Soporte

Para problemas de despliegue, verificar:
1. Logs de PM2: `pm2 logs`
2. Logs de Nginx: `/var/log/nginx/error.log`
3. Estado de servicios: `systemctl status mongod nginx`
4. Conectividad de red: `netstat -tlnp | grep :5001`