# 🔄 Guía de Migración de MongoDB a PostgreSQL en Producción

## 🎯 Resumen de la Migración

Esta guía detalla el proceso completo para migrar el sistema Tractoreando desde MongoDB hacia PostgreSQL en un entorno de producción, minimizando el tiempo de inactividad y garantizando la integridad de los datos.

## ⚠️ Consideraciones Importantes

### Antes de Comenzar

- **Tiempo estimado:** 2-4 horas (dependiendo del volumen de datos)
- **Downtime estimado:** 15-30 minutos
- **Requisitos:** Acceso root al servidor, backup completo de MongoDB
- **Recomendación:** Realizar en horario de menor actividad

### Cambios Principales

1. **Base de Datos:** MongoDB → PostgreSQL
2. **ORM:** Mongoose → Sequelize
3. **Estructura:** Documentos → Tablas relacionales
4. **Configuración:** Variables de entorno actualizadas
5. **Scripts:** Nuevos scripts de inicialización y migración

## 📋 Pre-requisitos

### 1. Verificar Versión Actual

```bash
# Verificar versión de Node.js
node --version  # Debe ser >= 18.0.0

# Verificar MongoDB
mongo --version

# Verificar datos actuales
mongo tractoreando_prod --eval "db.users.count()"
mongo tractoreando_prod --eval "db.companies.count()"
mongo tractoreando_prod --eval "db.vehicles.count()"
```

### 2. Instalar PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb

# Iniciar PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. Crear Backup Completo

```bash
# Crear directorio de backup
sudo mkdir -p /opt/backups/migration_$(date +%Y%m%d)
cd /opt/backups/migration_$(date +%Y%m%d)

# Backup de MongoDB
mongodump --db tractoreando_prod --out ./mongodb_backup

# Backup de archivos de aplicación
tar -czf app_backup.tar.gz /path/to/tractoreando/

# Backup de configuración de Nginx
sudo cp -r /etc/nginx/sites-available ./nginx_backup
```

## 🚀 Proceso de Migración

### Fase 1: Preparación del Entorno

#### 1.1 Configurar PostgreSQL

```bash
# Acceder a PostgreSQL
sudo -u postgres psql

# Crear base de datos y usuario
CREATE DATABASE tractoreando_prod;
CREATE USER tractoreando_user WITH ENCRYPTED PASSWORD 'SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE tractoreando_prod TO tractoreando_user;
ALTER USER tractoreando_user CREATEDB;
\q
```

#### 1.2 Configurar Variables de Entorno

```bash
# Navegar al directorio del proyecto
cd /path/to/tractoreando

# Backup de configuración actual
cp .env .env.mongodb.backup
cp frontend/.env frontend/.env.mongodb.backup

# Configurar nuevas variables
cp .env.production .env
cp frontend/.env.production frontend/.env.production
```

**Editar `.env` con las nuevas configuraciones:**

```env
# Base de datos PostgreSQL
DB_TYPE=postgres
DB_NAME=tractoreando_prod
DB_USER=tractoreando_user
DB_PASSWORD=SECURE_PASSWORD_HERE
DB_HOST=localhost
DB_PORT=5432
DB_SSL=false

# Configuraciones de seguridad (CAMBIAR ESTOS VALORES)
JWT_SECRET=SECURE_JWT_SECRET_MINIMUM_32_CHARS
SESSION_SECRET=SECURE_SESSION_SECRET_MINIMUM_32_CHARS
DEFAULT_ADMIN_PASSWORD=SECURE_ADMIN_PASSWORD
```

### Fase 2: Actualización del Código

#### 2.1 Actualizar Repositorio

```bash
# Detener aplicación actual
pm2 stop tractoreando-backend

# Actualizar código
git fetch origin
git checkout main
git pull origin main
```

#### 2.2 Instalar Nuevas Dependencias

```bash
# Instalar dependencias del backend
npm install

# Instalar dependencias del frontend
cd frontend
npm install
cd ..
```

### Fase 3: Migración de Datos

#### 3.1 Ejecutar Script de Migración

```bash
# Verificar que MongoDB esté ejecutándose
sudo systemctl status mongod

# Ejecutar migración
node migrate-data.js
```

**El script realizará:**
- Conexión a MongoDB y PostgreSQL
- Migración de usuarios con hash de contraseñas
- Migración de empresas y sucursales
- Migración de vehículos con relaciones
- Migración de mantenimientos
- Verificación de integridad de datos

#### 3.2 Verificar Migración

```bash
# Verificar datos migrados
psql -U tractoreando_user -d tractoreando_prod -c "SELECT COUNT(*) FROM \"Users\";"
psql -U tractoreando_user -d tractoreando_prod -c "SELECT COUNT(*) FROM \"Companies\";"
psql -U tractoreando_user -d tractoreando_prod -c "SELECT COUNT(*) FROM \"Vehicles\";"
psql -U tractoreando_user -d tractoreando_prod -c "SELECT COUNT(*) FROM \"Maintenances\";"

# Verificar relaciones
psql -U tractoreando_user -d tractoreando_prod -c "SELECT c.name, COUNT(v.id) as vehicles FROM \"Companies\" c LEFT JOIN \"Vehicles\" v ON c.id = v.\"companyId\" GROUP BY c.id, c.name;"
```

### Fase 4: Actualización de la Aplicación

#### 4.1 Build del Frontend

```bash
# Build optimizado
npm run build:optimized
```

#### 4.2 Inicializar Usuario Administrador

```bash
# Crear usuario administrador
node init-admin.js
```

#### 4.3 Iniciar Aplicación

```bash
# Iniciar con PM2
pm2 start ecosystem.config.js --env production

# Verificar estado
pm2 status
pm2 logs tractoreando-backend
```

### Fase 5: Verificación y Pruebas

#### 5.1 Verificar Funcionalidad

```bash
# Verificar API
curl http://localhost:8000/api/health

# Verificar autenticación
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tractoreando.com","password":"tu_password_admin"}'
```

#### 5.2 Pruebas de Funcionalidad

1. **Login de administrador**
2. **Creación de empresa**
3. **Registro de vehículo**
4. **Programación de mantenimiento**
5. **Generación de reportes**

#### 5.3 Verificar Logs

```bash
# Logs de la aplicación
pm2 logs tractoreando-backend --lines 50

# Logs de PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## 🔧 Configuración Post-Migración

### 1. Optimizar PostgreSQL

```bash
# Editar configuración de PostgreSQL
sudo vim /etc/postgresql/*/main/postgresql.conf
```

**Configuraciones recomendadas:**

```conf
# Memoria
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB

# Conexiones
max_connections = 100

# Logging
log_statement = 'mod'
log_min_duration_statement = 1000
```

### 2. Configurar Backup Automático

```bash
# Crear script de backup
cat > /opt/tractoreando/backup-postgresql.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

# Backup de PostgreSQL
pg_dump -U tractoreando_user -h localhost tractoreando_prod > $BACKUP_DIR/tractoreando_$DATE.sql

# Comprimir backup
gzip $BACKUP_DIR/tractoreando_$DATE.sql

# Eliminar backups antiguos (más de 7 días)
find $BACKUP_DIR -name "tractoreando_*.sql.gz" -mtime +7 -delete

echo "Backup completado: tractoreando_$DATE.sql.gz"
EOF

# Hacer ejecutable
chmod +x /opt/tractoreando/backup-postgresql.sh

# Programar backup diario
echo "0 2 * * * /opt/tractoreando/backup-postgresql.sh" | crontab -
```

### 3. Monitoreo

```bash
# Instalar herramientas de monitoreo
sudo apt install htop iotop

# Configurar alertas básicas
echo '#!/bin/bash
DISK_USAGE=$(df / | grep -vE "^Filesystem" | awk "{print \$5}" | sed "s/%//")
if [ "$DISK_USAGE" -gt 80 ]; then
  echo "ALERTA: Uso de disco al $DISK_USAGE%" | mail -s "Alerta Servidor" admin@tudominio.com
fi' > /opt/tractoreando/check-disk.sh

chmod +x /opt/tractoreando/check-disk.sh
echo "*/15 * * * * /opt/tractoreando/check-disk.sh" | crontab -
```

## 🚨 Solución de Problemas

### Error de Conexión a PostgreSQL

```bash
# Verificar estado
sudo systemctl status postgresql

# Verificar configuración
sudo -u postgres psql -c "SELECT version();"

# Verificar permisos
sudo -u postgres psql -c "\du"

# Reiniciar si es necesario
sudo systemctl restart postgresql
```

### Error en Migración de Datos

```bash
# Verificar logs de migración
cat migration.log

# Verificar conexiones
node -e "const { sequelize } = require('./config/database'); sequelize.authenticate().then(() => console.log('PostgreSQL OK')).catch(err => console.error('Error:', err));"

# Re-ejecutar migración específica
node migrate-data.js --table=users
```

### Aplicación No Inicia

```bash
# Verificar logs detallados
pm2 logs tractoreando-backend --err

# Verificar variables de entorno
node -e "console.log(process.env.DB_NAME, process.env.DB_USER);"

# Probar conexión manual
psql -U tractoreando_user -d tractoreando_prod -c "SELECT 1;"
```

## 🔄 Plan de Rollback

### Si la Migración Falla

```bash
# 1. Detener nueva aplicación
pm2 stop tractoreando-backend

# 2. Restaurar código anterior
git checkout mongodb-version  # o el commit anterior

# 3. Restaurar configuración
cp .env.mongodb.backup .env
cp frontend/.env.mongodb.backup frontend/.env

# 4. Reinstalar dependencias anteriores
npm install
cd frontend && npm install && cd ..

# 5. Iniciar MongoDB
sudo systemctl start mongod

# 6. Restaurar datos si es necesario
mongorestore --db tractoreando_prod ./mongodb_backup/tractoreando_prod/

# 7. Iniciar aplicación
pm2 start ecosystem.config.js
```

## ✅ Checklist de Migración

### Pre-migración
- [ ] Backup completo de MongoDB
- [ ] Backup de archivos de aplicación
- [ ] PostgreSQL instalado y configurado
- [ ] Variables de entorno preparadas
- [ ] Notificación a usuarios sobre mantenimiento

### Durante la migración
- [ ] Aplicación detenida
- [ ] Código actualizado
- [ ] Dependencias instaladas
- [ ] Migración de datos ejecutada
- [ ] Datos verificados
- [ ] Frontend construido
- [ ] Usuario admin creado

### Post-migración
- [ ] Aplicación iniciada correctamente
- [ ] API respondiendo
- [ ] Login funcionando
- [ ] Funcionalidades principales probadas
- [ ] Logs sin errores
- [ ] Backup automático configurado
- [ ] Monitoreo activo
- [ ] Documentación actualizada

## 📊 Comparativa de Rendimiento

### Antes (MongoDB)
- Consultas complejas: Lentas
- Relaciones: Limitadas
- Transacciones: No ACID
- Escalabilidad: Horizontal
- Backup: mongodump

### Después (PostgreSQL)
- Consultas complejas: Optimizadas
- Relaciones: Nativas y eficientes
- Transacciones: ACID completas
- Escalabilidad: Vertical y horizontal
- Backup: pg_dump + herramientas avanzadas

## 📞 Soporte Post-Migración

Para soporte después de la migración:

- **Logs de aplicación:** `pm2 logs tractoreando-backend`
- **Logs de PostgreSQL:** `/var/log/postgresql/`
- **Estado del sistema:** `pm2 monit`
- **Documentación:** [DOCUMENTACION-DESPLIEGUE-PRODUCCION.md](./DOCUMENTACION-DESPLIEGUE-PRODUCCION.md)

---

*Migración completada exitosamente. Sistema optimizado y listo para producción.*