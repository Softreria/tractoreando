# Herramientas de Desarrollo - Tractoreando

Esta carpeta contiene archivos y scripts utilizados durante el desarrollo y debugging del sistema. **Estos archivos NO son necesarios para la instalación en producción.**

## Contenido

### Scripts de Debug y Diagnóstico
- `debug_*.js` - Scripts para debugging de diferentes componentes
- `diagnose_*.js` - Scripts de diagnóstico del sistema
- `final_diagnosis.js` - Diagnóstico final del sistema
- `live_debug_*.js` - Scripts de debug en tiempo real

### Scripts de Datos de Prueba
- `add_sample_data.js` - Agregar datos de muestra
- `create-sample-data.js` - Crear datos de muestra
- `reset-and-create-data.js` - Resetear y crear datos

### Scripts de Corrección
- `fix-*.js` - Scripts para corregir problemas específicos
- `fix_*.js` - Scripts de corrección adicionales

### Scripts de Verificación
- `check_*.js` - Scripts para verificar estado del sistema
- `create_missing_admin.js` - Crear administrador faltante

### Archivos de Test
- `test_*.js` - Scripts de prueba del backend
- `test_*.html` - Páginas de prueba del frontend

### Archivos de Respuesta
- `*.json` - Archivos de respuesta para debugging

## Uso

Estos archivos son útiles para:
- Debugging durante desarrollo
- Corrección de problemas específicos
- Creación de datos de prueba
- Verificación del estado del sistema

## Nota Importante

⚠️ **NO elimines esta carpeta** - Puede ser útil para mantenimiento futuro y resolución de problemas.

🚀 **Para instalación en producción**, utiliza el script `install-production.sh` en el directorio raíz.