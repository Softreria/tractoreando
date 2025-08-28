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

## 📚 Documentación Consolidada

**Documentación completamente reorganizada y consolidada:**

👉 **[DOCUMENTACION-COMPLETA.md](./DOCUMENTACION-COMPLETA.md)**

### Documentación Anterior Consolidada
La siguiente documentación ha sido integrada en el archivo principal:
- ✅ `DESPLIEGUE-SERVIDOR-PRODUCCION.md`
- ✅ `GUIA-SOLUCION-PROBLEMAS.md`
- ✅ `NGINX-PROXY-MANAGER-SETUP.md`
- ✅ `RESUMEN-DESPLIEGUE-DIRECTO.md`
- ✅ `COMANDOS-SERVIDOR-DIRECTO.md`
- ✅ `SOLUCION-ERRORES-PRODUCCION.md`

### Contenido de la Documentación Completa
- 📋 Información general y requisitos del sistema
- 🚀 Guías de instalación detalladas (manual y automática)
- 🌐 Configuración de red y proxy (Nginx Proxy Manager y standalone)
- 🏭 Despliegue en producción paso a paso
- 🔧 Solución de problemas comunes con diagnósticos automáticos
- 🔧 Mantenimiento, monitoreo y backups automatizados
- 🚗 **[Sistema de Tipos de Vehículos](./SISTEMA-TIPOS-VEHICULOS.md)** - Control de acceso granular por tipos

## 🛠️ Scripts de Gestión Consolidados

El proyecto ha sido optimizado con scripts consolidados que reemplazan múltiples scripts anteriores:

### Scripts Principales
- **`instalacion-completa.sh`** - Instalación completa del sistema
  - Consolida: `install.sh`, `install-standalone.sh`, `instalacion-rapida.sh`, `configure-proxy.sh`, `verify-installation.sh`
  - Modos: `--quick`, `--standalone`, `--production`, `--proxy-config`, `--verify`

- **`diagnostico-integral.sh`** - Diagnóstico completo del sistema
  - Consolida: `diagnostico-completo.sh`, `diagnose-production.sh`, `verificar-servidor.sh`
  - Modos: `--quick`, `--full`, `--health`, `--performance`

- **`fix-mongodb-comprehensive.sh`** - Solución integral de problemas de MongoDB
  - Consolida: `fix-mongodb-quick.sh`, `fix-mongodb-connection.sh`
  - Modos: `--auto`, `--interactive`, `--connection`, `--permissions`

- **`gestion-produccion.sh`** - Gestión completa de producción
  - Consolida: `build-production.sh`, `fix-api-routes-production.sh`, `fix-production-login.sh`
  - Modos: `--build`, `--deploy`, `--update`, `--rollback`, `--status`

- **`mantenimiento-integral.sh`** - Mantenimiento completo del sistema
  - Consolida: `clean-for-git.sh`, `preparar-despliegue.sh`, `update.sh`
  - Modos: `--full`, `--quick`, `--backup`, `--cleanup`, `--update`

- **`utilidades-tractoreando.sh`** - Utilidades varias del sistema
  - Consolida: `acceso-inmediato.sh`, `solucion-rapida.sh`, `force-rebuild-frontend.sh`
  - Modos: `--rebuild`, `--reset`, `--quick-access`, `--emergency`

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

### Comandos de Emergencia Consolidados

```bash
# Diagnóstico completo automático
./diagnostico-integral.sh --quick

# Solución automática de problemas de MongoDB
./fix-mongodb-comprehensive.sh --auto

# Mantenimiento de emergencia
./mantenimiento-integral.sh --emergency

# Reconstrucción rápida del sistema
./utilidades-tractoreando.sh --rebuild

# Verificación completa de la instalación
./instalacion-completa.sh --verify

# Gestión de producción - estado completo
./gestion-produccion.sh --status
```

### Beneficios de la Consolidación
- ✅ **Menos archivos que mantener**: De 19+ scripts a 6 scripts principales
- ✅ **Documentación unificada**: Toda la información en un solo lugar
- ✅ **Funcionalidad mejorada**: Scripts con múltiples modos de operación
- ✅ **Mantenimiento simplificado**: Actualizaciones centralizadas
- ✅ **Experiencia de usuario mejorada**: Comandos más intuitivos y potentes

### Contacto

Para soporte técnico o consultas, consulte la documentación completa o los logs del sistema.

## 📄 Licencia

[Especificar licencia del proyecto]

---

**¡Bienvenido a Tractoreando!** 🎉

Para comenzar, ejecute la instalación automática y consulte la documentación completa para configuraciones avanzadas.