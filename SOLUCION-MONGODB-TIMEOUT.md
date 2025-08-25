# 🚨 Solución: Error de Timeout en MongoDB (Producción)

## 🐛 **Problema Identificado**

```
❌ Error cargando datos: MongooseError: Operation `maintenances.deleteMany()` buffering timed out after 10000ms
```

### 🔍 **Causa del Error**
- **Timeout de operaciones:** MongoDB no responde dentro del tiempo límite (10 segundos)
- **Operaciones masivas:** `deleteMany()` en colecciones grandes puede ser lenta
- **Configuración de conexión:** Timeouts muy cortos para entorno de producción
- **Recursos del servidor:** Posible falta de memoria o CPU

---

## 🚀 **Solución Rápida (Recomendada)**

### **⚡ Solución Automática (Recomendada)**
Este script detecta automáticamente el problema y aplica la solución correspondiente:

```bash
# Como root en el servidor
sudo ./fix-mongodb-quick.sh
```

### **🔧 Soluciones Manuales**

#### **Opción A: Problema de Conexión (ECONNREFUSED)**
Si ves el error `connect ECONNREFUSED ::1:27017`, MongoDB no está ejecutándose:

```bash
# Como root en el servidor
sudo ./fix-mongodb-connection.sh
```

#### **Opción B: Problema de Timeout (MongoDB funcionando)**
Si MongoDB está ejecutándose pero hay timeouts:

##### **Paso 1: Diagnóstico**
```bash
# Subir script de diagnóstico
scp diagnose-mongodb-production.js root@tu-servidor:/opt/tractoreando/

# Ejecutar diagnóstico
ssh root@tu-servidor
cd /opt/tractoreando
node diagnose-mongodb-production.js
```

##### **Paso 2: Corrección de Timeouts**
```bash
# Subir script de corrección
scp fix-mongodb-timeout.js root@tu-servidor:/opt/tractoreando/

# Ejecutar corrección
node fix-mongodb-timeout.js
```

##### **Paso 3: Cargar Datos Optimizado**
```bash
# Subir script optimizado
scp load-data-production.js root@tu-servidor:/opt/tractoreando/

# Cargar datos con configuración optimizada
node load-data-production.js
```

---

## 🛠️ **Solución Manual Detallada**

### **1. Verificar Estado de MongoDB**
```bash
# Verificar si MongoDB está ejecutándose
sudo systemctl status mongodb

# Si no está activo, iniciarlo
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Verificar logs
sudo journalctl -u mongodb -f
```

### **2. Verificar Recursos del Sistema**
```bash
# Verificar memoria disponible
free -h

# Verificar espacio en disco
df -h

# Verificar CPU
top
```

### **3. Optimizar Configuración de MongoDB**
```bash
# Editar configuración de MongoDB
sudo nano /etc/mongod.conf

# Verificar estas configuraciones:
# net:
#   port: 27017
#   bindIp: 127.0.0.1
# 
# storage:
#   dbPath: /var/lib/mongodb
#   journal:
#     enabled: true

# Reiniciar después de cambios
sudo systemctl restart mongodb
```

### **4. Limpiar Datos Problemáticos**
```bash
# Conectar a MongoDB directamente
mongo tractoreando_prod

# Eliminar colecciones problemáticas
db.maintenances.drop()
db.vehicles.drop()
db.users.deleteMany({role: {$ne: "super_admin"}})
db.branches.drop()
db.companies.drop()

# Salir
exit
```

### **5. Usar Script de Carga Optimizado**
```bash
# En lugar de load-spanish-data.js, usar:
node load-data-production.js
```

---

## 📋 **Scripts Creados para la Solución**

### **1. `fix-mongodb-quick.sh`** ⚡ **NUEVO**
- ✅ Detecta automáticamente el tipo de problema (instalación, servicio, conexión, timeout)
- ✅ Aplica la solución correspondiente automáticamente
- ✅ Prueba la carga de datos después de la corrección
- ✅ Proporciona resumen completo de la solución aplicada
- ✅ Incluye comandos útiles para administración futura

### **2. `fix-mongodb-connection.sh`**
- ✅ Diagnostica e instala MongoDB cuando no está ejecutándose
- ✅ Instala MongoDB automáticamente (Ubuntu/Debian y CentOS/RHEL)
- ✅ Configura MongoDB con ajustes optimizados
- ✅ Inicia y habilita el servicio MongoDB
- ✅ Prueba la conexión después de la configuración

### **3. `diagnose-mongodb-production.js`**
- ✅ Verifica estado de MongoDB
- ✅ Prueba conexión con timeouts optimizados
- ✅ Revisa recursos del sistema
- ✅ Analiza logs de errores
- ✅ Genera reporte de soluciones

### **4. `fix-mongodb-timeout.js`**
- ✅ Configura timeouts más largos (30-60 segundos)
- ✅ Limpia datos con reintentos automáticos
- ✅ Optimiza índices de base de datos
- ✅ Maneja errores de conexión

### **5. `load-data-production.js`**
- ✅ Carga datos en lotes pequeños
- ✅ Configuración optimizada para producción
- ✅ Manejo de errores robusto
- ✅ Crea solo datos esenciales
- ✅ Verifica datos existentes antes de crear

---

## 🔧 **Comandos de Verificación**

### **Verificar Estado de la Aplicación**
```bash
# Estado de PM2
su - tractoreando -c "pm2 list"

# Logs de la aplicación
su - tractoreando -c "pm2 logs tractoreando"

# Estado de MongoDB
sudo systemctl status mongodb

# Conexión a la base de datos
mongo tractoreando_prod --eval "db.stats()"
```

### **Verificar Datos Cargados**
```bash
# Contar documentos en cada colección
mongo tractoreando_prod --eval "
  print('Empresas:', db.companies.count());
  print('Sucursales:', db.branches.count());
  print('Usuarios:', db.users.count());
  print('Vehículos:', db.vehicles.count());
  print('Mantenimientos:', db.maintenances.count());
"
```

---

## ⚠️ **Prevención de Problemas Futuros**

### **1. Configuración de Timeouts**
```javascript
// En tu aplicación, usar siempre:
const mongoOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  bufferMaxEntries: 0,
  maxPoolSize: 10
};
```

### **2. Operaciones en Lotes**
```javascript
// Para operaciones masivas, usar lotes:
for (let i = 0; i < data.length; i += 100) {
  const batch = data.slice(i, i + 100);
  await Model.insertMany(batch);
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

### **3. Monitoreo Regular**
```bash
# Crear script de monitoreo
echo '#!/bin/bash
echo "=== MongoDB Status ==="
sudo systemctl status mongodb
echo "\n=== Disk Space ==="
df -h
echo "\n=== Memory ==="
free -h
echo "\n=== Database Stats ==="
mongo tractoreando_prod --eval "db.stats()"' > /opt/tractoreando/monitor.sh

chmod +x /opt/tractoreando/monitor.sh

# Ejecutar cada hora
echo "0 * * * * /opt/tractoreando/monitor.sh >> /var/log/tractoreando-monitor.log" | crontab -
```

---

## 🆘 **Solución de Emergencia**

Si los scripts anteriores no funcionan:

### Paso 1: Verificar/Instalar MongoDB
```bash
# Usar el script de conexión como primera opción
sudo ./fix-mongodb-connection.sh
```

### Paso 2: Comandos manuales si el script falla
```bash
# 1. Verificar si MongoDB está instalado
which mongod

# 2. Verificar estado del servicio
sudo systemctl status mongod

# 3. Reiniciar MongoDB
sudo systemctl restart mongod

# 4. Verificar logs
sudo tail -f /var/log/mongodb/mongod.log

# 5. Verificar espacio en disco
df -h

# 6. Verificar memoria
free -h

# 7. Verificar puerto (usar el comando disponible)
sudo ss -tuln | grep 27017
# O alternativamente:
sudo lsof -i :27017
# O si tienes netstat:
sudo netstat -tuln | grep 27017
```

### Paso 3: Prueba de conexión manual
```bash
# Probar conexión básica
node -e "
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/tractoreando', {
  serverSelectionTimeoutMS: 60000,
  socketTimeoutMS: 60000
}).then(() => {
  console.log('✅ Conectado a MongoDB');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
"
```

### Paso 4: Si todo falla, reiniciar completamente
```bash
# 1. Parar aplicación
su - tractoreando -c "pm2 stop all"

# 2. Reiniciar MongoDB
sudo systemctl restart mongodb

# 3. Limpiar base de datos
mongo tractoreando_prod --eval "db.dropDatabase()"

# 4. Cargar datos básicos
node load-data-production.js

# 5. Reiniciar aplicación
su - tractoreando -c "pm2 start ecosystem.config.js"
```

---

## 📞 **Contacto y Soporte**

Si persisten los problemas:

1. **Revisar logs detallados:**
   ```bash
   sudo journalctl -u mongodb -n 100
   su - tractoreando -c "pm2 logs tractoreando --lines 100"
   ```

2. **Verificar configuración del servidor:**
   - Memoria RAM disponible (mínimo 2GB recomendado)
   - Espacio en disco (mínimo 10GB libre)
   - CPU no saturada

3. **Considerar optimización de MongoDB:**
   - Configurar índices apropiados
   - Ajustar configuración de memoria
   - Implementar sharding si es necesario

---

## ✅ **Checklist de Verificación**

- [ ] MongoDB está ejecutándose
- [ ] Puerto 27017 está abierto
- [ ] Hay suficiente memoria RAM (>2GB)
- [ ] Hay suficiente espacio en disco (>10GB)
- [ ] Variables de entorno están configuradas
- [ ] Scripts de corrección ejecutados
- [ ] Datos básicos cargados correctamente
- [ ] Aplicación reiniciada
- [ ] Login funciona correctamente

**¡Problema resuelto!** 🎉