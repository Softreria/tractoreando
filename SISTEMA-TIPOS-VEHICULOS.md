# 🚗 Sistema de Tipos de Vehículos y Control de Acceso

## 📖 Descripción General

El sistema de tipos de vehículos permite diferenciar y controlar el acceso a diferentes categorías de vehículos dentro de la plataforma Tractoreando. Cada usuario puede tener acceso limitado a tipos específicos de vehículos, proporcionando un control granular sobre qué información puede ver y gestionar cada usuario.

## 🎯 Características Principales

### Tipos de Vehículos Soportados

El sistema soporta los siguientes tipos de vehículos organizados por categorías:

#### Vehículos
- **🚗 Automóvil**: Incluye automóviles, deportivos, SUV y otros vehículos de pasajeros
- **🚐 Furgoneta**: Vehículos de transporte de mercancías y carga ligera
- **🚛 Camión**: Vehículos de carga pesada y transporte comercial
- **🚌 Autobús**: Vehículos de transporte público de pasajeros
- **🏍️ Motocicleta**: Motocicletas, scooters y vehículos de dos ruedas

#### Maquinaria
- **🚜 Tractor**: Tractores agrícolas y maquinaria de tracción
- **🌾 Apero Agrícola**: Implementos y herramientas agrícolas (arados, gradas, sembradoras, etc.)
- **🚧 Maquinaria de Construcción**: Excavadoras, bulldozers, grúas y equipos de construcción

#### Especiales
- **🚁 Vehículo Especial**: Ambulancias, bomberos, policía, militar y otros vehículos especializados

### Control de Acceso por Usuario

- **Asignación Flexible**: Cada usuario puede tener acceso a uno o múltiples tipos de vehículos
- **Filtrado Automático**: Los usuarios solo ven vehículos de tipos autorizados
- **Validación de Permisos**: Prevención de creación/edición de vehículos no autorizados
- **Herencia de Permisos**: Los administradores pueden gestionar permisos de otros usuarios

## 🔧 Implementación Técnica

### Backend

#### Modelo de Usuario
```javascript
// Campo agregado al modelo User
vehicleTypeAccess: {
  type: [String],
  enum: [
    'automovil', 'furgoneta', 'camion', 'autobus', 'motocicleta',
    'tractor', 'apero_agricola', 'maquinaria_construccion',
    'vehiculo_especial'
  ],
  default: ['automovil']
}
```

#### Filtrado en Rutas
```javascript
// Filtro aplicado en GET /api/vehicles
if (req.user.vehicleTypeAccess && req.user.vehicleTypeAccess.length > 0) {
  filter.vehicleType = { $in: req.user.vehicleTypeAccess };
}
```

#### Validación de Permisos
```javascript
// Validación en operaciones de vehículos
if (req.user.vehicleTypeAccess && 
    !req.user.vehicleTypeAccess.includes(vehicleData.vehicleType)) {
  return res.status(403).json({
    message: 'No tienes acceso a este tipo de vehículo'
  });
}
```

#### Ejemplo de Usuario
```javascript
// Ejemplo: Usuario con acceso a automóviles y maquinaria agrícola
const usuario = {
  name: "Juan Pérez",
  email: "juan@ejemplo.com",
  vehicleTypeAccess: ['automovil', 'tractor', 'apero_agricola']
};
```

### Frontend

#### Filtrado de Tipos Disponibles
```javascript
// Filtrar tipos de vehículos según permisos del usuario
const vehicleTypes = allVehicleTypes.filter(type => {
  if (!user?.vehicleTypeAccess || user.vehicleTypeAccess.length === 0) {
    return true; // Admin o sin restricciones
  }
  return user.vehicleTypeAccess.includes(type.value);
});
```

#### Validación en Formularios
```javascript
// Validación antes de envío
if (user?.vehicleTypeAccess && user.vehicleTypeAccess.length > 0) {
  if (!user.vehicleTypeAccess.includes(data.type)) {
    toast.error('No tienes acceso para crear/editar vehículos de este tipo');
    return;
  }
}
```

## 👥 Gestión de Usuarios

### Asignación de Tipos de Vehículos

1. **Acceso al Formulario de Usuario**
   - Navegar a la sección de Usuarios
   - Crear nuevo usuario o editar existente

2. **Selección de Tipos**
   - Utilizar el selector "Tipos de Vehículos con Acceso"
   - Seleccionar uno o múltiples tipos
   - Opción "Seleccionar Todos" disponible

3. **Validación**
   - Al menos un tipo debe estar seleccionado
   - Los cambios se aplican inmediatamente al guardar

### Casos de Uso Comunes

#### Empresa de Transporte Mixto
```
Usuario: Supervisor de Flota Ligera
Acceso: [automovil, furgoneta, motocicleta]
Ve: Solo vehículos ligeros y motocicletas

Usuario: Supervisor de Flota Pesada
Acceso: [camion, autobus]
Ve: Solo vehículos de carga y transporte público
```

#### Empresa Agrícola
```
Usuario: Operador de Campo
Acceso: [tractor, apero_agricola]
Ve: Solo maquinaria agrícola

Usuario: Supervisor General
Acceso: [automovil, tractor, apero_agricola, furgoneta]
Ve: Vehículos administrativos y maquinaria
```

#### Empresa de Construcción
```
Usuario: Operador de Maquinaria
Acceso: [maquinaria_construccion, camion]
Ve: Solo equipos de construcción y transporte

Usuario: Administrador
Acceso: [] (sin restricciones)
Ve: Todos los vehículos
```

## 🔐 Seguridad y Validaciones

### Validaciones Implementadas

1. **Validación de Creación**
   - Verificar permisos antes de crear vehículo
   - Mostrar solo tipos autorizados en selector

2. **Validación de Edición**
   - Verificar permisos antes de abrir formulario de edición
   - Prevenir cambio a tipos no autorizados

3. **Validación de Visualización**
   - Filtrar lista de vehículos según permisos
   - Ocultar vehículos no autorizados en reportes

### Mensajes de Error

- **Creación no autorizada**: "No tienes acceso para crear/editar vehículos de este tipo"
- **Edición no autorizada**: "No tienes acceso para editar vehículos de este tipo"
- **Tipo no disponible**: "Este tipo de vehículo no está disponible para tu usuario"

## 📊 Impacto en Reportes

### Filtrado Automático
- Los reportes solo incluyen vehículos de tipos autorizados
- Las estadísticas se calculan basándose en vehículos visibles
- Los gráficos reflejan únicamente datos accesibles

### Consideraciones
- Los totales pueden diferir entre usuarios
- Los administradores ven datos completos
- Los reportes por tipo solo muestran tipos autorizados

## 🚀 Migración y Compatibilidad

### Usuarios Existentes
- Los usuarios existentes mantienen acceso completo por defecto
- Se puede configurar acceso específico posteriormente
- No hay pérdida de funcionalidad durante la migración

### Vehículos Existentes
- Los vehículos existentes mantienen su tipo actual
- Se pueden reclasificar según los nuevos tipos
- La compatibilidad hacia atrás está garantizada

## 🔧 Configuración Avanzada

### Variables de Entorno
```bash
# Habilitar/deshabilitar control de acceso por tipos
ENABLE_VEHICLE_TYPE_ACCESS=true

# Tipos por defecto para nuevos usuarios
DEFAULT_VEHICLE_TYPES=automovil,furgoneta
```

### Personalización de Tipos
Para agregar nuevos tipos de vehículos:

1. **Backend**: Actualizar enum en modelo User
2. **Frontend**: Agregar tipo a array `allVehicleTypes`
3. **Validación**: Incluir en validaciones de formulario

## 📝 Notas de Desarrollo

### Archivos Modificados
- `models/User.js` - Modelo de usuario con campo vehicleTypeAccess
- `routes/vehicles.js` - Filtrado por tipos en consultas
- `frontend/src/pages/Users.js` - Selector de tipos en formulario
- `frontend/src/pages/Vehicles.js` - Filtrado y validaciones

### Consideraciones Futuras
- Posible implementación de roles jerárquicos
- Integración con sistema de permisos más granular
- Auditoría de cambios en permisos de acceso

---

**Documentación del Sistema de Tipos de Vehículos v1.0**

*Última actualización: Enero 2024*