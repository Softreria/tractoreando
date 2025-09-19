# 🛠️ Solución de Errores 500 - Tractoreando

## 🔍 Problemas Identificados y Solucionados

### 1. **PROBLEMA CRÍTICO: Usuario de PostgreSQL**
**Error:** `role "tractoreando_user" does not exist`

**Solución:**
```bash
# Ejecutar como usuario postgres
sudo -u postgres psql -f fix-database-production.sql
```

### 2. **Problemas en el Código**

#### A. **Referencias Incorrectas a Modelos**
**Problema:** Mezcla de sintaxis MongoDB y PostgreSQL
**Solución:** Corregidas todas las importaciones de modelos

#### B. **Errores en Middleware de Autenticación**
**Problema:** Referencias a modelos inexistentes
**Solución:** Importaciones corregidas en `middleware/auth.js`

#### C. **Problemas en Rutas**
**Problema:** Llamadas a métodos de MongoDB en código Sequelize
**Solución:** Corregidas todas las rutas principales

## 🚀 Pasos para Aplicar las Correcciones

### 1. **Arreglar Base de Datos**
```bash
# Ejecutar el script SQL
sudo -u postgres psql -f fix-database-production.sql
```

### 2. **Aplicar Correcciones de Código**
Los siguientes archivos han sido corregidos:
- ✅ `routes/companies.js`
- ✅ `routes/vehicles.js` 
- ✅ `routes/maintenance.js`
- ✅ `routes/auth.js`
- ✅ `middleware/auth.js`
- ✅ `server.js`

### 3. **Reinstalar y Configurar**
```bash
# Usar el script de instalación corregido
./setup-production-fixed.sh
```

### 4. **Verificar Estado**
```bash
# Verificar que todo funciona
node check-app-status.js
```

## 🔧 Comandos de Diagnóstico

### Verificar Base de Datos
```bash
# Conectar a PostgreSQL
sudo -u postgres psql

# Verificar usuario
\du tractoreando_user

# Verificar base de datos
\l tractoreando

# Conectar a la base de datos
\c tractoreando

# Verificar tablas
\dt
```

### Verificar Servidor
```bash
# Ver logs en tiempo real
pm2 logs tractoreando

# Estado de PM2
pm2 status

# Reiniciar aplicación
pm2 restart tractoreando

# Ver logs del sistema
tail -f logs/combined.log
```

### Verificar API
```bash
# Probar endpoint de salud
curl http://localhost:3000/health-check

# Probar API
curl http://localhost:3000/api/health

# Probar desde el dominio
curl https://tractoreando.softreria.com/api/health
```

## 🚨 Errores Comunes y Soluciones

### Error: "Cannot read property of undefined"
**Causa:** Referencias a modelos incorrectas
**Solución:** Verificar importaciones en el archivo afectado

### Error: "Connection refused"
**Causa:** Servidor no está ejecutándose
**Solución:** 
```bash
pm2 start ecosystem.config.js --env production
```

### Error: "role does not exist"
**Causa:** Usuario de PostgreSQL no creado
**Solución:** Ejecutar `fix-database-production.sql`

### Error: "Cannot find module"
**Causa:** Dependencias no instaladas
**Solución:**
```bash
npm install --production
cd frontend && npm install --production
```

## 📋 Lista de Verificación Post-Corrección

- [ ] Base de datos PostgreSQL configurada
- [ ] Usuario `tractoreando_user` creado
- [ ] Dependencias instaladas (backend y frontend)
- [ ] Frontend construido para producción
- [ ] PM2 configurado y ejecutándose
- [ ] Nginx configurado (si aplica)
- [ ] SSL configurado (si aplica)
- [ ] Variables de entorno correctas
- [ ] Logs funcionando
- [ ] API respondiendo correctamente

## 🔄 Proceso de Actualización Futuro

1. **Hacer backup de la base de datos**
2. **Detener la aplicación**
3. **Aplicar cambios de código**
4. **Ejecutar migraciones si es necesario**
5. **Reconstruir frontend**
6. **Reiniciar aplicación**
7. **Verificar funcionamiento**

## 📞 Contacto de Soporte

Si persisten los problemas después de aplicar estas correcciones:

1. Ejecutar `node check-app-status.js`
2. Revisar logs: `pm2 logs tractoreando`
3. Verificar configuración de Nginx
4. Comprobar certificados SSL

---

**Fecha de creación:** $(date)
**Versión:** 1.0
**Estado:** Correcciones aplicadas ✅