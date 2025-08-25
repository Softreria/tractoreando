# Resumen: Despliegue Directo en Servidor de Producción

## 📋 Archivos Creados para el Despliegue

### 1. **COMANDOS-SERVIDOR-DIRECTO.md**
- Guía completa con todos los comandos para ejecutar directamente en el servidor
- Incluye configuración de Nginx, SSL, MongoDB, PM2
- Comandos de verificación y mantenimiento

### 2. **verificar-servidor.sh** (ejecutable)
- Script de verificación automática del estado del servidor
- Verifica configuración, dependencias, servicios y conectividad
- Proporciona diagnóstico completo del despliegue

## 🚀 Pasos para Despliegue Directo

### Paso 1: Subir Archivos al Servidor
Sube estos archivos a tu servidor en `/opt/tractoreando/`:
- `COMANDOS-SERVIDOR-DIRECTO.md`
- `verificar-servidor.sh`
- Todo el código fuente del proyecto

### Paso 2: Ejecutar en el Servidor
```bash
# Conectarse al servidor
ssh usuario@tractoreando.softreria.com

# Ir al directorio del proyecto
cd /opt/tractoreando

# Hacer el script ejecutable (si no lo está)
chmod +x verificar-servidor.sh

# Ejecutar verificación inicial
./verificar-servidor.sh

# Seguir los comandos del archivo COMANDOS-SERVIDOR-DIRECTO.md
```

## 🔧 Configuración Clave Aplicada

### Puerto Cambiado
- **Problema resuelto**: Puerto 5000 ocupado por AirPlay en macOS
- **Solución**: Cambio a puerto 5001 en todos los archivos de configuración

### Archivos de Configuración Actualizados
1. **`.env.production`** - Variables de entorno para producción
2. **`frontend/.env.production`** - Configuración del frontend
3. **`nginx-production.conf`** - Configuración de Nginx con proxy a puerto 5001
4. **`ecosystem.config.js`** - Configuración de PM2

## 📁 Estructura de Archivos en el Servidor

```
/opt/tractoreando/
├── .env.production              # Variables de entorno principales
├── .env                         # Copia de .env.production
├── server.js                    # Servidor backend
├── ecosystem.config.js          # Configuración PM2
├── package.json                 # Dependencias backend
├── frontend/
│   ├── .env.production         # Variables frontend
│   ├── package.json            # Dependencias frontend
│   └── build/                  # Build de producción (se genera)
├── logs/                       # Logs de PM2 (se crea)
├── COMANDOS-SERVIDOR-DIRECTO.md # Guía de comandos
└── verificar-servidor.sh       # Script de verificación
```

## 🌐 URLs y Puertos

- **Dominio**: https://tractoreando.softreria.com
- **Backend**: Puerto 5001 (interno)
- **Frontend**: Servido por Nginx en puerto 443 (HTTPS)
- **API**: https://tractoreando.softreria.com/api/

## ✅ Verificaciones Importantes

Antes de considerar el despliegue completo, verifica:

1. **Servicios ejecutándose**:
   - MongoDB: `sudo systemctl status mongod`
   - Nginx: `sudo systemctl status nginx`
   - PM2: `pm2 status`

2. **Conectividad**:
   - Backend local: `curl http://localhost:5001/api/health`
   - Frontend público: `curl https://tractoreando.softreria.com`
   - API pública: `curl https://tractoreando.softreria.com/api/health`

3. **Certificados SSL**:
   - Verificar con: `sudo certbot certificates`

## 🔍 Comandos de Diagnóstico Rápido

```bash
# Verificación completa automática
./verificar-servidor.sh

# Ver logs de la aplicación
pm2 logs tractoreando

# Estado de todos los servicios
sudo systemctl status nginx mongod
pm2 status

# Verificar puertos
netstat -tlnp | grep -E ':(80|443|5001)'

# Test de conectividad
curl -I https://tractoreando.softreria.com
curl https://tractoreando.softreria.com/api/health
```

## 🚨 Solución de Problemas Comunes

### Error: Puerto 5001 ocupado
```bash
# Ver qué proceso usa el puerto
lsof -i:5001

# Cambiar a puerto 5002 si es necesario
# Editar .env.production, ecosystem.config.js y nginx config
```

### Error: Frontend no carga
```bash
# Verificar que el build existe
ls -la frontend/build/

# Reconstruir si es necesario
cd frontend && npm run build
```

### Error: MongoDB no conecta
```bash
# Verificar estado
sudo systemctl status mongod

# Reiniciar si es necesario
sudo systemctl restart mongod
```

### Error: SSL no funciona
```bash
# Verificar certificados
sudo certbot certificates

# Renovar si es necesario
sudo certbot renew
```

## 📞 Próximos Pasos

1. **Sube los archivos** al servidor
2. **Ejecuta** `./verificar-servidor.sh` para diagnóstico inicial
3. **Sigue** los comandos en `COMANDOS-SERVIDOR-DIRECTO.md` paso a paso
4. **Verifica** que todo funcione con las URLs públicas
5. **Configura** monitoreo y backups según necesidades

---

**Nota**: Todos los comandos están diseñados para ejecutarse directamente en el servidor de producción. No necesitas `scp` ni transferencia de archivos desde tu máquina local.