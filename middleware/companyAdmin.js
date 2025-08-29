const User = require('../models/User');
const Company = require('../models/Company');

/**
 * Middleware para verificar que el usuario es administrador de empresa
 * y puede gestionar usuarios de su empresa
 */
const checkCompanyAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    // Super admin siempre tiene acceso
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Verificar que es company_admin
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ 
        message: 'Solo los administradores de empresa pueden realizar esta acción' 
      });
    }

    // Verificar que la empresa tiene configurado un administrador
    const company = await Company.findById(req.user.company._id);
    if (!company) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    // Verificar que el usuario actual es el administrador de la empresa
    if (company.administrator && company.administrator.userId) {
      if (company.administrator.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ 
          message: 'No eres el administrador autorizado de esta empresa' 
        });
      }
    }

    // Verificar que tiene permisos para gestionar usuarios
    if (company.administrator && !company.administrator.canManageUsers) {
      return res.status(403).json({ 
        message: 'No tienes permisos para gestionar usuarios' 
      });
    }

    next();
  } catch (error) {
    console.error('Error en middleware de administrador de empresa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Middleware para verificar que el usuario objetivo pertenece a la misma empresa
 * que el administrador que intenta gestionarlo
 */
const checkSameCompanyUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id || req.params.userId || req.body.userId;
    
    if (!targetUserId) {
      return res.status(400).json({ message: 'ID de usuario requerido' });
    }

    // Super admin puede gestionar cualquier usuario
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Buscar el usuario objetivo
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar que pertenece a la misma empresa
    if (targetUser.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ 
        message: 'No puedes gestionar usuarios de otras empresas' 
      });
    }

    // No permitir que se modifique a sí mismo a través de estas rutas
    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        message: 'No puedes modificar tu propio usuario a través de esta ruta' 
      });
    }

    // No permitir que modifique otros administradores de empresa
    if (targetUser.role === 'company_admin' && req.user.role === 'company_admin') {
      return res.status(403).json({ 
        message: 'No puedes modificar otros administradores de empresa' 
      });
    }

    // No permitir que modifique super_admin
    if (targetUser.role === 'super_admin') {
      return res.status(403).json({ 
        message: 'No puedes modificar super administradores' 
      });
    }

    req.targetUser = targetUser;
    next();
  } catch (error) {
    console.error('Error en verificación de usuario de la misma empresa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Middleware para verificar límites de usuarios en la empresa
 */
const checkUserLimits = async (req, res, next) => {
  try {
    // Super admin no tiene límites
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Solo aplicar límites al crear nuevos usuarios
    if (req.method !== 'POST') {
      return next();
    }

    const company = await Company.findById(req.user.company._id);
    if (!company) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    // Contar usuarios activos de la empresa
    const activeUserCount = await User.countDocuments({
      company: company._id,
      isActive: true
    });

    // Verificar límite (por defecto 50 usuarios por empresa)
    const maxUsers = 50; // Esto podría venir de la configuración de la empresa
    
    if (activeUserCount >= maxUsers) {
      return res.status(403).json({ 
        message: `Límite de usuarios alcanzado (${maxUsers}). Contacta al administrador del sistema.` 
      });
    }

    next();
  } catch (error) {
    console.error('Error en verificación de límites de usuarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Middleware para validar roles que puede asignar un administrador de empresa
 */
const validateAssignableRoles = (req, res, next) => {
  try {
    const { role } = req.body;
    
    if (!role) {
      return next(); // Si no se especifica rol, continuar
    }

    // Super admin puede asignar cualquier rol
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Roles que puede asignar un administrador de empresa
    const allowedRoles = ['manager', 'mechanic', 'operator', 'viewer'];
    
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ 
        message: `No puedes asignar el rol '${role}'. Roles permitidos: ${allowedRoles.join(', ')}` 
      });
    }

    next();
  } catch (error) {
    console.error('Error en validación de roles asignables:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  checkCompanyAdmin,
  checkSameCompanyUser,
  checkUserLimits,
  validateAssignableRoles
};