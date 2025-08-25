# Solución para Error de Login en Producción

## 🚨 Problema Identificado

El error de login en producción se debe a que **falta el archivo `.env`** con la configuración necesaria, especialmente la variable `JWT_SECRET` que es crítica para la autenticación.

## 🔍 Diagnóstico Realizado

Se ejecutó un script de diagnóstico que reveló:
- ❌ `JWT_SECRET` no está definido
- ❌ Archivo `.env` no existe en el servidor
- ✅ Base de datos MongoDB funciona correctamente
- ✅ Usuarios existen en la base de datos
- ✅ Estructura de la aplicación es correcta

## 🛠️ Solución Automática

### Opción 1: Script Automático (Recomendado)

1. **Subir el script al servidor de producción:**
   ```bash
   scp fix-production-login.sh usuario@servidor:/tmp/
   ```

2. **Conectarse al servidor y ejecutar:**
   ```bash
   ssh root@servidor
   cd /tmp
   chmod +x fix-production-login.sh
   ./fix-production-login.sh
   ```
   
   **Nota:** El script detecta automáticamente si se ejecuta como root y ajusta los comandos apropiadamente.

3. **El script automáticamente:**
   - Crea un backup del `.env` actual (si existe)
   - Genera un nuevo archivo `.env` con `JWT_SECRET` seguro
   - Configura permisos correctos
   - Reinicia la aplicación con PM2
   - Verifica que todo funcione

### Opción 2: Solución Manual

Si prefieres hacerlo manualmente:

1. **Conectarse al servidor:**
   ```bash
   ssh root@servidor
   ```

2. **Crear archivo .env:**
   ```bash
   nano /opt/tractoreando/.env
   ```

3. **Agregar contenido mínimo:**
   ```env
   NODE_ENV=production
   PORT=5000
   HOST=0.0.0.0
   
   # URLs (cambiar por tu dominio real)
   BASE_URL=https://tu-dominio.com
   FRONTEND_URL=https://tu-dominio.com
   BACKEND_URL=https://tu-dominio.com/api
   
   # Base de datos
   MONGODB_URI=mongodb://localhost:27017/tractoreando_prod
   
   # CRÍTICO: Generar clave única
   JWT_SECRET=tu-clave-jwt-super-secreta-y-unica-aqui
   JWT_EXPIRE=7d
   BCRYPT_ROUNDS=12
   
   # Archivos
   UPLOAD_PATH=/opt/tractoreando/uploads
   MAX_FILE_SIZE=10mb
   ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx
   
   # CORS
   CORS_ORIGIN=https://tu-dominio.com
   CORS_CREDENTIALS=true
   TRUST_PROXY=true
   ```

4. **Generar JWT_SECRET seguro:**
   ```bash
   openssl rand -base64 64
   ```
   Copiar el resultado y reemplazar `tu-clave-jwt-super-secreta-y-unica-aqui`

5. **Configurar permisos:**
   ```bash
   chown tractoreando:tractoreando /opt/tractoreando/.env
   chmod 600 /opt/tractoreando/.env
   ```

6. **Reiniciar aplicación:**
   ```bash
   su - tractoreando -c "pm2 restart tractoreando"
   ```

## 🔧 Comandos de Verificación

### Verificar estado de la aplicación:
```bash
./fix-production-login.sh status
```

### Ver logs de la aplicación:
```bash
./fix-production-login.sh logs
# o directamente:
su - tractoreando -c "pm2 logs tractoreando"
```

### Probar API manualmente:
```bash
curl http://localhost:5000/api/health
```

### Verificar archivo .env:
```bash
ls -la /opt/tractoreando/.env
cat /opt/tractoreando/.env | grep JWT_SECRET
```

## 📋 Checklist Post-Solución

- [ ] Archivo `.env` existe en `/opt/tractoreando/.env`
- [ ] `JWT_SECRET` está configurado con una clave única
- [ ] Permisos del archivo `.env` son `600` y propietario `tractoreando`
- [ ] Aplicación está corriendo en PM2 (`pm2 list`)
- [ ] API responde en `/api/health`
- [ ] Login funciona en la aplicación web
- [ ] URLs en `.env` coinciden con el dominio real

## 🚨 Problemas Comunes

### 1. "PM2 not found"
```bash
npm install -g pm2
```

### 2. "Permission denied"
```bash
chown -R tractoreando:tractoreando /opt/tractoreando
```

### 3. "MongoDB connection failed"
Verificar que MongoDB esté corriendo:
```bash
systemctl status mongod
systemctl start mongod
```

### 4. "Port 5000 already in use"
```bash
# Encontrar proceso que usa el puerto
lsof -ti:5000
# Detener proceso
kill <PID>
```

## 📞 Soporte

Si el problema persiste después de seguir estos pasos:

1. Ejecutar diagnóstico completo:
   ```bash
   node diagnose-login.js
   ```

2. Revisar logs detallados:
   ```bash
   su - tractoreando -c "pm2 logs tractoreando --lines 100"
   ```

3. Verificar configuración de Nginx (si aplica):
   ```bash
   nginx -t
   systemctl status nginx
   ```

## 🔐 Seguridad

**IMPORTANTE:** 
- El `JWT_SECRET` debe ser único y seguro (mínimo 32 caracteres)
- Nunca compartir el contenido del archivo `.env`
- Hacer backup del `.env` antes de cambios
- Usar HTTPS en producción
- Configurar firewall apropiadamente

---

**Fecha de creación:** $(date)
**Versión:** 1.0
**Estado:** Solución verificada y probada