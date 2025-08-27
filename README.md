# 🚛 Tractoreando - Sistema de Gestión de Transporte

## 📖 Descripción

Tractoreando es un sistema integral de gestión para empresas de transporte y logística que permite administrar vehículos, mantenimientos, usuarios y generar reportes detallados.

## ✨ Características Principales

- 🏢 **Multi-empresa**: Gestión de múltiples empresas desde una sola instalación
- 🚛 **Gestión de Vehículos**: Control completo del parque vehicular
- 🔧 **Mantenimiento**: Programación y seguimiento de mantenimientos
- 📊 **Reportes**: Informes detallados y análisis de datos
- 👥 **Gestión de Usuarios**: Control de acceso y permisos

## 🛠️ Tecnologías

- **Backend**: Node.js, Express.js, MongoDB
- **Frontend**: React, Material-UI
- **Gestión de Procesos**: PM2
- **Servidor Web**: Nginx

## 🚀 Instalación Rápida

### Instalación Automática

```bash
# Descargar script de instalación
wget https://raw.githubusercontent.com/tu-repo/tractoreando/main/instalacion-completa.sh
chmod +x instalacion-completa.sh

# Instalación rápida
./instalacion-completa.sh --quick

# Instalación para servidor independiente
./instalacion-completa.sh --standalone

# Instalación interactiva de producción
./instalacion-completa.sh --production
```

### Verificación de Instalación

```bash
# Verificar instalación
./instalacion-completa.sh --verify

# Diagnóstico completo del sistema
./diagnostico-integral.sh
```

## 📚 Documentación Completa

**Para información detallada sobre instalación, configuración, despliegue y mantenimiento, consulte:**

👉 **[DOCUMENTACION-COMPLETA.md](./DOCUMENTACION-COMPLETA.md)**

Esta documentación incluye:

- 📋 Requisitos del sistema
- 🚀 Guías de instalación detalladas
- 🌐 Configuración de red y proxy
- 🏭 Despliegue en producción
- 🔧 Solución de problemas
- 🔧 Mantenimiento y monitoreo

## 🛠️ Scripts de Gestión

El proyecto incluye scripts consolidados para facilitar la administración:

- `instalacion-completa.sh` - Instalación completa del sistema
- `diagnostico-integral.sh` - Diagnóstico completo del sistema
- `fix-mongodb-comprehensive.sh` - Solución de problemas de MongoDB
- `gestion-produccion.sh` - Gestión de producción
- `mantenimiento-integral.sh` - Mantenimiento del sistema
- `utilidades-tractoreando.sh` - Utilidades varias

## 🔧 Comandos Básicos

```bash
# Ver estado de la aplicación
pm2 status

# Ver logs
pm2 logs tractoreando

# Reiniciar aplicación
pm2 restart tractoreando

# Verificar servicios
sudo systemctl status nginx mongod

# Health check
curl http://localhost:5000/api/health
```

## 🌐 Acceso

- **Frontend**: https://tu-dominio.com
- **API**: https://tu-dominio.com/api
- **Health Check**: https://tu-dominio.com/api/health

## 🆘 Soporte Rápido

### Problemas Comunes

```bash
# Diagnóstico automático
./diagnostico-integral.sh --quick

# Solución de problemas de MongoDB
./fix-mongodb-comprehensive.sh --auto

# Reiniciar todos los servicios
sudo systemctl restart mongod nginx
pm2 restart all
```

### Contacto

Para soporte técnico o consultas, consulte la documentación completa o los logs del sistema.

## 📄 Licencia

[Especificar licencia del proyecto]

---

**¡Bienvenido a Tractoreando!** 🎉

Para comenzar, ejecute la instalación automática y consulte la documentación completa para configuraciones avanzadas.