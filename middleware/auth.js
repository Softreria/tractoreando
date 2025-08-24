const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware de autenticación
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No hay token, acceso denegado' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .populate('company', 'name isActive')
      .populate('branches', 'name code');
    
    if (!user) {
      return res.status(401).json({ message: 'Token inválido' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Usuario inactivo' });
    }
    
    if (!user.company) {
      return res.status(401).json({ message: 'Usuario sin empresa asignada' });
    }
    
    if (!user.company.isActive) {
      return res.status(401).json({ message: 'Empresa inactiva' });
    }
    
    if (user.isLocked) {
      return res.status(401).json({ message: 'Cuenta bloqueada temporalmente' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    res.status(401).json({ message: 'Token inválido' });
  }
};

// Middleware para verificar roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'No tienes permisos para realizar esta acción' 
      });
    }
    
    next();
  };
};

// Middleware para verificar permisos específicos
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    
    const permissions = req.user.permissions;
    
    if (!permissions[resource] || !permissions[resource][action]) {
      return res.status(403).json({ 
        message: `No tienes permisos para ${action} en ${resource}` 
      });
    }
    
    next();
  };
};

// Middleware para verificar acceso a empresa
const checkCompanyAccess = async (req, res, next) => {
  try {
    const companyId = req.params.companyId || req.body.company || req.query.company;
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de empresa requerido' });
    }
    
    // Super admin puede acceder a cualquier empresa
    if (req.user.role === 'super_admin') {
      return next();
    }
    
    // Verificar que el usuario pertenece a la empresa
    if (req.user.company._id.toString() !== companyId) {
      return res.status(403).json({ 
        message: 'No tienes acceso a esta empresa' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Error en verificación de acceso a empresa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Middleware para verificar acceso a sucursal
const checkBranchAccess = async (req, res, next) => {
  try {
    const branchId = req.params.branchId || req.body.branch || req.query.branch;
    
    if (!branchId) {
      return res.status(400).json({ message: 'ID de sucursal requerido' });
    }
    
    // Super admin y company admin pueden acceder a cualquier sucursal de su empresa
    if (['super_admin', 'company_admin'].includes(req.user.role)) {
      return next();
    }
    
    // Verificar que el usuario tiene acceso a la sucursal
    const hasAccess = req.user.branches.some(
      branch => branch._id.toString() === branchId
    );
    
    if (!hasAccess) {
      return res.status(403).json({ 
        message: 'No tienes acceso a esta sucursal' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Error en verificación de acceso a sucursal:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Middleware para verificar límites de suscripción
const checkSubscriptionLimits = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'super_admin') {
        return next();
      }
      
      const company = req.user.company;
      
      if (!company.subscription.isActive) {
        return res.status(403).json({ 
          message: 'Suscripción inactiva' 
        });
      }
      
      // Verificar límites según el tipo de recurso
      switch (resourceType) {
        case 'vehicles':
          const Vehicle = require('../models/Vehicle');
          const vehicleCount = await Vehicle.countDocuments({ 
            company: company._id, 
            isActive: true 
          });
          
          if (vehicleCount >= company.subscription.maxVehicles) {
            return res.status(403).json({ 
              message: `Límite de vehículos alcanzado (${company.subscription.maxVehicles})` 
            });
          }
          break;
          
        case 'users':
          const userCount = await User.countDocuments({ 
            company: company._id, 
            isActive: true 
          });
          
          if (userCount >= company.subscription.maxUsers) {
            return res.status(403).json({ 
              message: `Límite de usuarios alcanzado (${company.subscription.maxUsers})` 
            });
          }
          break;
          
        case 'branches':
          const Branch = require('../models/Branch');
          const branchCount = await Branch.countDocuments({ 
            company: company._id, 
            isActive: true 
          });
          
          if (branchCount >= company.subscription.maxBranches) {
            return res.status(403).json({ 
              message: `Límite de sucursales alcanzado (${company.subscription.maxBranches})` 
            });
          }
          break;
      }
      
      next();
    } catch (error) {
      console.error('Error en verificación de límites:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  };
};

// Middleware para logging de actividad
const logActivity = (action) => {
  return (req, res, next) => {
    // Aquí podrías implementar un sistema de logging más sofisticado
    console.log(`[${new Date().toISOString()}] ${req.user.email} - ${action} - ${req.method} ${req.originalUrl}`);
    next();
  };
};

module.exports = {
  auth,
  authorize,
  checkPermission,
  checkCompanyAccess,
  checkBranchAccess,
  checkSubscriptionLimits,
  logActivity
};