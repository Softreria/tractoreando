# Análisis de Puertos y Configuración de Producción - Tractoreando

## 🔍 Problema Identificado

**Error reportado:** `timeout of 10000ms exceeded`

**Contexto:** La aplicación en producción está separada del servidor Nginx Proxy Manager

## 📊 Configuración Actual de Puertos

### Backend (Node.js/Express)
- **Puerto configurado:** 3002
- **Estado:** ✅ Funcionando correctamente
- **Verificación:** `curl http://localhost:3002/api/health` responde OK
- **Variables de entorno:**
  ```bash
  PORT=3002
  HOST=0.0.0.0
  ```

### Nginx Local (Servidor de aplicación)
- **Puerto configurado:** 80 (nginx-standalone.conf)
- **Estado:** ✅ Funcionando correctamente
- **Proxy configurado:** http://127.0.0.1:3002
- **Verificación:** `curl http://localhost/api/health` responde OK

### Frontend (React)
- **URL API configurada:** `https://tractoreando.softreria.com/api`
- **Timeout configurado:** 10000ms (10 segundos)
- **Archivo:** `frontend/src/utils/api.js`

## 🚨 Análisis del Problema

### 1. Configuración de URLs

**Frontend (.env.production):**
```bash
REACT_APP_API_URL=https://tractoreando.softreria.com/api
```

**Backend (.env.production):**
```bash
BASE_URL=https://tractoreando.softreria.com
FRONTEND_URL=https://tractoreando.softreria.com
BACKEND_URL=https://tractoreando.softreria.com/api
API_URL=https://tractoreando.softreria.com/api
```

### 2. Configuración de CORS

**Backend:**
```bash
CORS_ORIGIN=https://tractoreando.softreria.com
CORS_CREDENTIALS=true
```

### 3. Configuración de Proxy

**Nginx Proxy Manager debe estar configurado para:**
- **Dominio:** tractoreando.softreria.com
- **Puerto destino:** 80 (del servidor de aplicación)
- **Protocolo:** HTTP internamente, HTTPS externamente

## 🔧 Posibles Causas del Timeout

### 1. **Configuración incorrecta en Nginx Proxy Manager**
- El proxy manager no está redirigiendo correctamente a `http://[IP_SERVIDOR]:80`
- Falta configuración de headers de proxy
- Timeout insuficiente en Nginx Proxy Manager

### 2. **Problemas de red entre servidores**
- Firewall bloqueando conexiones entre servidores
- Latencia alta entre Nginx Proxy Manager y servidor de aplicación
- DNS interno no resolviendo correctamente

### 3. **Configuración de timeouts**
- Frontend: 10 segundos
- Nginx local: 30 segundos (proxy_read_timeout)
- Nginx Proxy Manager: posiblemente menor

## 🛠️ Soluciones Recomendadas

### 1. **Verificar configuración en Nginx Proxy Manager**

```nginx
# Configuración recomendada para Nginx Proxy Manager
proxy_pass http://[IP_SERVIDOR_APP]:80;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;

# Timeouts aumentados
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

### 2. **Aumentar timeout en frontend**

**Archivo:** `frontend/src/utils/api.js`
```javascript
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 30000, // Aumentar a 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 3. **Configuración de health check**

Crear endpoint específico para Nginx Proxy Manager:

```javascript
// En server.js
app.get('/health-check', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'tractoreando-backend'
  });
});
```

### 4. **Verificaciones de conectividad**

**Desde servidor Nginx Proxy Manager:**
```bash
# Verificar conectividad al servidor de aplicación
curl -v http://[IP_SERVIDOR_APP]:80/health
curl -v http://[IP_SERVIDOR_APP]:80/api/health

# Verificar resolución DNS
nslookup [IP_SERVIDOR_APP]

# Verificar latencia
ping [IP_SERVIDOR_APP]
```

**Desde servidor de aplicación:**
```bash
# Verificar que nginx esté escuchando
netstat -tlnp | grep :80

# Verificar logs de nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 📋 Checklist de Verificación

- [ ] Nginx Proxy Manager apunta a `http://[IP_SERVIDOR]:80`
- [ ] Headers de proxy configurados correctamente
- [ ] Timeouts aumentados en Nginx Proxy Manager (60s+)
- [ ] Firewall permite tráfico entre servidores
- [ ] DNS interno resuelve correctamente
- [ ] Certificados SSL configurados en Nginx Proxy Manager
- [ ] CORS configurado para el dominio correcto
- [ ] Backend responde en puerto 3002
- [ ] Nginx local proxy funciona correctamente

## 🔍 Comandos de Diagnóstico

### En servidor de aplicación:
```bash
# Verificar servicios
pm2 status
nginx -t
lsof -i :80
lsof -i :3002

# Verificar logs
pm2 logs tractoreando-backend --lines 50
tail -f /var/log/nginx/error.log

# Test de conectividad
curl -v http://localhost:3002/api/health
curl -v http://localhost/api/health
```

### En servidor Nginx Proxy Manager:
```bash
# Test de conectividad al servidor de app
curl -v http://[IP_SERVIDOR_APP]:80/api/health
telnet [IP_SERVIDOR_APP] 80

# Verificar configuración
nginx -t
tail -f /var/log/nginx/error.log
```

## 📞 Información de Contacto para Soporte

**Puertos configurados:**
- Backend: 3002
- Nginx local: 80
- Nginx Proxy Manager: 443 (HTTPS) → 80 (HTTP interno)

**URLs:**
- Producción: https://tractoreando.softreria.com
- API: https://tractoreando.softreria.com/api
- Health check: https://tractoreando.softreria.com/api/health