# 🔧 Guía de Solución de Problemas - Tractoreando

## 🚨 Problemas Comunes y Soluciones

Esta guía proporciona soluciones rápidas y efectivas para los problemas más comunes en Tractoreando.

---

## 🔐 1. Problemas de Login

### 🐛 **Síntomas**
- Error de autenticación al intentar hacer login
- Mensaje: "Invalid credentials" o "JWT token invalid"
- No se puede acceder al sistema después de la instalación

### 🔍 **Diagnóstico**
```bash
# Diagnóstico específico de login
node diagnose-system.js --login-only
```

### 🚀 **Solución Automática**
```bash
# Solución completa para problemas de login
./fix-production-login.sh
```

### 🛠️ **Solución Manual**

#### Verificar archivo .env
```bash
# Verificar si existe el archivo .env
ls -la .env

# Si no existe, crear uno básico
cp .env.example .env
```

#### Generar JWT_SECRET
```bash
# Generar un JWT_SECRET seguro
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
```

#### Verificar variables requeridas
```bash
# Verificar que las variables críticas estén definidas
grep -E "(JWT_SECRET|MONGODB_URI|NODE_ENV)" .env
```

---

## 🗄️ 2. Problemas de MongoDB

### 🐛 **Síntomas**
- Error: "ECONNREFUSED ::1:27017"
- Error: "MongooseError: Operation buffering timed out"
- No se puede conectar a la base de datos

### 🔍 **Diagnóstico**
```bash
# Diagnóstico específico de MongoDB
node diagnose-system.js --mongo-only
```

### 🚀 **Solución Automática**
```bash
# Para problemas de conexión
./fix-mongodb-connection.sh

# Para solución rápida (detecta automáticamente el problema)
./fix-mongodb-quick.sh
```

### 🛠️ **Solución Manual**

#### Verificar estado de MongoDB
```bash
# Verificar si MongoDB está ejecutándose
sudo systemctl status mongod

# Si no está activo, iniciarlo
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Verificar puerto 27017
```bash
# Verificar si el puerto está en uso
lsof -i :27017

# Verificar conexión local
mongo --eval "db.adminCommand('ismaster')"
```

#### Instalar MongoDB (si no está instalado)
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y mongodb

# CentOS/RHEL
sudo yum install -y mongodb-server
```

---

## ⏱️ 3. Problemas de Timeout

### 🐛 **Síntomas**
- Error: "Operation buffering timed out after 10000ms"
- Operaciones de base de datos muy lentas
- Timeouts en operaciones masivas

### 🔍 **Diagnóstico**
```bash
# Diagnóstico y optimización
node diagnose-system.js --optimize-only
```

### 🚀 **Solución Automática**
```bash
# Optimización automática de timeouts
node diagnose-system.js --auto-fix
```

### 🛠️ **Solución Manual**

#### Optimizar configuración de MongoDB
```javascript
// En tu código, usar configuración extendida
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 60000,
  socketTimeoutMS: 120000,
  connectTimeoutMS: 60000,
  maxPoolSize: 10,
  minPoolSize: 2
};
```

#### Verificar recursos del servidor
```bash
# Verificar memoria disponible
free -h

# Verificar uso de CPU
top

# Verificar espacio en disco
df -h
```

---

## 🔄 4. Problemas de Carga de Datos

### 🐛 **Síntomas**
- Error al cargar datos de ejemplo
- Datos duplicados o inconsistentes
- Fallos en la inserción masiva

### 🚀 **Solución**
```bash
# Cargar datos de ejemplo
node data-loader.js sample

# Cargar datos para España
node data-loader.js spanish

# Cargar datos de producción (mínimos)
node data-loader.js production --use-batches

# Cargar sin limpiar datos existentes
node data-loader.js sample --no-clear
```

---

## 🌐 5. Problemas de Red y Proxy

### 🐛 **Síntomas**
- No se puede acceder desde el proxy manager
- Error 502 Bad Gateway
- Problemas de CORS

### 🔍 **Diagnóstico**
```bash
# Verificar que la aplicación está corriendo
curl http://localhost:5000/health

# Verificar Nginx
sudo systemctl status nginx

# Verificar PM2
sudo -u tractoreando pm2 status
```

### 🚀 **Solución**
```bash
# Configurar para servidor independiente
./install-standalone.sh

# Configurar proxy
./configure-proxy.sh
```

### 📖 **Documentación Detallada**
Para configuración avanzada de proxy, consulta: [NGINX-PROXY-MANAGER-SETUP.md](./NGINX-PROXY-MANAGER-SETUP.md)

---

## 🔧 6. Diagnóstico Completo del Sistema

### 🚀 **Diagnóstico Automático Completo**
```bash
# Ejecutar diagnóstico completo con correcciones automáticas
node diagnose-system.js --auto-fix

# Solo diagnóstico (sin correcciones)
node diagnose-system.js
```

### 📊 **Verificación de Instalación**
```bash
# Verificar que todo está funcionando
./verify-installation.sh
```

---

## 🆘 7. Solución de Emergencia

### 🚨 **Si nada funciona**

#### Reinstalación limpia
```bash
# 1. Hacer backup de datos importantes
mongodump --db tractoreando --out backup/

# 2. Limpiar instalación
./clean-for-git.sh

# 3. Reinstalar
./install.sh

# 4. Restaurar datos si es necesario
mongorestore backup/
```

#### Verificación paso a paso
```bash
# 1. Verificar Node.js
node --version
npm --version

# 2. Verificar MongoDB
mongo --version
sudo systemctl status mongod

# 3. Verificar dependencias
npm install

# 4. Verificar configuración
node diagnose-system.js

# 5. Cargar datos de prueba
node data-loader.js sample

# 6. Iniciar aplicación
npm start
```

---

## 📞 Contacto y Soporte

### 🔍 **Antes de reportar un problema**
1. Ejecuta el diagnóstico completo: `node diagnose-system.js`
2. Revisa los logs: `sudo -u tractoreando pm2 logs`
3. Verifica la configuración: `cat .env`

### 📝 **Información a incluir en reportes**
- Salida del comando `node diagnose-system.js`
- Logs de error específicos
- Sistema operativo y versión
- Versión de Node.js y MongoDB
- Pasos para reproducir el problema

---

## 📚 Documentación Adicional

- [README.md](./README.md) - Documentación principal
- [NGINX-PROXY-MANAGER-SETUP.md](./NGINX-PROXY-MANAGER-SETUP.md) - Configuración de proxy
- [CONSOLIDACION-SCRIPTS.md](./CONSOLIDACION-SCRIPTS.md) - Información sobre scripts
- [CONSOLIDACION-JS.md](./CONSOLIDACION-JS.md) - Información sobre archivos JavaScript

---

## 🎯 Scripts Disponibles

### Diagnóstico y Solución
- `diagnose-system.js` - Sistema unificado de diagnóstico
- `data-loader.js` - Sistema unificado de carga de datos

### Instalación y Configuración
- `install.sh` - Instalación completa
- `install-standalone.sh` - Instalación para servidor independiente
- `update.sh` - Actualización del sistema
- `configure-proxy.sh` - Configuración de proxy

### Solución de Problemas
- `fix-production-login.sh` - Solución de problemas de login
- `fix-mongodb-connection.sh` - Solución de problemas de MongoDB
- `fix-mongodb-quick.sh` - Solución rápida de MongoDB

### Utilidades
- `verify-installation.sh` - Verificación de instalación
- `clean-for-git.sh` - Limpieza para Git

---

*Esta guía se actualiza regularmente. Para la versión más reciente, consulta el repositorio del proyecto.*