# 🚛 Tractoreando - Sistema de Gestión de Transporte

## 📖 Descripción

Tractoreando es un sistema integral de gestión para empresas de transporte y logística que permite administrar vehículos, mantenimientos, usuarios y generar reportes detallados.

## ✨ Características Principales

- 🏢 **Multi-empresa**: Gestión de múltiples empresas desde una sola instalación
- 🚛 **Gestión de Vehículos**: Control completo del parque vehicular
- 🔧 **Mantenimiento**: Programación y seguimiento de mantenimientos
- 📊 **Reportes**: Informes detallados y análisis de datos
- 👥 **Gestión de Usuarios**: Control de acceso y permisos granulares
- 🗄️ **Base de Datos**: PostgreSQL para mejor rendimiento y escalabilidad

## 🛠️ Tecnologías

- **Backend**: Node.js, Express.js, PostgreSQL, Sequelize
- **Frontend**: React, Material-UI
- **Gestión de Procesos**: PM2
- **Servidor Web**: Nginx

## 🚀 Instalación en Producción

### Prerrequisitos

- Ubuntu/Debian Linux (Servidor de Producción)
- Acceso sudo
- Conexión a internet
- PostgreSQL (se instala automáticamente)

### Comandos de Instalación

```bash
# 1. Clonar repositorio
git clone <repository-url>
cd tractoreando

# 2. Ejecutar instalación automática para PRODUCCIÓN
./install.sh

# 4. Verificar instalación
pm2 status
pm2 logs tractoreando-backend

# 5. Crear usuario administrador (si no se creó automáticamente)
node create-admin-production.js
```

### Credenciales por Defecto

- **Email**: admin@tractoreando.com
- **Contraseña**: Admin123!
- **⚠️ IMPORTANTE**: Cambiar la contraseña después del primer acceso

## 📋 Scripts Disponibles

```bash
# Instalación completa del sistema (PRODUCCIÓN)
./install.sh

# Reparar problemas de autenticación PostgreSQL
./fix-postgresql-auth.sh

# Actualización simplificada
./update.sh

# Crear usuario administrador para PRODUCCIÓN
node create-admin-production.js

# Scripts alternativos de administrador
node init-admin.js
node limpiar-y-crear-admin.js
```

## 🔧 Comandos de Gestión

```bash
# Ver estado de la aplicación
pm2 status

# Ver logs
pm2 logs tractoreando-backend

# Reiniciar aplicación
pm2 restart tractoreando-backend

# Health check
curl http://localhost:8000/api/health
```

## 🛠️ Solución de Problemas

### Error de Autenticación PostgreSQL

Si encuentras el error `password authentication failed for user "tractoreando_user"`, ejecuta:

```bash
# Reparación automática
./fix-postgresql-auth.sh

# O manualmente:
sudo -u postgres psql -c "DROP USER IF EXISTS tractoreando_user;"
sudo -u postgres psql -c "CREATE USER tractoreando_user WITH PASSWORD 'tractoreando123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE tractoreando TO tractoreando_user;"
sudo systemctl restart postgresql

# Verificar conexión
PGPASSWORD='tractoreando123' psql -h localhost -U tractoreando_user -d tractoreando -c "SELECT 1;"
```

### Otros Problemas Comunes

```bash
# Verificar estado de PostgreSQL
sudo systemctl status postgresql

# Verificar logs de PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*-main.log

# Verificar usuarios de PostgreSQL
sudo -u postgres psql -c "\du"

# Verificar bases de datos
sudo -u postgres psql -c "\l"
```

## 🌐 Acceso en Producción

- **Frontend**: http://localhost:8080
- **API**: http://localhost:8000/api
- **Health Check**: http://localhost:8000/api/health

## 📚 Documentación Adicional

- **Actualización en Producción**: Ver `GUIA-ACTUALIZACION-PRODUCCION.md`
- **Despliegue Completo**: Ver `DOCUMENTACION-DESPLIEGUE-PRODUCCION.md`

## 🔐 Configuración de Seguridad

### Variables de Entorno Críticas

```bash
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tractoreando
DB_USER=tractoreando_user
DB_PASSWORD=secure_password

# Seguridad
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# Aplicación
NODE_ENV=production
PORT=8000
CORS_ORIGIN=http://localhost:8080
```

## 🚨 Solución de Problemas

### Problemas Comunes

1. **Error de conexión PostgreSQL**
   ```bash
   sudo systemctl status postgresql
   sudo systemctl start postgresql
   ```

3. **Error 502 Bad Gateway**
   ```bash
   pm2 restart tractoreando-backend
   sudo systemctl restart nginx
   ```

4. **Problemas de permisos**
   ```bash
   sudo chown -R $USER:$USER /path/to/tractoreando
   ```

## 📞 Soporte

Para soporte técnico, consulte la documentación completa o contacte al equipo de desarrollo.

---

**Sistema Tractoreando - Optimizado para PostgreSQL** 🚛✨