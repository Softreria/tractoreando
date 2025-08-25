# 🚜 Tractoreando - Sistema de Gestión de Mantenimiento de Vehículos

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0+-green.svg)](https://www.mongodb.com/)

**Tractoreando** es un sistema completo de gestión de mantenimiento de vehículos diseñado para empresas multiflota. Permite gestionar el mantenimiento preventivo y correctivo de vehículos, controlar costos, programar servicios y generar reportes detallados.

## 🌟 Características Principales

### 🏢 **Gestión Multiempresa**
- Soporte para múltiples empresas y sucursales
- Control de acceso basado en roles
- Gestión independiente de flotas por empresa

### 🚗 **Gestión de Vehículos**
- Registro completo de vehículos (matrícula, VIN, marca, modelo, año)
- Historial completo de mantenimientos
- Control de documentación y seguros
- Gestión de combustible y kilometraje

### 🔧 **Sistema de Mantenimiento**
- **Mantenimiento Preventivo**: Programación automática basada en kilometraje/tiempo
- **Mantenimiento Correctivo**: Gestión de reparaciones y averías
- **Mantenimiento Predictivo**: Análisis de tendencias y predicciones
- **Inspecciones**: Control de revisiones técnicas y normativas
- **Garantías**: Seguimiento de trabajos bajo garantía

### 📊 **Reportes y Analytics**
- Dashboard con métricas en tiempo real
- Reportes de costos por vehículo/empresa
- Análisis de rendimiento de flota
- Exportación a Excel/PDF
- Gráficos interactivos con Recharts

### 👥 **Gestión de Usuarios**
- Roles: Administrador, Gerente, Mecánico, Operador
- Autenticación JWT segura
- Perfiles personalizables
- Control de permisos granular

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** - Entorno de ejecución
- **Express.js** - Framework web
- **MongoDB** - Base de datos NoSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticación y autorización
- **bcryptjs** - Encriptación de contraseñas
- **express-validator** - Validación de datos

### Frontend
- **React 18** - Biblioteca de interfaz de usuario
- **Material-UI (MUI)** - Componentes de diseño
- **React Router** - Navegación SPA
- **React Hook Form** - Gestión de formularios
- **React Query** - Gestión de estado del servidor
- **Axios** - Cliente HTTP
- **Recharts** - Gráficos y visualizaciones
- **FullCalendar** - Calendario interactivo

### DevOps y Deployment
- **PM2** - Gestor de procesos
- **Nginx** - Servidor web y proxy reverso
- **Docker** - Contenedorización (opcional)
- **Scripts automatizados** - Instalación y actualización

## 💻 Requisitos del Sistema

### 📋 Requisitos Mínimos

#### Servidor/Hardware
- **CPU**: 2 núcleos (2.0 GHz)
- **RAM**: 4 GB
- **Almacenamiento**: 20 GB de espacio libre
- **Red**: Conexión a internet estable

#### Sistema Operativo
- **Linux**: Ubuntu 18.04+ / CentOS 7+ / Debian 9+
- **Windows**: Windows Server 2016+ / Windows 10+
- **macOS**: macOS 10.15+ (Catalina)

#### Software Base
- **Node.js**: v18.0.0 o superior
- **npm**: v8.0.0 o superior
- **MongoDB**: v5.0 o superior
- **Git**: v2.20 o superior

#### Navegadores Soportados (Cliente)
- **Chrome**: v90+
- **Firefox**: v88+
- **Safari**: v14+
- **Edge**: v90+

### 🚀 Requisitos Recomendados

#### Servidor/Hardware
- **CPU**: 4+ núcleos (2.5+ GHz)
- **RAM**: 8+ GB
- **Almacenamiento**: 100+ GB SSD
- **Red**: Ancho de banda dedicado 10+ Mbps

#### Sistema Operativo
- **Linux**: Ubuntu 22.04 LTS / CentOS Stream 9
- **Contenedores**: Docker 20.10+ con Docker Compose

#### Software Base
- **Node.js**: v20.x LTS (última versión estable)
- **npm**: v10.x (última versión)
- **MongoDB**: v7.0+ (con replica set para producción)
- **Nginx**: v1.20+ (como proxy reverso)
- **PM2**: v5.x (gestor de procesos)
- **SSL/TLS**: Certificado válido (Let's Encrypt recomendado)

#### Configuración de Producción
- **Firewall**: Configurado (puertos 80, 443, 22)
- **Backup**: Sistema automatizado de respaldos
- **Monitoreo**: Logs centralizados y alertas
- **CDN**: Para assets estáticos (opcional)

### 🏢 Requisitos por Tamaño de Empresa

#### Pequeña Empresa (1-50 vehículos)
- **CPU**: 2 núcleos
- **RAM**: 4 GB
- **Usuarios concurrentes**: 5-10
- **Almacenamiento**: 50 GB

#### Mediana Empresa (51-200 vehículos)
- **CPU**: 4 núcleos
- **RAM**: 8 GB
- **Usuarios concurrentes**: 10-25
- **Almacenamiento**: 200 GB
- **Recomendado**: Servidor dedicado

#### Gran Empresa (200+ vehículos)
- **CPU**: 8+ núcleos
- **RAM**: 16+ GB
- **Usuarios concurrentes**: 25+
- **Almacenamiento**: 500+ GB
- **Recomendado**: Cluster de servidores + Load Balancer

### 🔧 Verificación de Requisitos

```bash
# Verificar versión de Node.js
node --version

# Verificar versión de npm
npm --version

# Verificar MongoDB
mongod --version

# Verificar recursos del sistema (Linux)
free -h                    # RAM disponible
df -h                      # Espacio en disco
nproc                      # Número de CPUs

# Verificar puertos disponibles
sudo netstat -tlnp | grep :5000
sudo netstat -tlnp | grep :27017
```

### ⚠️ Notas Importantes

- **MongoDB**: Se recomienda usar MongoDB Atlas para producción
- **SSL**: Obligatorio para entornos de producción
- **Backup**: Configurar respaldos automáticos diarios
- **Actualizaciones**: Mantener el sistema actualizado
- **Seguridad**: Configurar firewall y accesos restringidos

### 🔄 Solución a Problemas Comunes

#### Error de dependencia libssl1.1 al instalar MongoDB

Si encuentras este error al instalar MongoDB:
```
The following packages have unmet dependencies: 
  mongodb-org-mongos : Depends: libssl1.1 (>= 1.1.1) but it is not installable 
  mongodb-org-server : Depends: libssl1.1 (>= 1.1.1) but it is not installable 
E: Unable to correct problems, you have held broken packages.
```

Solución para Ubuntu 22.04 o superior:

```bash
# Descargar e instalar libssl1.1 manualmente
wget http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb
sudo dpkg -i libssl1.1_1.1.1f-1ubuntu2_amd64.deb

# Luego continuar con la instalación de MongoDB
sudo apt update
sudo apt install -y mongodb-org
```

Alternativamente, puedes usar Docker para ejecutar MongoDB sin problemas de dependencias:

```bash
# Instalar Docker si no está instalado
sudo apt install -y docker.io

# Iniciar contenedor de MongoDB
sudo docker run -d -p 27017:27017 --name mongodb mongo:5.0

# Configurar para iniciar con el sistema
sudo systemctl enable docker
```

#### Error al clonar el repositorio: directorio ya existe

Si al ejecutar el script de instalación aparece este error:
```
[INFO] Clonando repositorio... 
fatal: destination path '/opt/tractoreando' already exists and is not an empty directory.
```

Tienes dos opciones:

1. **Eliminar el directorio existente** (si no contiene datos importantes):

```bash
# Eliminar el directorio existente
sudo rm -rf /opt/tractoreando

# Volver a ejecutar el script de instalación
./install.sh
```

2. **Actualizar la instalación existente** (si ya tenías una versión anterior):

```bash
# Ir al directorio existente
cd /opt/tractoreando

# Actualizar desde el repositorio
git pull

# Ejecutar el script de actualización
./update.sh
```

Si el directorio existe pero no es un repositorio git válido:

```bash
# Hacer copia de seguridad de archivos importantes
sudo mkdir -p /opt/backup
sudo cp -r /opt/tractoreando/datos_importantes /opt/backup/

# Eliminar y reinstalar
sudo rm -rf /opt/tractoreando
./install.sh
```

## 🚀 Instalación Rápida

### Opción 1: Instalación Automática (Recomendada)

```bash
# Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd tractoreando

# Instalación automática completa
npm run install:all
./install.sh
```

### Opción 2: Servidor Independiente (con Proxy Manager)

```bash
# Para servidores con Nginx Proxy Manager
./install-standalone.sh
```

### Opción 3: Instalación Manual

```bash
# Instalar dependencias
npm install
cd frontend && npm install && cd ..

# Configurar variables de entorno
cp .env.production .env
# Editar .env con tus configuraciones

# Construir frontend
npm run build:prod

# Iniciar aplicación
npm start
```

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` basado en `.env.production`:

```env
# Base de datos
MONGODB_URI=mongodb://localhost:27017/tractoreando

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro
JWT_EXPIRE=7d

# Servidor
PORT=5000
NODE_ENV=production

# Frontend (si es necesario)
REACT_APP_API_URL=http://localhost:5000/api
```

### Base de Datos

```bash
# Instalar MongoDB (Ubuntu/Debian)
sudo apt update
sudo apt install mongodb

# Iniciar MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Cargar datos de ejemplo (opcional)
node data-loader.js spanish
```

## 📱 Uso de la Aplicación

### Acceso Inicial

#### Opción 1: Cargar Datos de Ejemplo (Recomendada)
```bash
# Cargar datos de ejemplo españoles con usuarios predefinidos
node data-loader.js spanish
```

Credenciales del administrador:
- **Usuario**: admin@tractoreando.es
- **Contraseña**: Admin2024!
- **Rol**: Super Administrador

#### Opción 2: Aplicación Limpia (Sin Datos de Ejemplo)
```bash
# Crear solo un usuario administrador básico
node -e "
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando')
.then(async () => {
  const hashedPassword = await bcrypt.hash('Admin2024!', 10);
  const admin = new User({
    firstName: 'Admin',
    lastName: 'Sistema',
    email: 'admin@tuempresa.com',
    password: hashedPassword,
    role: 'super_admin',
    permissions: {
      companies: { create: true, read: true, update: true, delete: true },
      branches: { create: true, read: true, update: true, delete: true },
      vehicles: { create: true, read: true, update: true, delete: true },
      maintenance: { create: true, read: true, update: true, delete: true },
      users: { create: true, read: true, update: true, delete: true },
      reports: { read: true, export: true },
      settings: { read: true, update: true }
    },
    isActive: true
  });
  await admin.save();
  console.log('✅ Usuario administrador creado: admin@tuempresa.com');
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
"
```

Credenciales del administrador:
- **Usuario**: admin@tuempresa.com
- **Contraseña**: Admin2024!
- **Rol**: Super Administrador

#### Acceso a la Aplicación
1. Accede a `http://tu-servidor` o `http://localhost:3000`
2. Usa las credenciales según la opción elegida
3. **¡Importante!** Cambia la contraseña en el primer acceso

### Configuración Inicial Post-Instalación

#### 1. **Primer Acceso y Configuración de Seguridad**
```bash
# Después del primer login, cambiar contraseña del admin
# Esto se hace desde la interfaz web en: Perfil > Cambiar Contraseña
```

#### 2. **Crear Tu Primera Empresa**
- Ve a **Empresas > Nueva Empresa**
- Completa los datos:
  - Nombre de la empresa
  - RFC/CIF
  - Dirección completa
  - Datos de contacto
  - Configuración de moneda y zona horaria

#### 3. **Crear Sucursales/Delegaciones**
- Ve a **Sucursales > Nueva Sucursal**
- Tipos disponibles: Oficina, Taller, Almacén, Delegación
- Asigna un código único y manager responsable

#### 4. **Gestión de Usuarios**

**Roles Disponibles:**
- **Super Admin**: Acceso total al sistema
- **Company Admin**: Administrador de empresa
- **Branch Manager**: Gerente de sucursal
- **Mechanic**: Mecánico/Técnico
- **Operator**: Operador básico

**Crear Nuevos Usuarios:**
```bash
# Desde la interfaz web:
# Usuarios > Nuevo Usuario
# - Datos personales
# - Email (será el username)
# - Rol y permisos
# - Empresa y sucursales asignadas
```

#### 5. **Limpiar Datos de Ejemplo (Opcional)**
```bash
# Si usaste datos de ejemplo y quieres empezar limpio:
node -e "
const mongoose = require('mongoose');
const Company = require('./models/Company');
const Branch = require('./models/Branch');
const Vehicle = require('./models/Vehicle');
const Maintenance = require('./models/Maintenance');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando')
.then(async () => {
  // Mantener solo usuarios super_admin
  await Maintenance.deleteMany({});
  await Vehicle.deleteMany({});
  await User.deleteMany({ role: { \$ne: 'super_admin' } });
  await Branch.deleteMany({});
  await Company.deleteMany({});
  console.log('✅ Datos de ejemplo eliminados. Solo se mantuvieron los super_admin.');
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
"
```

### Flujo de Trabajo Típico

1. **Configuración Inicial**
   - Crear empresas y sucursales
   - Registrar usuarios y asignar roles
   - Configurar tipos de mantenimiento

2. **Gestión de Vehículos**
   - Registrar vehículos de la flota
   - Configurar programas de mantenimiento preventivo
   - Subir documentación (seguros, ITV, etc.)

3. **Operación Diaria**
   - Crear órdenes de trabajo
   - Asignar mecánicos
   - Registrar trabajos realizados
   - Controlar costos y repuestos

4. **Seguimiento y Reportes**
   - Monitorear dashboard de métricas
   - Generar reportes periódicos
   - Analizar costos y rendimiento

## 🔧 Scripts Disponibles

### Desarrollo
```bash
npm run dev          # Iniciar servidor en modo desarrollo
npm run client       # Iniciar solo frontend
npm run server       # Iniciar solo backend
```

### Producción
```bash
npm start            # Iniciar aplicación
npm run build:prod   # Construir frontend para producción
```

### Deployment
```bash
./install.sh         # Instalación completa
./update.sh          # Actualizar aplicación
./configure-proxy.sh # Configurar proxy
```

### Mantenimiento
```bash
npm run clean:git    # Limpiar para Git
npm run clean        # Limpiar node_modules
```

## 📊 Estructura del Proyecto

```
tractoreando/
├── 📁 backend/
│   ├── 📁 models/          # Modelos de MongoDB
│   ├── 📁 routes/          # Rutas de la API
│   ├── 📁 middleware/      # Middleware personalizado
│   └── server.js           # Servidor principal
├── 📁 frontend/
│   ├── 📁 src/
│   │   ├── 📁 components/  # Componentes React
│   │   ├── 📁 pages/       # Páginas principales
│   │   ├── 📁 contexts/    # Contextos React
│   │   ├── 📁 services/    # Servicios API
│   │   └── 📁 utils/       # Utilidades
│   └── package.json
├── 📁 scripts/             # Scripts de deployment
├── 📁 docs/               # Documentación
└── package.json
```

## 🔒 Seguridad

- **Autenticación JWT** con tokens seguros
- **Encriptación bcrypt** para contraseñas
- **Validación de entrada** en todas las rutas
- **Control de acceso** basado en roles
- **CORS configurado** para producción
- **Rate limiting** en endpoints críticos

## 📈 Rendimiento

- **Lazy loading** de componentes React
- **Paginación** en listados grandes
- **Caché** de consultas frecuentes
- **Optimización** de imágenes y assets
- **Compresión gzip** en servidor

## 🌐 Deployment

### Nginx + PM2 (Recomendado)
```bash
# Usar script automático
./install.sh

# O configuración manual
sudo npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### Docker (Opcional)
```bash
# Construir imagen
docker build -t tractoreando .

# Ejecutar contenedor
docker run -d -p 80:5000 --name tractoreando-app tractoreando
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 🔧 Solución de Problemas

Para problemas comunes, consulta la [Guía de Solución de Problemas](./GUIA-SOLUCION-PROBLEMAS.md).

### Diagnóstico Rápido
```bash
# Diagnóstico completo del sistema
node diagnose-system.js

# Carga de datos de ejemplo
node data-loader.js sample
```

### Scripts Disponibles
- `diagnose-system.js` - Sistema unificado de diagnóstico
- `data-loader.js` - Sistema unificado de carga de datos
- `install.sh` - Instalación completa
- `update.sh` - Actualización del sistema

## 📝 Changelog

### v1.0.0 (2024-08-24)
- ✅ Sistema completo de gestión de mantenimiento
- ✅ Interfaz React con Material-UI
- ✅ API REST completa
- ✅ Autenticación y autorización
- ✅ Reportes y dashboard
- ✅ Scripts de deployment automatizado

## 📞 Soporte

- **Documentación**: Ver carpeta `/docs`
- **Issues**: Crear issue en GitHub
- **Email**: soporte@tractoreando.com

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👨‍💻 Autor

**David Hernández**
- GitHub: [@davidhernandez](https://github.com/davidhernandez)
- Email: david@softreria.com

---

⭐ **¡Si te gusta este proyecto, dale una estrella en GitHub!** ⭐

---

*Tractoreando - Gestión inteligente de mantenimiento de vehículos* 🚜✨