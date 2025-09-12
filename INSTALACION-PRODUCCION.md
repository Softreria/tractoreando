# 🚀 Instalación en Producción - Tractoreando

## Instalación Automática (Recomendada)

### Opción 1: Script de Instalación
```bash
# Ejecutar el script de instalación automática
./install-production.sh
```

### Opción 2: NPM Script
```bash
# Usar el comando npm
npm run install:production
# o
npm run deploy:production
```

## Requisitos Previos

- **Node.js** 16+ 
- **PostgreSQL** 12+
- **npm** (incluido con Node.js)
- **PM2** (se instala automáticamente)

## Configuración Manual (Si es necesario)

### 1. Variables de Entorno
Edita el archivo `.env.production` y configura:

```bash
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tractoreando_prod
DB_USER=tu_usuario
DB_PASS=tu_contraseña

# SMTP (Opcional - para notificaciones por email)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password
EMAIL_FROM=tu_email@gmail.com
```

### 2. Instalación Manual
```bash
# 1. Instalar dependencias
npm install --production
cd frontend && npm install && npm run build && cd ..

# 2. Configurar base de datos
node sync-models.js
node create-admin.js

# 3. Iniciar con PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## Verificación

Después de la instalación:

- **Backend**: http://localhost:8000
- **Admin por defecto**: admin@tractoreando.com / Admin123!
- **Estado**: `pm2 status`
- **Logs**: `pm2 logs`

## Comandos Útiles

```bash
# Ver estado de la aplicación
pm2 status

# Ver logs en tiempo real
pm2 logs tractoreando-backend

# Reiniciar aplicación
pm2 restart tractoreando-backend

# Detener aplicación
pm2 stop tractoreando-backend

# Eliminar de PM2
pm2 delete tractoreando-backend
```

## Configuración del Servidor Web

### Nginx (Recomendado)
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    
    # Frontend estático
    location / {
        root /ruta/al/proyecto/frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    # API Backend
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Próximos Pasos

1. ✅ Configura tu servidor web (Nginx/Apache)
2. ✅ Configura SSL/HTTPS con Let's Encrypt
3. ✅ Configura SMTP para notificaciones
4. ✅ Cambia la contraseña del administrador
5. ✅ Configura backups automáticos
6. ✅ Configura monitoreo

## Soporte

Para problemas durante la instalación:
- Revisa los logs: `pm2 logs`
- Verifica la configuración de base de datos
- Asegúrate de que PostgreSQL esté ejecutándose
- Verifica los puertos disponibles (8000 para backend)

---

**¡Tractoreando está listo para producción! 🎉**