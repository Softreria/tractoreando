# 🌐 Configuración de Proxy y Red - Tractoreando

## 📋 Escenarios de Deployment

Esta guía cubre tanto la configuración de Nginx Proxy Manager como la configuración de red para servidores independientes.

### Escenario 1: Servidor Independiente con Proxy Manager

```
┌─────────────────────┐    ┌─────────────────────┐
│   Nginx Proxy      │    │   Servidor          │
│   Manager           │────│   Tractoreando      │
│   (Servidor A)      │    │   (Servidor B)      │
│   - SSL/TLS         │    │   - App: Puerto 5000│
│   - Dominios        │    │   - Nginx: Puerto 80│
│   - Certificados    │    │   - Sin SSL local   │
└─────────────────────┘    └─────────────────────┘
```

### Escenario 2: Servidor Todo-en-Uno

```
┌─────────────────────────────────────┐
│   Servidor Único                   │
│   - Nginx Proxy Manager            │
│   - Tractoreando App                │
│   - Base de Datos                  │
│   - SSL/TLS                        │
└─────────────────────────────────────┘
```

## 🔌 Configuración de Puertos

### Servidor Tractoreando

| Puerto | Servicio | Descripción | Acceso |
|--------|----------|-------------|--------|
| 80 | Nginx | Servidor web principal | Proxy Manager |
| 5000 | Node.js | API Backend | Solo localhost |
| 27017 | MongoDB | Base de datos | Solo localhost |
| 22 | SSH | Administración | Red privada |

### Configuración de Firewall

```bash
# Permitir tráfico HTTP/HTTPS desde proxy manager
sudo ufw allow from 192.168.1.0/24 to any port 80
sudo ufw allow from 192.168.1.0/24 to any port 443

# Permitir SSH desde red de administración
sudo ufw allow from 192.168.1.0/24 to any port 22

# Denegar acceso directo desde internet
sudo ufw deny 80
sudo ufw deny 443
sudo ufw deny 5000
```

## 🚀 Instalación en Servidor Independiente

### 1. Instalar Tractoreando

```bash
# En el servidor donde estará la aplicación
sudo ./install-standalone.sh
```

Este script:
- ✅ Configura la aplicación para escuchar solo en localhost:5000
- ✅ Configura Nginx para hacer proxy reverso en puerto 80
- ✅ Configura el firewall para permitir tráfico desde redes privadas
- ✅ Optimiza la configuración para funcionar detrás de un proxy

### 2. Verificar la Instalación

```bash
# Verificar que la aplicación está corriendo
curl http://localhost/health

# Verificar que Nginx está funcionando
sudo systemctl status nginx

# Verificar que la aplicación backend está corriendo
sudo -u tractoreando pm2 status
```

## ⚙️ Configuración en Nginx Proxy Manager

### 1. Crear Proxy Host

1. **Accede a Nginx Proxy Manager** (interfaz web)
2. **Hosts > Proxy Hosts > Add Proxy Host**

### 2. Configuración del Proxy Host

#### Pestaña "Details"
```
Domain Names: tu-dominio.com
Scheme: http
Forward Hostname/IP: [IP_DEL_SERVIDOR_TRACTOREANDO]
Forward Port: 80

☑️ Cache Assets
☑️ Block Common Exploits
☑️ Websockets Support (si planeas usar WebSockets)
```

#### Pestaña "SSL"
```
SSL Certificate: [Seleccionar o crear certificado]
☑️ Force SSL
☑️ HTTP/2 Support
☑️ HSTS Enabled
☑️ HSTS Subdomains
```

#### Pestaña "Advanced"
```nginx
# Configuración avanzada para Tractoreando

# Headers importantes para la aplicación
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Port $server_port;

# Configuración para archivos grandes
client_max_body_size 50M;
client_body_buffer_size 128k;

# Timeouts
proxy_connect_timeout 30s;
proxy_send_timeout 30s;
proxy_read_timeout 30s;

# Buffer settings
proxy_buffering on;
proxy_buffer_size 4k;
proxy_buffers 8 4k;

# Para WebSockets (si se usan en el futuro)
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_cache_bypass $http_upgrade;

# Headers de seguridad adicionales
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## 🔧 Configuración del Servidor Tractoreando

### 1. Actualizar Variables de Entorno

Edita `/opt/tractoreando/.env`:

```bash
# URL base (la que verán los usuarios)
BASE_URL=https://tu-dominio.com
FRONTEND_URL=https://tu-dominio.com
BACKEND_URL=https://tu-dominio.com/api

# CORS para el dominio final
CORS_ORIGIN=https://tu-dominio.com

# Configuración de proxy
TRUST_PROXY=true
TRUSTED_PROXIES=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,[IP_DEL_PROXY_MANAGER]
```

### 2. Reiniciar la Aplicación

```bash
sudo -u tractoreando pm2 restart all
```

## 🔍 Verificación y Testing

### 1. Health Checks

```bash
# Desde el servidor proxy manager
curl http://[IP_SERVIDOR_TRACTOREANDO]/health

# Desde internet (después de configurar el proxy)
curl https://tu-dominio.com/health
```

### 2. Verificar Headers

```bash
# Verificar que los headers se están pasando correctamente
curl -H "X-Forwarded-For: 1.2.3.4" http://[IP_SERVIDOR_TRACTOREANDO]/api/health
```

### 3. Testing de la Aplicación

1. **Accede a** `https://tu-dominio.com`
2. **Verifica el login** y funcionalidades
3. **Comprueba la subida de archivos**
4. **Revisa los logs** en ambos servidores

## 🔒 Configuración de Seguridad

### 1. Firewall en Servidor Tractoreando

```bash
# Permitir solo tráfico desde el proxy manager
sudo ufw allow from [IP_DEL_PROXY_MANAGER] to any port 80
sudo ufw allow from [IP_DEL_PROXY_MANAGER] to any port 443

# Denegar acceso directo desde internet (opcional)
sudo ufw deny 80
sudo ufw deny 443
```

### 2. Configuración de Red

- **Red privada**: Usa una red privada entre servidores si es posible
- **VPN**: Considera usar VPN para comunicación entre servidores
- **Fail2ban**: Configura fail2ban en ambos servidores

## 📊 Monitoreo y Logs

### 1. Logs del Proxy Manager

```bash
# Ver logs del proxy
docker logs nginx-proxy-manager
```

### 2. Logs del Servidor Tractoreando

```bash
# Logs de la aplicación
sudo -u tractoreando pm2 logs

# Logs de Nginx
sudo tail -f /var/log/nginx/tractoreando_access.log
sudo tail -f /var/log/nginx/tractoreando_error.log
```

### 3. Monitoreo de Rendimiento

```bash
# Estado de la aplicación
sudo -u tractoreando pm2 monit

# Estado del sistema
htop
iotop
nethogs
```

## 🚨 Solución de Problemas

### Problema: "502 Bad Gateway"

**Posibles causas:**
1. La aplicación no está corriendo en el servidor
2. Firewall bloqueando la conexión
3. IP incorrecta en la configuración del proxy

**Solución:**
```bash
# Verificar estado de la aplicación
sudo -u tractoreando pm2 status

# Verificar conectividad
telnet [IP_SERVIDOR_TRACTOREANDO] 80

# Verificar logs
sudo tail -f /var/log/nginx/error.log
```

### Problema: "CORS Error"

**Solución:**
```bash
# Verificar configuración CORS en .env
CORS_ORIGIN=https://tu-dominio.com

# Reiniciar aplicación
sudo -u tractoreando pm2 restart all
```

### Problema: "SSL Certificate Error"

**Solución:**
1. Verificar que el certificado está configurado en Nginx Proxy Manager
2. Verificar que "Force SSL" está habilitado
3. Verificar que el dominio coincide con el certificado

## 📋 Checklist de Configuración

### Servidor Tractoreando
- [ ] Aplicación instalada con `install-standalone.sh`
- [ ] Variables de entorno configuradas con el dominio correcto
- [ ] Firewall configurado para permitir tráfico del proxy
- [ ] Aplicación corriendo en puerto 5000 (localhost)
- [ ] Nginx corriendo en puerto 80
- [ ] Health check respondiendo: `/health`

### Nginx Proxy Manager
- [ ] Proxy Host creado con IP y puerto correctos
- [ ] SSL configurado y "Force SSL" habilitado
- [ ] Headers avanzados configurados
- [ ] Dominio apuntando al servidor proxy manager

### Testing
- [ ] Acceso web funcionando: `https://tu-dominio.com`
- [ ] API funcionando: `https://tu-dominio.com/api/health`
- [ ] Login y funcionalidades principales
- [ ] Subida de archivos
- [ ] Logs sin errores

## 🔄 Actualizaciones

Para actualizar la aplicación:

```bash
# En el servidor Tractoreando
cd /opt/tractoreando
sudo -u tractoreando ./update.sh git
```

No es necesario tocar la configuración del proxy manager para actualizaciones de la aplicación.

## 📞 Soporte

Si tienes problemas:

1. **Revisa los logs** de ambos servidores
2. **Verifica la conectividad** entre servidores
3. **Comprueba la configuración** de firewall
4. **Testa los health checks** individualmente
5. **Revisa la configuración DNS** del dominio

---

**¡Configuración completada!** 🎉

Tu aplicación Tractoreando ahora está funcionando en un servidor independiente, accesible a través de Nginx Proxy Manager con SSL/TLS automático.