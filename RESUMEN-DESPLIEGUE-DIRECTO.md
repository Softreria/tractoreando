# Guía de Despliegue - Sistema Tractoreando

## ⚠️ CONFIGURACIÓN IMPORTANTE

**Tu servidor está detrás de un Nginx Proxy Manager**, por lo que:
- ✅ Backend usa puerto **5000** (no 5001)
- ✅ Nginx local sirve en puerto **80** (sin SSL)
- ✅ SSL se maneja en el Proxy Manager
- ✅ Acceso público a través del proxy, no directo

### Configuraciones Soportadas

#### Configuración 1: Servidor Independiente
- **Backend**: Puerto 5001
- **Frontend**: Servido por Nginx en puerto 80/443
- **SSL**: Certificado Let's Encrypt directo
- **Base de Datos**: MongoDB local

#### Configuración 2: Detrás de Nginx Proxy Manager (Actual)
- **Backend**: Puerto 5000 (interno)
- **Frontend**: Servido por Nginx local en puerto 80
- **Nginx Local**: Puerto 80 (sin SSL)
- **Nginx Proxy Manager**: Maneja SSL y redirección externa

## 📋 Archivos Actualizados para Proxy Manager

### 1. **COMANDOS-SERVIDOR-DIRECTO.md**
- Guía completa adaptada para proxy manager
- Configuración de Nginx local sin SSL
- Configuración de firewall para redes privadas
- Comandos de verificación específicos

### 2. **verificar-servidor.sh** (ejecutable)
- Script actualizado para verificar puerto 5000
- Verificación de Nginx local en puerto 80
- Diagnóstico específico para proxy manager

### 3. Archivos de configuración actualizados:
- **`.env.production`** - Puerto 5000
- **`.env`** - Puerto 5000
- **`frontend/.env.local`** - API en puerto 5000
- **`ecosystem.config.js`** - PM2 configurado para puerto 5000
- **`nginx-production.conf`** - Proxy a puerto 5000

## 🚀 Pasos para Despliegue

### Paso 1: Subir Archivos al Servidor
Sube estos archivos a tu servidor en `/opt/tractoreando/`:
- Todos los archivos del proyecto
- `COMANDOS-SERVIDOR-DIRECTO.md`
- `verificar-servidor.sh`

### Paso 2: Ejecutar en el Servidor
```bash
# Conectarse al servidor
ssh usuario@tractoreando.softreria.com

# Ir al directorio del proyecto
cd /opt/tractoreando

# Ejecutar verificación inicial
./verificar-servidor.sh

# Seguir los comandos del archivo COMANDOS-SERVIDOR-DIRECTO.md
```

## 🔧 Configuración Específica para Proxy Manager

### Arquitectura de Red
```
┌─────────────────────┐    ┌─────────────────────┐
│   Nginx Proxy      │    │   Servidor          │
│   Manager           │────│   Tractoreando      │
│   (Otro servidor)   │    │   (Este servidor)   │
│   - SSL/TLS         │    │   - App: Puerto 5000│
│   - Dominios        │    │   - Nginx: Puerto 80│
│   - Certificados    │    │   - Sin SSL local   │
└─────────────────────┘    └─────────────────────┘
```

### Configuración en Nginx Proxy Manager
1. **Domain Names**: `tractoreando.softreria.com`
2. **Scheme**: `http`
3. **Forward Hostname/IP**: `[IP_DE_ESTE_SERVIDOR]`
4. **Forward Port**: `80`
5. **SSL**: Habilitado en el proxy manager

### Headers Importantes en Proxy Manager
```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
client_max_body_size 50M;
```

## 🌐 URLs y Puertos

- **Dominio público**: https://tractoreando.softreria.com
- **Backend interno**: http://localhost:5000
- **Nginx local**: http://localhost:80
- **API pública**: https://tractoreando.softreria.com/api/

## ✅ Verificaciones Críticas

### En el Servidor Tractoreando:
```bash
# Backend debe responder
curl http://localhost:5000/api/health

# Nginx local debe responder
curl http://localhost/health
curl http://localhost/api/health

# Servicios ejecutándose
pm2 status
sudo systemctl status nginx mongod
```

### Desde el Proxy Manager:
```bash
# Conectividad de red
telnet [IP_SERVIDOR_TRACTOREANDO] 80

# Test HTTP
curl http://[IP_SERVIDOR_TRACTOREANDO]/health
```

### Acceso Público:
```bash
# Frontend
curl -I https://tractoreando.softreria.com

# API
curl https://tractoreando.softreria.com/api/health
```

## 🔍 Diagnóstico Rápido

```bash
# Verificación completa automática
./verificar-servidor.sh

# Estado de servicios
pm2 status
sudo systemctl status nginx mongod

# Verificar puertos específicos
netstat -tlnp | grep -E ':(80|5000)'

# Logs de aplicación
pm2 logs tractoreando --lines 20
```

## 🚨 Problemas Comunes y Soluciones

### ❌ Backend no responde en localhost:5000
```bash
# Verificar PM2
pm2 status
pm2 restart tractoreando

# Verificar puerto
lsof -i:5000
```

### ❌ Nginx local no responde en puerto 80
```bash
# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs
sudo tail -f /var/log/nginx/error.log
```

### ❌ Proxy Manager no puede conectar
```bash
# Verificar firewall
sudo ufw status

# Permitir tráfico desde proxy manager
sudo ufw allow from [IP_PROXY_MANAGER] to any port 80

# Verificar conectividad
curl http://localhost/health
```

### ❌ API pública no responde
1. Verificar que el backend local funcione
2. Verificar que Nginx local funcione
3. Verificar configuración en Proxy Manager
4. Verificar DNS del dominio

## 📞 Próximos Pasos

1. **Sube los archivos** actualizados al servidor
2. **Ejecuta** `./verificar-servidor.sh` para diagnóstico
3. **Sigue** `COMANDOS-SERVIDOR-DIRECTO.md` paso a paso
4. **Configura** el proxy host en Nginx Proxy Manager
5. **Verifica** que todo funcione con las URLs públicas

---

**✅ Configuración Completada**: Todos los archivos han sido actualizados para funcionar correctamente detrás de un Nginx Proxy Manager usando el puerto 5000.