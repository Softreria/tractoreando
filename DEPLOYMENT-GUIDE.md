# Guía de Deployment en Producción - Tractoreando

## Resumen

Esta guía documenta el proceso completo de deployment de la aplicación Tractoreando en un entorno de producción utilizando PM2 para la gestión de procesos y Nginx como servidor web y proxy reverso.

## Arquitectura de Producción

```
[Cliente] → [Nginx:8080] → [Backend Node.js:3002] → [MongoDB]
                ↓
         [Frontend React Build]
```

## Componentes Configurados

### 1. Variables de Entorno
- **Frontend**: `.env.production` con configuración para producción
- **Backend**: Variables de entorno para MongoDB y configuración del servidor

### 2. PM2 (Process Manager)
- **Archivo de configuración**: `ecosystem.config.js`
- **Aplicación**: `tractoreando-backend`
- **Puerto**: 3002
- **Modo**: Fork
- **Reinicio automático**: Habilitado

### 3. Nginx
- **Archivo de configuración**: `nginx-production.conf`
- **Puerto**: 8080
- **Funciones**:
  - Servidor de archivos estáticos (React build)
  - Proxy reverso para API (/api/*)
  - Configuración CORS
  - Headers de seguridad
  - Compresión gzip
  - Cache de archivos estáticos

## Proceso de Deployment

### Script Automatizado

Utiliza el script `deploy-production.sh` que automatiza todo el proceso:

```bash
./deploy-production.sh
```

### Pasos del Deployment

1. **Verificación del Sistema**
   - Node.js (v14+)
   - npm
   - PM2
   - MongoDB

2. **Backup de Base de Datos**
   - Crea backup automático en `/backups/`
   - Formato: `tractoreando_backup_YYYYMMDD_HHMMSS.gz`

3. **Instalación de Dependencias Backend**
   ```bash
   npm install --production
   ```

4. **Build del Frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

5. **Configuración de Directorios**
   - Crea directorios necesarios
   - Configura permisos apropiados

6. **Gestión de Procesos PM2**
   ```bash
   pm2 stop tractoreando-backend
   pm2 delete tractoreando-backend
   pm2 start ecosystem.config.js --env production
   ```

7. **Verificación**
   - Estado de PM2
   - Puerto 3002 activo
   - Logs de aplicación

## Configuración de Nginx

### Instalación y Configuración

1. **Crear directorios de logs**:
   ```bash
   sudo mkdir -p /opt/homebrew/var/log/nginx
   ```

2. **Configurar permisos**:
   ```bash
   sudo chmod 755 /Users/davidhernandezlujan
   sudo chmod 755 /Users/davidhernandezlujan/Documents
   sudo chmod 755 /Users/davidhernandezlujan/Documents/tractoreando
   sudo chmod -R 755 /Users/davidhernandezlujan/Documents/tractoreando/frontend/build
   ```

3. **Validar configuración**:
   ```bash
   nginx -t -c /Users/davidhernandezlujan/Documents/tractoreando/nginx-production.conf
   ```

4. **Iniciar Nginx**:
   ```bash
   sudo nginx -c /Users/davidhernandezlujan/Documents/tractoreando/nginx-production.conf
   ```

### Características de la Configuración

- **Puerto**: 8080
- **Root**: `/Users/davidhernandezlujan/Documents/tractoreando/frontend/build`
- **Proxy API**: `/api/*` → `http://localhost:3002`
- **CORS**: Configurado para `http://localhost:8080`
- **Compresión**: Habilitada para archivos estáticos
- **Cache**: 1 año para archivos estáticos
- **Seguridad**: Headers de seguridad configurados

## Comandos de Gestión

### PM2
```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs tractoreando-backend

# Reiniciar aplicación
pm2 restart tractoreando-backend

# Parar aplicación
pm2 stop tractoreando-backend

# Monitoreo
pm2 monit
```

### Nginx
```bash
# Verificar configuración
nginx -t -c /path/to/nginx-production.conf

# Recargar configuración
sudo nginx -s reload

# Parar Nginx
sudo nginx -s stop

# Ver logs
tail -f /opt/homebrew/var/log/nginx/tractoreando_access.log
tail -f /opt/homebrew/var/log/nginx/tractoreando_error.log
```

### MongoDB
```bash
# Verificar estado
brew services list | grep mongodb

# Iniciar MongoDB
brew services start mongodb-community

# Parar MongoDB
brew services stop mongodb-community
```

## URLs de Acceso

- **Aplicación Web**: http://localhost:8080
- **API Backend**: http://localhost:8080/api/
- **Health Check**: http://localhost:8080/api/health
- **Backend Directo**: http://localhost:3002 (solo para debugging)

## Monitoreo y Logs

### Ubicaciones de Logs
- **PM2**: `~/.pm2/logs/`
- **Nginx Access**: `/opt/homebrew/var/log/nginx/tractoreando_access.log`
- **Nginx Error**: `/opt/homebrew/var/log/nginx/tractoreando_error.log`
- **MongoDB**: `/opt/homebrew/var/log/mongodb/`

### Comandos de Monitoreo
```bash
# Monitoreo en tiempo real
pm2 monit

# Logs de aplicación
pm2 logs tractoreando-backend --lines 50

# Logs de Nginx
tail -f /opt/homebrew/var/log/nginx/tractoreando_error.log

# Estado del sistema
ps aux | grep -E '(nginx|node)' | grep -v grep
netstat -an | grep -E '(3002|8080)'
```

## Solución de Problemas

### Problemas Comunes

1. **Error 500 en Nginx**
   - Verificar permisos de archivos
   - Revisar logs de error de Nginx
   - Verificar que el build del frontend existe

2. **API no responde**
   - Verificar estado de PM2: `pm2 status`
   - Revisar logs del backend: `pm2 logs tractoreando-backend`
   - Verificar conexión a MongoDB

3. **Problemas de CORS**
   - Verificar configuración en `nginx-production.conf`
   - Asegurar que las URLs coinciden

4. **Problemas de permisos**
   ```bash
   sudo chmod -R 755 /Users/davidhernandezlujan/Documents/tractoreando/frontend/build
   ```

### Comandos de Diagnóstico
```bash
# Verificar puertos en uso
lsof -i :3002
lsof -i :8080

# Verificar procesos
ps aux | grep nginx
ps aux | grep node

# Verificar conectividad
curl -I http://localhost:8080
curl -I http://localhost:8080/api/health
```

## Próximos Pasos

### Para Producción Real

1. **SSL/HTTPS**
   - Configurar certificados SSL
   - Habilitar redirección HTTP → HTTPS
   - Actualizar CORS para HTTPS

2. **Dominio Personalizado**
   - Configurar DNS
   - Actualizar `server_name` en Nginx
   - Actualizar variables de entorno

3. **Seguridad**
   - Configurar firewall
   - Implementar rate limiting
   - Configurar fail2ban

4. **Monitoreo Avanzado**
   - Implementar logging centralizado
   - Configurar alertas
   - Métricas de rendimiento

5. **Backup Automatizado**
   - Configurar backups programados
   - Implementar rotación de backups
   - Backup remoto

## Mantenimiento

### Tareas Regulares

- **Diario**: Revisar logs de error
- **Semanal**: Verificar espacio en disco y backups
- **Mensual**: Actualizar dependencias y parches de seguridad
- **Trimestral**: Revisar y optimizar configuración

### Actualizaciones

1. **Código de Aplicación**
   ```bash
   git pull origin main
   ./deploy-production.sh
   ```

2. **Dependencias**
   ```bash
   npm audit
   npm update
   ```

3. **Sistema**
   ```bash
   brew update
   brew upgrade
   ```

---

**Fecha de creación**: $(date)
**Versión**: 1.0
**Autor**: Sistema de Deployment Automatizado