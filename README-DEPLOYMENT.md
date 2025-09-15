# 🚀 Guía de Despliegue Automatizado - Tractoreando

Esta guía explica cómo usar el sistema de despliegue automatizado para evitar errores manuales y sincronizar automáticamente el código local con producción.

## 📋 Archivos del Sistema de Despliegue

- `sync-to-production.sh` - Script principal de sincronización
- `deploy.sh` - Script de despliegue simplificado con opciones
- `ecosystem.config.js` - Configuración de PM2 para producción

## 🔧 Configuración Inicial

### 1. Verificar Conexión SSH
Asegúrate de que puedes conectarte al servidor sin contraseña:
```bash
ssh root@192.168.18.13
```

### 2. Configurar PM2 en Producción (solo la primera vez)
```bash
ssh root@192.168.18.13
cd /opt/tractoreando
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## 🚀 Uso del Sistema de Despliegue

### Despliegue Completo (Recomendado)
```bash
./deploy.sh
```
Esto hará:
1. ✅ Crear backup automático en producción
2. ✅ Sincronizar todos los archivos (excepto .env.production y node_modules)
3. ✅ Instalar dependencias si es necesario
4. ✅ Construir el frontend
5. ✅ Reiniciar la aplicación con PM2

### Solo Sincronización (sin reiniciar)
```bash
./deploy.sh --sync-only
```

### Sincronizar y Construir (sin reiniciar PM2)
```bash
./deploy.sh --no-restart
```

### Solo Sincronización Manual
```bash
./sync-to-production.sh
```

## 🛡️ Características de Seguridad

### Archivos Protegidos
El sistema **NO** sobrescribe estos archivos críticos:
- `.env.production` - Variables de entorno de producción
- `node_modules/` - Dependencias (se reinstalan si es necesario)
- `frontend/node_modules/` - Dependencias del frontend
- `frontend/build/` - Build del frontend (se regenera)
- `.git/` - Repositorio git
- `logs/` - Archivos de log
- `uploads/` - Archivos subidos por usuarios

### Backup Automático
Cada despliegue crea un backup completo en:
```
/opt/tractoreando-backup-YYYYMMDD-HHMMSS
```

## 🔍 Verificación Post-Despliegue

### Verificar Estado de la Aplicación
```bash
ssh root@192.168.18.13 'cd /opt/tractoreando && pm2 status'
```

### Ver Logs en Tiempo Real
```bash
ssh root@192.168.18.13 'cd /opt/tractoreando && pm2 logs tractoreando'
```

### Ver Últimas 50 líneas de logs
```bash
ssh root@192.168.18.13 'cd /opt/tractoreando && pm2 logs tractoreando --lines 50'
```

## 🚨 Solución de Problemas

### Si el despliegue falla:
1. Verificar conexión SSH: `ssh root@192.168.18.13`
2. Verificar espacio en disco: `ssh root@192.168.18.13 'df -h'`
3. Verificar logs: `ssh root@192.168.18.13 'cd /opt/tractoreando && pm2 logs tractoreando --err'`

### Si PM2 no está configurado:
```bash
ssh root@192.168.18.13
cd /opt/tractoreando
pm2 start ecosystem.config.js --env production
```

### Restaurar desde Backup:
```bash
ssh root@192.168.18.13
# Listar backups disponibles
ls -la /opt/tractoreando-backup-*
# Restaurar (cambiar fecha por la del backup deseado)
cp -r /opt/tractoreando-backup-YYYYMMDD-HHMMSS /opt/tractoreando
```

## 📝 Notas Importantes

1. **Siempre hacer commit** de tus cambios antes del despliegue
2. **Probar localmente** antes de desplegar
3. **Verificar** que la aplicación funciona después del despliegue
4. Los **backups se crean automáticamente** pero no se eliminan automáticamente
5. **Variables de entorno** de producción se mantienen intactas

## 🔄 Flujo de Trabajo Recomendado

1. Desarrollar y probar localmente
2. Hacer commit de los cambios
3. Ejecutar `./deploy.sh`
4. Verificar que la aplicación funciona en producción
5. Si hay problemas, restaurar desde backup si es necesario

## 📞 Comandos Útiles

```bash
# Ver ayuda del script de despliegue
./deploy.sh --help

# Verificar estado del servidor
ssh root@192.168.18.13 'cd /opt/tractoreando && pm2 monit'

# Reiniciar solo la aplicación
ssh root@192.168.18.13 'cd /opt/tractoreando && pm2 restart tractoreando'

# Ver información del sistema
ssh root@192.168.18.13 'cd /opt/tractoreando && pm2 info tractoreando'
```

---

**¡Con este sistema ya no tendrás que resolver errores manualmente cada vez que se reinicie el servidor!** 🎉