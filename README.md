# 🚛 Tractoreando - Sistema de Gestión de Transporte

## 📖 Descripción

Tractoreando es un sistema integral de gestión para empresas de transporte y logística que permite administrar vehículos, mantenimientos, usuarios y generar reportes detallados.

## ✨ Características Principales

- 🏢 **Multi-empresa**: Gestión de múltiples empresas desde una sola instalación
- 🚛 **Gestión de Vehículos**: Control completo del parque vehicular con diferenciación por tipos
- 🚗 **Tipos de Vehículos**: Soporte para automóviles, motocicletas, tractores, aperos agrícolas y más
- 🔐 **Control de Acceso por Tipo**: Los usuarios solo ven vehículos de tipos autorizados
- 🔧 **Mantenimiento**: Programación y seguimiento de mantenimientos
- 📊 **Reportes**: Informes detallados y análisis de datos
- 👥 **Gestión de Usuarios**: Control de acceso y permisos granulares
- ⚡ **Modelo Optimizado**: Estructura simplificada para mejor rendimiento

## 🛠️ Tecnologías

- **Backend**: Node.js, Express.js, MongoDB
- **Frontend**: React, Material-UI
- **Gestión de Procesos**: PM2
- **Servidor Web**: Nginx

## 🚀 Instalación y Gestión Simplificada

### Script Maestro Unificado

```bash
# Hacer ejecutable el script maestro
chmod +x tractoreando-manager.sh

# Instalación rápida para desarrollo
./tractoreando-manager.sh install --quick

# Instalación para producción
./tractoreando-manager.sh install --production

# Instalación servidor independiente
./tractoreando-manager.sh install --standalone
```

### Gestión del Sistema

```bash
# Ver estado del sistema
./tractoreando-manager.sh status

# Deployment completo
./tractoreando-manager.sh deploy --full

# Diagnóstico del sistema
./tractoreando-manager.sh diagnose --full

# Crear backup
./tractoreando-manager.sh maintain --backup

# Ver ayuda completa
./tractoreando-manager.sh help
```

## 📚 Documentación

- **[GUIA-COMPLETA.md](./GUIA-COMPLETA.md)**: Documentación completa del sistema (instalación, configuración, deployment, troubleshooting)
- **[SISTEMA-TIPOS-VEHICULOS.md](./SISTEMA-TIPOS-VEHICULOS.md)**: Documentación específica del sistema de tipos de vehículos
- **[FUNCIONALIDADES-INNOVADORAS.md](./FUNCIONALIDADES-INNOVADORAS.md)**: Características avanzadas del sistema

### 📁 Archivos Principales

- `tractoreando-manager.sh`: Script maestro de gestión
- `server.js`: Servidor backend principal
- `init-admin.js`: Inicialización del usuario administrador
- `ecosystem.config.js`: Configuración de PM2 para producción
- `.env`: Configuración consolidada (reemplaza múltiples archivos .env)
- `nginx.conf`: Configuración consolidada de Nginx (desarrollo y producción)

## 🔧 Comandos Básicos

```bash
# Ver estado de la aplicación
pm2 status

# Ver logs del backend
pm2 logs tractoreando-backend

# Reiniciar aplicación
pm2 restart tractoreando-backend

# Verificar servicios
sudo systemctl status nginx mongod

# Health check
curl http://localhost:8000/api/health
```

## 🌐 Acceso

- **Frontend**: http://localhost:3000 (desarrollo) / http://localhost:8080 (producción)
- **API**: http://localhost:8000/api
- **Health Check**: http://localhost:8000/api/health

## ✨ Beneficios de la Simplificación

- ✅ **Un solo script maestro**: `tractoreando-manager.sh` reemplaza 10+ scripts anteriores
- ✅ **Documentación unificada**: Toda la información en `GUIA-COMPLETA.md`
- ✅ **Gestión simplificada**: Comandos intuitivos y centralizados
- ✅ **Mantenimiento reducido**: Menos archivos que mantener
- ✅ **Modelo optimizado**: Estructura de datos simplificada para mejor rendimiento

---

**¡Sistema Tractoreando Optimizado!** 🚛✨

Para información detallada, consulte la **[Guía Completa](./GUIA-COMPLETA.md)**