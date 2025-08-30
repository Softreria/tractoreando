const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const User = require('../models/User');
const Company = require('../models/Company');
const Branch = require('../models/Branch');
const { auth, requireRole, checkPermission, checkCompanyAccess, logActivity } = require('../middleware/auth');
const { checkCompanyAdmin, checkSameCompanyUser, checkUserLimits, validateAssignableRoles } = require('../middleware/companyAdmin');

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
    
    const whereConditions = {};
    
    // Filtrar por empresa
    if (req.user.role === 'super_admin') {
      if (company) {
        whereConditions.companyId = company;
      }
    } else {
      whereConditions.companyId = req.user.companyId;
    }
    
    if (search) {
      whereConditions[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (role) {
      whereConditions.role = role;
    }
    
    if (branch) {
      whereConditions.branchId = branch;
    }
    
    if (status !== undefined) {
      whereConditions.isActive = status === 'true';
    }

    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      whereConditions.branchId = req.user.branchId;
    }

    const users = await User.findAll({
      where: whereConditions,
      include: [
        { model: Company, attributes: ['name'] },
        { model: Branch, attributes: ['name', 'code'] }
      ],
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    const total = await User.count({ where: whereConditions });

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

// @route   GET /api/users/activity
// @desc    Obtener historial de actividad del usuario actual
// @access  Private
router.get('/activity', [
  auth,
  logActivity('Ver historial de actividad')
], async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // Por ahora retornamos datos simulados ya que no hay un modelo de Activity
    // En el futuro se puede implementar un sistema de logging más sofisticado
    const mockActivity = [
      {
        id: 1,
        action: 'Inicio de sesión',
        description: 'Usuario inició sesión en el sistema',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutos atrás
        type: 'auth',
        ip: req.ip || '127.0.0.1'
      },
      {
        id: 2,
        action: 'Actualización de perfil',
        description: 'Usuario actualizó información del perfil',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 horas atrás
        type: 'profile',
        ip: req.ip || '127.0.0.1'
      },
      {
        id: 3,
        action: 'Consulta de vehículos',
        description: 'Usuario consultó la lista de vehículos',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 horas atrás
        type: 'view',
        ip: req.ip || '127.0.0.1'
      }
    ];

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedActivity = mockActivity.slice(startIndex, endIndex);

    res.json({
      activity: paginatedActivity,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(mockActivity.length / limit),
        total: mockActivity.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo historial de actividad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/users/:id
// @desc    Obtener usuario por ID
// @access  Private
router.get('/:id', [
  auth,
  checkPermission('users', 'read'),
  logActivity('Ver usuario')
], async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        { model: Company, attributes: ['name', 'rfc'] },
        { model: Branch, attributes: ['name', 'code', 'address'] }
      ],
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && user.companyId !== req.user.companyId) {
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
  checkCompanyAdmin,
  checkPermission('users', 'create'),
  checkUserLimits,
  validateAssignableRoles,
  body('name', 'Nombre es requerido').notEmpty().trim(),
  body('lastName', 'Apellido es requerido').notEmpty().trim(),
  body('email', 'Email válido es requerido').isEmail().normalizeEmail(),
  body('password', 'Contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
  body('role', 'Rol es requerido').isIn(['company_admin', 'branch_manager', 'mechanic', 'operator', 'viewer']),
  body('branch', 'La sucursal debe ser un ID válido').optional().isUUID(),
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
      name,
      lastName,
      email,
      password,
      phone,
      role,
      branch,
      permissions,
      preferences,
      company
    } = req.body;

    const companyId = company || req.user.companyId;

    // Verificar que el email no exista
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    // Verificar que la sucursal pertenece a la empresa (solo si se proporciona)
    if (branch) {
      const branchDoc = await Branch.findOne({ where: { id: branch, companyId: companyId } });
      if (!branchDoc) {
        return res.status(400).json({ message: 'La sucursal no es válida' });
      }
    }

    // Verificar permisos para crear el rol
    if (req.user.role !== 'super_admin') {
      if (role === 'company_admin' && req.user.role !== 'company_admin') {
        return res.status(403).json({ message: 'No tienes permisos para crear administradores de empresa' });
      }
    }

    const user = await User.create({
      name,
      lastName,
      email,
      password,
      phone,
      companyId: companyId,
      role,
      branchId: branch,
      permissions: permissions || {},
      preferences: preferences || {}
    });

    const populatedUser = await User.findByPk(user.id, {
      include: [
        { model: Company, attributes: ['name'] },
        { model: Branch, attributes: ['name', 'code'] }
      ],
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] }
    });

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
  checkCompanyAdmin,
  checkSameCompanyUser,
  checkPermission('users', 'update'),
  validateAssignableRoles,
  body('name', 'Nombre es requerido').optional().notEmpty().trim(),
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

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && user.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este usuario' });
    }

    // No permitir que un usuario se modifique a sí mismo ciertos campos
    if (req.user.id === user.id) {
      if (req.body.role || req.body.isActive === false) {
        return res.status(400).json({ message: 'No puedes modificar tu propio rol o estado' });
      }
    }

    const {
      name,
      lastName,
      email,
      phone,
      role,
      branch,
      permissions,
      preferences,
      isActive
    } = req.body;

    // Verificar email único si se está actualizando
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ 
        where: {
          email,
          id: { [Op.ne]: user.id }
        }
      });
      
      if (existingUser) {
        return res.status(400).json({ message: 'El email ya está registrado' });
      }
    }

    // Verificar sucursal si se está actualizando
    if (branch) {
      const branchDoc = await Branch.findOne({ where: { id: branch, companyId: user.companyId } });
      if (!branchDoc) {
        return res.status(400).json({ message: 'La sucursal no es válida' });
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
    
    if (name) updateData.name = name;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (role) updateData.role = role;
    if (branch) updateData.branchId = branch;
    if (permissions) updateData.permissions = { ...user.permissions, ...permissions };
    if (preferences) updateData.preferences = { ...user.preferences, ...preferences };
    if (isActive !== undefined) updateData.isActive = isActive;

    await user.update(updateData);

    const updatedUser = await User.findByPk(req.params.id, {
      include: [
        { model: Company, attributes: ['name'] },
        { model: Branch, attributes: ['name', 'code'] }
      ],
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] }
    });

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
  checkCompanyAdmin,
  checkSameCompanyUser,
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
    
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && user.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este usuario' });
    }

    // Hash de la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await user.update({
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
  checkCompanyAdmin,
  checkSameCompanyUser,
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
    
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && user.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este usuario' });
    }

    // No permitir que un usuario se desactive a sí mismo
    if (req.user.id === user.id && !isActive) {
      return res.status(400).json({ message: 'No puedes desactivarte a ti mismo' });
    }

    await user.update({ isActive });

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
  checkCompanyAdmin,
  checkSameCompanyUser,
  checkPermission('users', 'delete'),
  logActivity('Eliminar usuario')
], async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && user.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este usuario' });
    }

    // No permitir que un usuario se elimine a sí mismo
    if (req.user.id === user.id) {
      return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' });
    }

    // Verificar si tiene actividad (mantenimientos asignados, etc.)
    const Maintenance = require('../models/Maintenance');
    const maintenanceCount = await Maintenance.count({ 
      where: {
        [Op.or]: [
          { assignedToId: user.id },
          { createdById: user.id }
        ]
      }
    });

    if (maintenanceCount > 0) {
      // Soft delete
      await user.update({ isActive: false });
      
      res.json({ message: 'Usuario desactivado exitosamente (tiene actividad asociada)' });
    } else {
      // Hard delete si no tiene actividad
      await user.destroy();
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
    const companyId = company || req.user.companyId;
    
    const matchQuery = { company: companyId };
    
    if (branch) {
      matchQuery.branch = branch;
    }
    
    // Filtrar por sucursal del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      matchQuery.branch = req.user.branch;
    }

    // Convertir matchQuery de MongoDB a condiciones de Sequelize
    const whereConditions = {};
    if (matchQuery.company) {
      whereConditions.companyId = matchQuery.company;
    }
    if (matchQuery.branch) {
      whereConditions.branchId = matchQuery.branch;
    }

    const [roleStats, statusStats, totalUsers, activeUsers] = await Promise.all([
      // Estadísticas por rol
      User.findAll({
        attributes: [
          'role',
          [User.sequelize.fn('COUNT', '*'), 'count']
        ],
        where: whereConditions,
        group: ['role'],
        raw: true
      }),
      // Estadísticas por estado
      User.findAll({
        attributes: [
          'isActive',
          [User.sequelize.fn('COUNT', '*'), 'count']
        ],
        where: whereConditions,
        group: ['isActive'],
        raw: true
      }),
      // Total de usuarios
      User.count({ where: whereConditions }),
      // Usuarios activos
      User.count({ where: { ...whereConditions, isActive: true } })
    ]);

    // Formatear los resultados para mantener compatibilidad con el frontend
    const formattedRoleStats = roleStats.map(stat => ({
      _id: stat.role,
      count: parseInt(stat.count)
    }));
    
    const formattedStatusStats = statusStats.map(stat => ({
      _id: stat.isActive,
      count: parseInt(stat.count)
    }));

    res.json({
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      byRole: formattedRoleStats,
      byStatus: formattedStatusStats
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