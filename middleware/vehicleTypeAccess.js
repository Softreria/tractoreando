const Vehicle = require('../models/Vehicle');

/**
 * Middleware para verificar acceso a tipos de vehículos
 * @param {string} action - Acción a realizar ('read', 'create', 'update', 'delete')
 * @param {string} vehicleTypeSource - Fuente del tipo de vehículo ('body', 'params', 'vehicle')
 */
const checkVehicleTypeAccess = (action = 'read', vehicleTypeSource = 'body') => {
  return async (req, res, next) => {
    try {
      // Super admin tiene acceso a todo
      if (req.user.role === 'super_admin') {
        return next();
      }

      // Si el usuario no tiene restricciones de tipo de vehículo, permitir acceso
      if (!req.user.vehicleTypeAccess || req.user.vehicleTypeAccess.length === 0) {
        return next();
      }

      let vehicleType;

      // Obtener el tipo de vehículo según la fuente especificada
      switch (vehicleTypeSource) {
        case 'body':
          vehicleType = req.body.vehicleType;
          break;
        case 'params':
          vehicleType = req.params.vehicleType;
          break;
        case 'vehicle':
          // Obtener el tipo de vehículo desde la base de datos
          if (req.params.id) {
            const vehicle = await Vehicle.findById(req.params.id);
            if (!vehicle) {
              return res.status(404).json({ message: 'Vehículo no encontrado' });
            }
            vehicleType = vehicle.vehicleType;
          }
          break;
        default:
          return res.status(500).json({ message: 'Fuente de tipo de vehículo no válida' });
      }

      // Si no se puede determinar el tipo de vehículo, continuar
      if (!vehicleType) {
        return next();
      }

      // Verificar si el usuario tiene acceso al tipo de vehículo
      if (!req.user.vehicleTypeAccess.includes(vehicleType)) {
        const actionMessages = {
          read: 'ver',
          create: 'crear',
          update: 'actualizar',
          delete: 'eliminar'
        };
        
        return res.status(403).json({ 
          message: `No tienes acceso para ${actionMessages[action] || 'acceder a'} este tipo de vehículo` 
        });
      }

      next();
    } catch (error) {
      console.error('Error en middleware de acceso a tipos de vehículos:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  };
};

/**
 * Middleware para verificar acceso a múltiples tipos de vehículos
 * Útil para endpoints que pueden manejar varios tipos
 */
const checkMultipleVehicleTypeAccess = (vehicleTypes) => {
  return (req, res, next) => {
    try {
      // Super admin tiene acceso a todo
      if (req.user.role === 'super_admin') {
        return next();
      }

      // Si el usuario no tiene restricciones de tipo de vehículo, permitir acceso
      if (!req.user.vehicleTypeAccess || req.user.vehicleTypeAccess.length === 0) {
        return next();
      }

      // Verificar si el usuario tiene acceso a al menos uno de los tipos especificados
      const hasAccess = vehicleTypes.some(type => req.user.vehicleTypeAccess.includes(type));
      
      if (!hasAccess) {
        return res.status(403).json({ 
          message: 'No tienes acceso a ninguno de los tipos de vehículos requeridos' 
        });
      }

      next();
    } catch (error) {
      console.error('Error en middleware de acceso múltiple a tipos de vehículos:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  };
};

/**
 * Función helper para filtrar tipos de vehículos según permisos del usuario
 * @param {Object} user - Usuario actual
 * @param {Array} allVehicleTypes - Todos los tipos de vehículos disponibles
 * @returns {Array} Tipos de vehículos permitidos para el usuario
 */
const getAccessibleVehicleTypes = (user, allVehicleTypes = []) => {
  // Super admin tiene acceso a todo
  if (user.role === 'super_admin') {
    return allVehicleTypes;
  }

  // Si no tiene restricciones, devolver todos
  if (!user.vehicleTypeAccess || user.vehicleTypeAccess.length === 0) {
    return allVehicleTypes;
  }

  // Filtrar solo los tipos permitidos
  return allVehicleTypes.filter(type => user.vehicleTypeAccess.includes(type));
};

module.exports = {
  checkVehicleTypeAccess,
  checkMultipleVehicleTypeAccess,
  getAccessibleVehicleTypes
};