# Guía de Configuración de Nginx para Tractoreando

## Problema Resuelto

Se corrigió el error:
```
[emerg] "events" directive is not allowed here in /etc/nginx/sites-enabled/tractoreando:5
nginx: configuration file /etc/nginx/nginx.conf test failed
```

## Archivos de Configuración Disponibles

### 1. `nginx-standalone.conf`
**Uso**: Configuración completa de Nginx para servidor independiente
- ✅ Contiene directivas `events` y `http` (correcto)
- ✅ Se usa como archivo principal de nginx.conf
- ✅ Incluye configuración completa del servidor

**Cómo usar**:
```bash
# Reemplazar el nginx.conf principal
sudo cp nginx-standalone.conf /opt/homebrew/etc/nginx/nginx.conf
sudo nginx -t
sudo nginx -s reload
```

### 2. `nginx-production.conf`
**Uso**: Solo bloque server para sites-enabled
- ✅ NO contiene directivas `events` ni `http` (corregido)
- ✅ Se usa en /etc/nginx/sites-enabled/
- ✅ Solo contiene configuración del bloque server

**Cómo usar**:
```bash
# Copiar a sites-enabled
sudo cp nginx-production.conf /etc/nginx/sites-enabled/tractoreando
sudo nginx -t
sudo nginx -s reload
```

### 3. `nginx-proxy-manager.conf`
**Uso**: Solo bloque server para Nginx Proxy Manager
- ✅ NO contiene directivas `events` ni `http` (corregido)
- ✅ Se usa como configuración de sitio específico
- ✅ Optimizado para trabajar detrás de proxy manager

**Cómo usar**:
```bash
# Copiar a sites-enabled o usar directamente
sudo cp nginx-proxy-manager.conf /etc/nginx/sites-enabled/tractoreando
sudo nginx -t
sudo nginx -s reload
```

## Estructura Correcta de Archivos Nginx

### Archivo Principal (nginx.conf)
```nginx
# Directivas globales
events {
    worker_connections 1024;
}

http {
    # Configuración HTTP global
    include /etc/nginx/mime.types;
    
    # Incluir sitios
    include /etc/nginx/sites-enabled/*;
}
```

### Archivo de Sitio (sites-enabled/)
```nginx
# Solo bloques server
server {
    listen 80;
    server_name example.com;
    # Configuración del servidor
}
```

## Scripts de Deployment Actualizados

Los scripts de deployment han sido actualizados para usar los archivos correctos:

- `deploy-production.sh`: Usa `nginx-production.conf`
- `deploy-proxy-manager.sh`: Usa `nginx-proxy-manager.conf`
- `instalacion-completa.sh`: Detecta automáticamente el tipo de instalación

## Verificación de Configuración

Antes de aplicar cualquier configuración:

```bash
# Verificar sintaxis
sudo nginx -t

# Si hay errores, revisar logs
sudo tail -f /var/log/nginx/error.log

# Recargar configuración
sudo nginx -s reload
```

## Solución de Problemas Comunes

### Error: "events directive is not allowed here"
**Causa**: Archivo con directivas `events`/`http` colocado en sites-enabled
**Solución**: Usar archivo sin estas directivas o mover a nginx.conf principal

### Error: "upstream directive is not allowed here"
**Causa**: Directiva `upstream` fuera del bloque `http`
**Solución**: Mover `upstream` dentro del bloque `http` en nginx.conf

### Error: "server directive is not allowed here"
**Causa**: Bloque `server` fuera del bloque `http`
**Solución**: Asegurar que `server` esté dentro de `http`

## Recomendaciones

1. **Para desarrollo local**: Usar `nginx-standalone.conf`
2. **Para producción con sites-enabled**: Usar `nginx-production.conf`
3. **Para Nginx Proxy Manager**: Usar `nginx-proxy-manager.conf`
4. **Siempre verificar**: `sudo nginx -t` antes de recargar
5. **Backup**: Hacer respaldo de configuraciones antes de cambios

## Logs y Monitoreo

```bash
# Ver logs de acceso
tail -f /opt/homebrew/var/log/nginx/tractoreando_access.log

# Ver logs de error
tail -f /opt/homebrew/var/log/nginx/tractoreando_error.log

# Estado de nginx
sudo nginx -s status
```