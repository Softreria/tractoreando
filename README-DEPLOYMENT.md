# 🚀 Guía de Deployment - Tractoreando

Esta guía te ayudará a desplegar la aplicación Tractoreando en un servidor de producción.

## 📋 Índice

- [Requisitos del Sistema](#requisitos-del-sistema)
- [Instalación Rápida](#instalación-rápida)
- [Scripts Disponibles](#scripts-disponibles)
- [Configuración Manual](#configuración-manual)
- [Actualizaciones](#actualizaciones)
- [Monitoreo](#monitoreo)
- [Optimización para Git](#optimización-para-git)
- [Solución de Problemas](#solución-de-problemas)

## 🖥️ Requisitos del Sistema

### Servidor de Producción
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **RAM**: Mínimo 2GB, recomendado 4GB+
- **Disco**: Mínimo 20GB de espacio libre
- **CPU**: 2 cores mínimo
- **Red**: Conexión a internet estable

### Software Requerido
- Node.js 18+ (se instala automáticamente)
- MongoDB 6.0+ (se instala automáticamente)
- Nginx (se instala automáticamente)
- PM2 (se instala automáticamente)
- Git (se instala automáticamente)

## ⚡ Instalación Rápida

### Opción 1: Script Automático (Recomendado)

```bash
# 1. Clonar el repositorio
git clone <tu-repositorio> tractoreando
cd tractoreando

# 2. Instalar dependencias
npm run install:all

# 3. Ejecutar instalación automática
sudo ./install.sh

# 4. Seguir las instrucciones en pantalla
```

### Opción 2: Servidor Independiente (con Proxy Manager)

```bash
# Para servidores separados del proxy manager
sudo ./install-standalone.sh
```

### Opción 3: Usando npm

```bash
# Desde el directorio del proyecto
npm run deploy:install
```

## 🛠️ Scripts Disponibles

### Scripts de Build

```bash
# Build de producción
npm run build:prod

# Build básico del frontend
npm run build
```

### Scripts de Deployment

```bash
# Instalación inicial del servidor
npm run deploy:install
# o directamente:
./install.sh

# Actualización de la aplicación
npm run deploy:update
# o directamente:
./update.sh
```

### Scripts de Git (Nuevos)

```bash
# Configuración automática de repositorio Git
npm run deploy:setup-git

# Configurar proxy reverso
npm run deploy:configure-proxy

# Test de conectividad local
npm run deploy:network-test
```

### Scripts de Desarrollo

```bash
# Instalar todas las dependencias
npm run install:all

# Limpiar node_modules y builds
npm run clean

# Iniciar servidor de desarrollo
npm run dev

# Iniciar solo el frontend
npm run client

# Iniciar solo el backend
npm run server
```

## 🏗️ Build de Producción

### Build Automático

```bash
# Build de producción optimizado
npm run build:prod

# Build manual del frontend
cd frontend && npm run build
```

### Características del Build

- 🏗️ **Build optimizado** para producción
- 🗜️ **Minificación** automática
- 📦 **Bundling** optimizado
- 🚀 **Archivos estáticos** listos para deploy

## 🔧 Configuración de Proxy

```bash
# Configurar proxy reverso automáticamente
./configure-proxy.sh
```

Este script configura la aplicación para funcionar detrás de un proxy manager externo.

## 📦 Optimización para Git

### Problema de Tamaño
Los `node_modules` pueden ocupar más de 450MB, causando problemas al subir a Git.

### Solución Automática

```bash
# Limpiar proyecto antes de Git
npm run clean:git

# Subir a Git (solo ~5-10MB)
git add .
git commit -m "Tu mensaje"
git push
```

### En el Servidor

```bash
# Clonar y reinstalar automáticamente
git clone <tu-repo>
cd tractoreando
npm run install:all
./install.sh
```

**Resultado**: Los `node_modules` se reinstalan automáticamente en el servidor usando `package.json` y `package-lock.json`.

📖 **Más información**: Ver `GIT-SIZE-OPTIMIZATION.md`



## ⚙️ Configuración Manual

### Variables de Entorno

Edita los archivos de configuración:

```bash
# Backend
cp .env.example .env
nano .env

# Frontend (producción)
nano .env.production
```

### Configuración de Nginx

```bash
# Editar configuración
sudo nano /etc/nginx/sites-available/tractoreando

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

### Configuración de PM2

```bash
# Ver configuración
cat ecosystem.config.js

# Editar configuración
nano ecosystem.config.js

# Aplicar cambios
pm2 reload ecosystem.config.js
```

## 🔄 Actualizaciones

### Actualización Automática

```bash
# Desde repositorio Git
./update.sh --from-git

# Desde directorio local
./update.sh --from-local /ruta/al/codigo

# Con backup automático
./update.sh --backup

# Actualización rápida (sin tests)
./update.sh --quick
```

### Actualización Manual

```bash
# 1. Hacer backup
pm2 stop tractoreando
cp -r /var/www/tractoreando /var/www/tractoreando-backup-$(date +%Y%m%d)

# 2. Actualizar código
cd /var/www/tractoreando
git pull origin main

# 3. Instalar dependencias
npm install
cd frontend && npm install && cd ..

# 4. Build de producción (opcional)
npm run build:prod

# 5. Reiniciar servicios
pm2 restart tractoreando
sudo systemctl reload nginx
```

## 📊 Monitoreo

### PM2 Monitoring

```bash
# Estado de la aplicación
pm2 status

# Logs en tiempo real
pm2 logs tractoreando

# Monitoreo web
pm2 web

# Información detallada
pm2 show tractoreando
```

### Logs del Sistema

```bash
# Logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs de MongoDB
sudo tail -f /var/log/mongodb/mongod.log

# Logs del sistema
sudo journalctl -u nginx -f
sudo journalctl -u mongod -f
```

### Health Checks

```bash
# Verificar servicios
sudo systemctl status nginx
sudo systemctl status mongod
pm2 status

# Verificar puertos
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :27017

# Verificar conectividad
curl -I http://localhost
curl -I http://localhost/api/health
```

## 🔧 Solución de Problemas

### Problemas Comunes

#### 1. Error de permisos
```bash
# Corregir permisos
sudo chown -R tractoreando:tractoreando /var/www/tractoreando
sudo chmod -R 755 /var/www/tractoreando
```

#### 2. Error de MongoDB
```bash
# Reiniciar MongoDB
sudo systemctl restart mongod

# Verificar logs
sudo tail -f /var/log/mongodb/mongod.log
```

#### 3. Error de Nginx
```bash
# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Verificar logs
sudo tail -f /var/log/nginx/error.log
```

#### 4. Error de PM2
```bash
# Reiniciar aplicación
pm2 restart tractoreando

# Verificar logs
pm2 logs tractoreando --lines 50

# Recargar configuración
pm2 reload ecosystem.config.js
```

#### 5. Error de Build
```bash
# Limpiar cache
npm run clean
npm run install:all

# Build con más información
npm run build:prod

# Verificar espacio en disco
df -h
```

### Comandos de Diagnóstico

```bash
# Información del sistema
./install.sh --check-system

# Verificar configuración
./update.sh --verify

# Test de conectividad
curl -f http://localhost/api/health || echo "API no disponible"

# Verificar base de datos
mongo --eval "db.adminCommand('ismaster')"
```

### Restaurar desde Backup

```bash
# Listar backups disponibles
ls -la /var/backups/tractoreando/

# Restaurar aplicación
./update.sh --restore /var/backups/tractoreando/backup-20240101_120000

# Restaurar base de datos
mongorestore --db tractoreando /var/backups/tractoreando/db-20240101_120000
```

## 📞 Soporte

Si encuentras problemas:

1. **Revisa los logs** usando los comandos de monitoreo
2. **Consulta esta guía** para soluciones comunes
3. **Verifica el estado** de todos los servicios
4. **Crea un issue** en el repositorio con:
   - Descripción del problema
   - Logs relevantes
   - Pasos para reproducir
   - Información del sistema

## 📚 Recursos Adicionales

- [Documentación de PM2](https://pm2.keymetrics.io/docs/)
- [Documentación de Nginx](https://nginx.org/en/docs/)
- [Documentación de MongoDB](https://docs.mongodb.com/)
- [Guía de Seguridad de Node.js](https://nodejs.org/en/docs/guides/security/)

---

**¡Tu aplicación Tractoreando está lista para producción! 🚀**