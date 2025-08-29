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

# 2. (Opcional) Limpiar repositorios MongoDB si hay errores
./clean-mongodb-repos.sh

# 3. Ejecutar instalación automática para PRODUCCIÓN
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

# Limpiar repositorios MongoDB (si es necesario)
./clean-mongodb-repos.sh

# Actualización simplificada
./update.sh

# Crear usuario administrador para PRODUCCIÓN
node create-admin-production.js

# Migración de datos MongoDB a PostgreSQL
node migrate-data.js

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

## 🌐 Acceso en Producción

- **Frontend**: http://localhost:8080
- **API**: http://localhost:8000/api
- **Health Check**: http://localhost:8000/api/health

## 📚 Documentación Adicional

- **Migración MongoDB → PostgreSQL**: Ver `GUIA-MIGRACION-MONGODB-POSTGRESQL.md`
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

1. **Error de repositorios MongoDB**
   ```bash
   # Si aparecen errores como "404 Not Found [IP: 52.222.132.70 443]"
   # relacionados con repo.mongodb.org, ejecutar:
   ./clean-mongodb-repos.sh
   
   # Luego continuar con la instalación
   ./install.sh
   ```

2. **Error de conexión PostgreSQL**
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