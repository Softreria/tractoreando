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
    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: require('../models/Company'),
          as: 'company',
          attributes: ['name', 'isActive']
        }
      ]
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Token inválido' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Usuario inactivo' });
    }
    
    // Solo verificar empresa para usuarios que no sean super_admin
    if (user.role !== 'super_admin') {
      if (!user.company) {
        return res.status(401).json({ message: 'Usuario sin empresa asignada' });
      }
      
      if (!user.company.isActive) {
        return res.status(401).json({ message: 'Empresa inactiva' });
      }
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
    if (req.user.companyId.toString() !== companyId) {
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
      branch => branch.id.toString() === branchId
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
  logActivity
};