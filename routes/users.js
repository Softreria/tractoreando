const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Company = require('../models/Company');
const Branch = require('../models/Branch');
const { auth, requireRole, checkPermission, checkCompanyAccess, checkSubscriptionLimits, logActivity } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Obtener usuarios
// @access  Private
router.get('/', [
  auth,
  checkPermission('users', 'read'),
  logActivity('Listar usuarios')
], async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, branch, status, company } = req.query;
    
    const query = {};
    
    // Filtrar por empresa
    if (req.user.role === 'super_admin') {
      if (company) {
        query.company = company;
      }
    } else {
      query.company = req.user.company._id;
    }
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }
    
    if (branch) {
      query.branches = branch;
    }
    
    if (status !== undefined) {
      query.isActive = status === 'true';
    }

    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      query.branches = { $in: req.user.branches };
    }

    const users = await User.find(query)
      .populate('company', 'name')
      .populate('branches', 'name code')
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/users/:id});

// @desc    Obtener roles disponibles
// @access  Private
router.get('/roles/available', [
  auth,
  logActivity('Ver roles disponibles')
], async (req, res) => {
  try {
    let availableRoles = [];

    switch (req.user.role) {
      case 'super_admin':
        availableRoles = ['company_admin', 'branch_manager', 'mechanic', 'operator', 'viewer'];
        break;
      case 'company_admin':
        availableRoles = ['branch_manager', 'mechanic', 'operator', 'viewer'];
        break;
      case 'branch_manager':
        availableRoles = ['mechanic', 'operator', 'viewer'];
        break;
      default:
        availableRoles = [];
    }

    const rolesWithDescriptions = availableRoles.map(role => ({
      value: role,
      label: getRoleDescription(role)
    }));

    res.json(rolesWithDescriptions);
  } catch (error) {
    console.error('Error obteniendo roles disponibles:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @desc    Obtener usuario por ID
// @access  Private
router.get('/:id', [
  auth,
  checkPermission('users', 'read'),
  logActivity('Ver usuario')
], async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('company', 'name rfc')
      .populate('branches', 'name code address')
      .select('-password -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && user.company._id.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este usuario' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   POST /api/users
// @desc    Crear nuevo usuario
// @access  Private
router.post('/', [
  auth,
  checkPermission('users', 'create'),
  checkSubscriptionLimits('users'),
  body('firstName', 'Nombre es requerido').notEmpty().trim(),
  body('lastName', 'Apellido es requerido').notEmpty().trim(),
  body('email', 'Email válido es requerido').isEmail().normalizeEmail(),
  body('password', 'Contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
  body('role', 'Rol es requerido').isIn(['company_admin', 'branch_manager', 'mechanic', 'operator', 'viewer']),
  body('branches', 'Las sucursales deben ser un array válido').optional().isArray(),
  logActivity('Crear usuario')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      role,
      branches,
      permissions,
      preferences,
      company
    } = req.body;

    const companyId = company || req.user.company._id;

    // Verificar que el email no exista
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    // Verificar que las sucursales pertenecen a la empresa (solo si se proporcionan)
    if (branches && branches.length > 0) {
      const branchDocs = await Branch.find({ _id: { $in: branches }, company: companyId });
      if (branchDocs.length !== branches.length) {
        return res.status(400).json({ message: 'Una o más sucursales no son válidas' });
      }
    }

    // Verificar permisos para crear el rol
    if (req.user.role !== 'super_admin') {
      if (role === 'company_admin' && req.user.role !== 'company_admin') {
        return res.status(403).json({ message: 'No tienes permisos para crear administradores de empresa' });
      }
    }

    const user = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
      company: companyId,
      role,
      branches,
      permissions: permissions || {},
      preferences: preferences || {}
    });

    await user.save();

    const populatedUser = await User.findById(user._id)
      .populate('company', 'name')
      .populate('branches', 'name code')
      .select('-password -resetPasswordToken -resetPasswordExpires');

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: populatedUser
    });

  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   PUT /api/users/:id
// @desc    Actualizar usuario
// @access  Private
router.put('/:id', [
  auth,
  checkPermission('users', 'update'),
  body('firstName', 'Nombre es requerido').optional().notEmpty().trim(),
  body('lastName', 'Apellido es requerido').optional().notEmpty().trim(),
  body('email', 'Email válido es requerido').optional().isEmail().normalizeEmail(),
  body('role', 'Rol inválido').optional().isIn(['company_admin', 'branch_manager', 'mechanic', 'operator', 'viewer']),
  logActivity('Actualizar usuario')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && user.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este usuario' });
    }

    // No permitir que un usuario se modifique a sí mismo ciertos campos
    if (req.user._id.toString() === user._id.toString()) {
      if (req.body.role || req.body.isActive === false) {
        return res.status(400).json({ message: 'No puedes modificar tu propio rol o estado' });
      }
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      branches,
      permissions,
      preferences,
      isActive
    } = req.body;

    // Verificar email único si se está actualizando
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ 
        email,
        _id: { $ne: user._id }
      });
      
      if (existingUser) {
        return res.status(400).json({ message: 'El email ya está registrado' });
      }
    }

    // Verificar sucursales si se están actualizando
    if (branches) {
      const branchDocs = await Branch.find({ _id: { $in: branches }, company: user.company });
      if (branchDocs.length !== branches.length) {
        return res.status(400).json({ message: 'Una o más sucursales no son válidas' });
      }
    }

    // Verificar permisos para cambiar el rol
    if (role && role !== user.role) {
      if (req.user.role !== 'super_admin') {
        if (role === 'company_admin' && req.user.role !== 'company_admin') {
          return res.status(403).json({ message: 'No tienes permisos para asignar el rol de administrador de empresa' });
        }
      }
    }

    const updateData = {};
    
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (role) updateData.role = role;
    if (branches) updateData.branches = branches;
    if (permissions) updateData.permissions = { ...user.permissions, ...permissions };
    if (preferences) updateData.preferences = { ...user.preferences, ...preferences };
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('company', 'name')
     .populate('branches', 'name code')
     .select('-password -resetPasswordToken -resetPasswordExpires');

    res.json({
      message: 'Usuario actualizado exitosamente',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   PUT /api/users/:id/password
// @desc    Cambiar contraseña de usuario
// @access  Private
router.put('/:id/password', [
  auth,
  checkPermission('users', 'update'),
  body('newPassword', 'Nueva contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
  logActivity('Cambiar contraseña de usuario')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const { newPassword } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && user.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este usuario' });
    }

    // Hash de la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(req.params.id, {
      password: hashedPassword,
      passwordChangedAt: new Date()
    });

    res.json({ message: 'Contraseña actualizada exitosamente' });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   PUT /api/users/:id/activate
// @desc    Activar/Desactivar usuario
// @access  Private
router.put('/:id/activate', [
  auth,
  checkPermission('users', 'update'),
  body('isActive', 'Estado es requerido').isBoolean(),
  logActivity('Cambiar estado de usuario')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const { isActive } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && user.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este usuario' });
    }

    // No permitir que un usuario se desactive a sí mismo
    if (req.user._id.toString() === user._id.toString() && !isActive) {
      return res.status(400).json({ message: 'No puedes desactivarte a ti mismo' });
    }

    await User.findByIdAndUpdate(req.params.id, { isActive });

    res.json({ 
      message: `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente` 
    });

  } catch (error) {
    console.error('Error cambiando estado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Eliminar usuario
// @access  Private
router.delete('/:id', [
  auth,
  checkPermission('users', 'delete'),
  logActivity('Eliminar usuario')
], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && user.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este usuario' });
    }

    // No permitir que un usuario se elimine a sí mismo
    if (req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' });
    }

    // Verificar si tiene actividad (mantenimientos asignados, etc.)
    const Maintenance = require('../models/Maintenance');
    const maintenanceCount = await Maintenance.countDocuments({ 
      $or: [
        { assignedTo: user._id },
        { createdBy: user._id }
      ]
    });

    if (maintenanceCount > 0) {
      // Soft delete
      user.isActive = false;
      await user.save();
      
      res.json({ message: 'Usuario desactivado exitosamente (tiene actividad asociada)' });
    } else {
      // Hard delete si no tiene actividad
      await User.findByIdAndDelete(req.params.id);
      res.json({ message: 'Usuario eliminado exitosamente' });
    }

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/users/stats
// @desc    Obtener estadísticas de usuarios
// @access  Private
router.get('/stats/summary', [
  auth,
  checkPermission('users', 'read'),
  logActivity('Ver estadísticas de usuarios')
], async (req, res) => {
  try {
    const { company, branch } = req.query;
    const companyId = company || req.user.company._id;
    
    const matchQuery = { company: companyId };
    
    if (branch) {
      matchQuery.branches = branch;
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      matchQuery.branches = { $in: req.user.branches };
    }

    const [roleStats, statusStats, totalUsers, activeUsers] = await Promise.all([
      User.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$isActive', count: { $sum: 1 } } }
      ]),
      User.countDocuments(matchQuery),
      User.countDocuments({ ...matchQuery, isActive: true })
    ]);

    res.json({
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      byRole: roleStats,
      byStatus: statusStats
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Función auxiliar para obtener descripción del rol
function getRoleDescription(role) {
  const descriptions = {
    'company_admin': 'Acceso completo a toda la empresa y sus sucursales',
    'branch_manager': 'Gestión completa de sucursales asignadas',
    'mechanic': 'Ejecución y registro de mantenimientos',
    'operator': 'Operaciones básicas y consultas',
    'viewer': 'Solo lectura de información'
  };
  return descriptions[role] || '';
}

module.exports = router;