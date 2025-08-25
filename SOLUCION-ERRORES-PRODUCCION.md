# Guía de Solución de Errores de Producción - Tractoreando

## 🚨 Errores Identificados y Soluciones

### 1. Error: "Manifest: Line: 1, column: 1, Syntax error"

**Causa:** El archivo `manifest.json` no existe o tiene errores de sintaxis.

**Solución:**
```bash
# El archivo manifest.json ya ha sido creado en frontend/public/manifest.json
# Verifica que existe y tiene contenido válido
cat frontend/public/manifest.json
```

### 2. Error: "Error de red: Network Error" en api.js

**Causa:** El frontend está intentando conectarse a una URL incorrecta de la API.

**Solución:**
```bash
# 1. Verifica que el archivo .env.production existe en el frontend
ls -la frontend/.env.production

# 2. Asegúrate de que REACT_APP_API_URL apunta al dominio correcto
# Edita frontend/.env.production y cambia:
REACT_APP_API_URL=https://tractoreando.softreria.com/api

# 3. Reconstruye el frontend
cd frontend
npm run build
cd ..
```

### 3. Error: "Failed to load resource: net::ERR_CONNECTION_REFUSED localhost:3001"

**Causa:** El frontend está intentando conectarse al puerto de desarrollo (3001) en lugar del puerto de producción.

**Solución:**
```bash
# 1. Configura correctamente las variables de entorno
# En .env.production (raíz del proyecto):
NODE_ENV=production
PORT=5000

# En frontend/.env.production:
REACT_APP_API_URL=https://tractoreando.softreria.com/api

# 2. Asegúrate de que el servidor backend esté ejecutándose en el puerto correcto
NODE_ENV=production npm start
```

## 🔧 Pasos de Configuración Completa para Producción

### Paso 1: Configurar Variables de Entorno

```bash
# 1. Copia y configura el archivo de entorno principal
cp .env.production /opt/tractoreando/.env

# 2. Edita las variables importantes:
vim /opt/tractoreando/.env
```

Variables críticas a configurar:
```env
# Cambiar por tu dominio real
BASE_URL=https://tractoreando.softreria.com
FRONTEND_URL=https://tractoreando.softreria.com
BACKEND_URL=https://tractoreando.softreria.com/api
CORS_ORIGIN=https://tractoreando.softreria.com

# Cambiar por una clave JWT segura
JWT_SECRET=tu-clave-jwt-super-segura-aqui

# Configurar base de datos
MONGODB_URI=mongodb://127.0.0.1:27017/tractoreando_prod
```

### Paso 2: Configurar Frontend

```bash
# 1. Edita la configuración del frontend
vim frontend/.env.production
```

```env
# Cambiar por tu dominio real
REACT_APP_API_URL=https://tractoreando.softreria.com/api
REACT_APP_ENV=production
GENERATE_SOURCEMAP=false
```

### Paso 3: Construir la Aplicación

```bash
# Ejecuta el script de construcción
./build-production.sh
```

### Paso 4: Configurar Nginx (Recomendado)

```bash
# 1. Copia la configuración de nginx
sudo cp nginx-production.conf /etc/nginx/sites-available/tractoreando

# 2. Edita la configuración con tu dominio real
sudo vim /etc/nginx/sites-available/tractoreando

# 3. Habilita el sitio
sudo ln -s /etc/nginx/sites-available/tractoreando /etc/nginx/sites-enabled/

# 4. Prueba la configuración
sudo nginx -t

# 5. Reinicia nginx
sudo systemctl restart nginx
```

### Paso 5: Iniciar la Aplicación

```bash
# 1. Asegúrate de que MongoDB esté ejecutándose
sudo systemctl start mongod
sudo systemctl enable mongod

# 2. Inicia la aplicación en modo producción
cd /opt/tractoreando
NODE_ENV=production npm start

# O usando PM2 (recomendado)
npm install -g pm2
pm2 start ecosystem.config.js --env production
```

## 🔍 Diagnóstico de Problemas

### Ejecutar Diagnóstico Automático

```bash
# Ejecuta el script de diagnóstico
./diagnose-production.sh
```

### Verificaciones Manuales

```bash
# 1. Verificar que el backend esté ejecutándose
curl http://localhost:5000/api/health

# 2. Verificar logs del servidor
tail -f /var/log/nginx/tractoreando_error.log

# 3. Verificar conexión a MongoDB
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://127.0.0.1:27017/tractoreando_prod').then(() => console.log('✅ MongoDB OK')).catch(err => console.log('❌ MongoDB Error:', err.message));"

# 4. Verificar puertos en uso
sudo netstat -tlnp | grep :5000
sudo netstat -tlnp | grep :27017
```

## 🚀 Lista de Verificación Final

- [ ] ✅ Archivo `manifest.json` creado y válido
- [ ] ✅ Variables de entorno configuradas correctamente
- [ ] ✅ Frontend construido para producción
- [ ] ✅ Servidor backend ejecutándose en puerto 5000
- [ ] ✅ MongoDB ejecutándose y accesible
- [ ] ✅ Nginx configurado como proxy reverso
- [ ] ✅ CORS configurado correctamente
- [ ] ✅ SSL/HTTPS configurado (si aplica)

## 📞 Comandos de Emergencia

```bash
# Reiniciar todos los servicios
sudo systemctl restart mongod
sudo systemctl restart nginx
pm2 restart all

# Verificar logs en tiempo real
pm2 logs
tail -f /var/log/nginx/tractoreando_error.log

# Reconstruir completamente
./build-production.sh
pm2 restart all
```

## 🔧 Archivos Creados/Modificados

1. `frontend/.env.production` - Configuración de entorno para frontend
2. `frontend/.env.local` - Configuración para desarrollo local
3. `frontend/public/manifest.json` - Manifiesto de la aplicación web
4. `server.js` - Corregida ruta de archivos estáticos
5. `build-production.sh` - Script de construcción automatizada
6. `nginx-production.conf` - Configuración de nginx para producción
7. `diagnose-production.sh` - Script de diagnóstico automático

Todos estos cambios resuelven los errores reportados y mejoran la configuración de producción.