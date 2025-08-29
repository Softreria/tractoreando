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

## 🚀 Instalación Rápida

### Prerrequisitos

- Node.js 18+
- PostgreSQL 12+
- PM2
- Nginx

### Instalación

```bash
# 1. Clonar repositorio
git clone <repository-url>
cd tractoreando

# 2. Instalar dependencias
npm install
cd frontend && npm install && cd ..

# 3. Configurar PostgreSQL
sudo -u postgres createdb tractoreando
sudo -u postgres createuser tractoreando_user

# 4. Configurar variables de entorno
cp .env.production .env
# Editar .env con tus configuraciones

# 5. Ejecutar migraciones
npx sequelize-cli db:migrate

# 6. Crear usuario administrador
node init-admin.js

# 7. Construir frontend
cd frontend && npm run build:prod && cd ..

# 8. Iniciar aplicación
pm2 start ecosystem.config.js --env production
```

## 📋 Scripts Disponibles

```bash
# Instalación completa del sistema
./install.sh

# Actualización en producción
./update-production.sh

# Migración de datos MongoDB a PostgreSQL
node migrate-data.js

# Crear usuario administrador
node init-admin.js

# Limpiar y crear nuevo admin
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

## 🌐 Acceso

- **Frontend**: http://localhost:3000 (desarrollo) / http://localhost:8080 (producción)
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

1. **Error de conexión PostgreSQL**
   ```bash
   sudo systemctl status postgresql
   sudo systemctl start postgresql
   ```

2. **Error 502 Bad Gateway**
   ```bash
   pm2 restart tractoreando-backend
   sudo systemctl restart nginx
   ```

3. **Problemas de permisos**
   ```bash
   sudo chown -R $USER:$USER /path/to/tractoreando
   ```

## 📞 Soporte

Para soporte técnico, consulte la documentación completa o contacte al equipo de desarrollo.

---

**Sistema Tractoreando - Optimizado para PostgreSQL** 🚛✨