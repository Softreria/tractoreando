# 🚨 Troubleshooting Error 502 Bad Gateway - Tractoreando

## Descripción del Problema

El error **502 Bad Gateway** indica que Nginx Proxy Manager no puede conectarse al backend de la aplicación. Este documento proporciona una guía completa para diagnosticar y resolver el problema.

## 🔍 Diagnóstico Rápido

### 1. Verificación Inmediata

```bash
# Verificar estado de PM2
pm2 status

# Verificar si el backend está escuchando en el puerto correcto
lsof -i :3002

# Test directo al backend
curl http://localhost:3002/api/health
```

### 2. Scripts Automatizados

#### Diagnóstico Completo
```bash
# Ejecutar script de diagnóstico
chmod +x diagnostico-502-produccion.sh
./diagnostico-502-produccion.sh
```

#### Solución Automática
```bash
# Ejecutar script de solución
chmod +x fix-502-produccion.sh
./fix-502-produccion.sh
```

## 🛠️ Solución Manual Paso a Paso

### Paso 1: Verificar Estado del Backend

```bash
# Ver logs de PM2
pm2 logs tractoreando-backend --lines 20

# Verificar procesos Node.js
ps aux | grep node

# Verificar puertos ocupados
netstat -tlnp | grep :3002
```

### Paso 2: Reiniciar Servicios

```bash
# Detener PM2
pm2 stop all

# Limpiar procesos residuales
pkill -f "node.*tractoreando"

# Verificar que los puertos estén libres
lsof -i :3002
lsof -i :5000
lsof -i :8000
```

### Paso 3: Verificar Configuración

```bash
# Verificar archivo .env
cat /opt/tractoreando/.env

# Asegurar configuración correcta
echo "NODE_ENV=production" > /opt/tractoreando/.env
echo "PORT=3002" >> /opt/tractoreando/.env
echo "MONGODB_URI=mongodb://localhost:27017/tractoreando" >> /opt/tractoreando/.env
```

### Paso 4: Verificar MongoDB

```bash
# Estado del servicio
sudo systemctl status mongod

# Iniciar si está detenido
sudo systemctl start mongod

# Test de conexión
mongo --eval "db.adminCommand('ismaster')"
```

### Paso 5: Reiniciar Aplicación

```bash
# Ir al directorio de la aplicación
cd /opt/tractoreando

# Iniciar con PM2
pm2 start ecosystem.config.js --env production

# Verificar estado
pm2 status
```

### Paso 6: Verificar Conectividad

```bash
# Test local
curl -v http://localhost:3002/api/health

# Test de login
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' \
  http://localhost:3002/api/auth/login
```

## 🔧 Problemas Comunes y Soluciones

### 1. Puerto Incorrecto

**Síntoma**: Backend ejecutándose en puerto diferente a 3002

**Solución**:
```bash
# Verificar configuración en ecosystem.config.js
cat /opt/tractoreando/ecosystem.config.js

# Asegurar que .env tenga PORT=3002
echo "PORT=3002" >> /opt/tractoreando/.env
```

### 2. Conflicto de Puertos

**Síntoma**: Error "EADDRINUSE" en logs

**Solución**:
```bash
# Encontrar proceso usando el puerto
lsof -i :3002

# Terminar proceso conflictivo
kill -9 <PID>

# Reiniciar aplicación
pm2 restart tractoreando-backend
```

### 3. MongoDB Desconectado

**Síntoma**: Error de conexión a base de datos en logs

**Solución**:
```bash
# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verificar conexión
mongo --eval "db.stats()"
```

### 4. Variables de Entorno Incorrectas

**Síntoma**: Aplicación no encuentra configuración

**Solución**:
```bash
# Crear .env correcto
cat > /opt/tractoreando/.env << EOF
NODE_ENV=production
PORT=3002
MONGODB_URI=mongodb://localhost:27017/tractoreando
JWT_SECRET=your-secret-key-here
FRONTEND_URL=https://tractoreando.softreria.com
BACKEND_URL=https://tractoreando.softreria.com
EOF
```

## 🌐 Configuración de Nginx Proxy Manager

### Configuración Recomendada

**Proxy Host Settings**:
- **Domain**: `tractoreando.softreria.com`
- **Scheme**: `http`
- **Forward Hostname/IP**: `127.0.0.1` o `localhost`
- **Forward Port**: `3002`

**Advanced Settings**:
```nginx
# Timeouts
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;

# Headers
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# Buffer settings
proxy_buffering on;
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;
```

## 📊 Monitoreo Continuo

### Comandos de Monitoreo

```bash
# Monitor en tiempo real
pm2 monit

# Logs en tiempo real
pm2 logs tractoreando-backend --follow

# Estado del sistema
htop

# Uso de puertos
watch -n 2 'lsof -i :3002'
```

### Alertas Automáticas

```bash
# Script de monitoreo (ejecutar cada minuto con cron)
#!/bin/bash
if ! curl -s -f http://localhost:3002/api/health > /dev/null; then
    echo "$(date): Backend no responde" >> /var/log/tractoreando-monitor.log
    # Reiniciar automáticamente
    pm2 restart tractoreando-backend
fi
```

## 🆘 Contacto de Emergencia

Si el problema persiste después de seguir todos los pasos:

1. **Recopilar información**:
   ```bash
   # Generar reporte completo
   ./diagnostico-502-produccion.sh > reporte-$(date +%Y%m%d-%H%M%S).txt
   ```

2. **Información a proporcionar**:
   - Logs de PM2
   - Estado de MongoDB
   - Configuración de Nginx Proxy Manager
   - Resultado del script de diagnóstico

3. **Acciones de emergencia**:
   - Verificar firewall del servidor
   - Revisar configuración de DNS
   - Contactar al proveedor de hosting

## 📝 Historial de Cambios

- **2025-08-28**: Creación del documento de troubleshooting
- **2025-08-28**: Agregados scripts automatizados de diagnóstico y solución
- **2025-08-28**: Documentación de configuración de Nginx Proxy Manager

---

**Nota**: Este documento debe mantenerse actualizado con cada cambio en la configuración de producción.