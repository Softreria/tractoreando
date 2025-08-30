const express = require('express');
const { body, validationResult } = require('express-validator');
const Company = require('../models/Company');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Vehicle = require('../models/Vehicle');
const { auth, authorize, checkPermission, logActivity } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/companies
// @desc    Obtener empresas (super_admin ve todas, otros ven solo la suya)
// @access  Private
router.get('/', [
  auth,
  checkPermission('companies', 'read'),
  logActivity('Listar empresas')
], async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    
    const { Op } = require('sequelize');
    const whereClause = {};
    
    // Si no es super_admin, solo puede ver su propia empresa
    if (req.user.role !== 'super_admin') {
      whereClause.id = req.user.companyId;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { cif: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (status) {
      whereClause.isActive = status === 'active';
    }

    const companies = await Company.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'createdBy',
        attributes: ['firstName', 'lastName', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    const total = await Company.count({ where: whereClause });

    // Agregar estadísticas para cada empresa
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        const branchCount = await Branch.count({ where: { companyId: company.id, isActive: true } });
        const vehicleCount = await Vehicle.count({ where: { companyId: company.id, isActive: true } });
        const userCount = await User.count({ where: { companyId: company.id, isActive: true } });
        
        return {
          ...company.toJSON(),
          stats: {
            branches: branchCount,
            vehicles: vehicleCount,
            users: userCount
          }
        };
      })
    );

    res.json({
      companies: companiesWithStats,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Error obteniendo empresas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/companies/:id
// @desc    Obtener empresa por ID
// @access  Private
router.get('/:id', [
  auth,
  checkPermission('companies', 'read'),
  logActivity('Ver empresa')
], async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['firstName', 'lastName', 'email']
      }]
    });

    if (!company) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    // Verificar acceso (super_admin puede ver cualquier empresa)
    if (req.user.role !== 'super_admin' && company.id.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a esta empresa' });
    }

    // Obtener estadísticas
    const [branchCount, vehicleCount, userCount] = await Promise.all([
      Branch.count({ where: { companyId: company.id, isActive: true } }),
      Vehicle.count({ where: { companyId: company.id, isActive: true } }),
      User.count({ where: { companyId: company.id, isActive: true } })
    ]);

    res.json({
      company: {
        ...company.toJSON(),
        stats: {
          branches: branchCount,
          vehicles: vehicleCount,
          users: userCount
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo empresa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   POST /api/companies
// @desc    Crear nueva empresa con administrador (solo super_admin)
// @access  Private
router.post('/', [
  auth,
  authorize('super_admin'),
  checkPermission('companies', 'create'),
  body('name', 'Nombre de empresa es requerido').notEmpty().trim(),
  body('cif', 'CIF es requerido').notEmpty().trim(),
  body('adminData.firstName', 'Nombre del administrador es requerido').notEmpty().trim(),
  body('adminData.lastName', 'Apellidos del administrador es requerido').notEmpty().trim(),
  body('adminData.email', 'Email del administrador es requerido').isEmail().normalizeEmail(),
  body('adminData.password', 'Contraseña del administrador es requerida').isLength({ min: 6 }),
  logActivity('Crear empresa')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const { name, cif, address, contact, settings, administrator, adminData } = req.body;

    // Verificar si el CIF ya existe
    const existingCompany = await Company.findOne({ where: { cif: cif.toUpperCase() } });
    if (existingCompany) {
      return res.status(400).json({ message: 'El CIF ya está registrado' });
    }

    // Verificar si el email del administrador ya existe
    const existingUser = await User.findOne({ where: { email: adminData.email } });
    if (existingUser) {
      return res.status(400).json({ message: 'El email del administrador ya está registrado' });
    }

    // Crear la empresa
    const company = await Company.create({
      name,
      cif: cif.toUpperCase(),
      address,
      contact,
      settings,
      administrator: {
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        email: adminData.email,
        phone: adminData.phone,
        canManageUsers: administrator?.canManageUsers !== false
      },
      createdBy: req.user.id
    });

    // Crear el usuario administrador
    const adminUser = await User.create({
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      email: adminData.email,
      phone: adminData.phone,
      password: adminData.password,
      role: 'company_admin',
      companyId: company.id,
      isActive: true,
      createdBy: req.user.id
    });

    // Crear sucursal principal
    const mainBranch = await Branch.create({
      name: 'Sucursal Principal',
      code: 'MAIN',
      companyId: company.id,
      address: {
        street: address?.street || 'Por definir',
        city: address?.city || 'Por definir',
        state: address?.state || 'Por definir',
        zipCode: address?.zipCode || '00000',
        country: address?.country || 'España'
      },
      contact: {
        phone: contact?.phone || '',
        email: contact?.email || adminData.email
      },
      isActive: true,
      createdBy: req.user.id
    });

    // Asignar la sucursal principal al administrador
    await adminUser.update({ branchId: mainBranch.id });

    const populatedCompany = await Company.findByPk(company.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['firstName', 'lastName', 'email']
      }]
    });

    res.status(201).json({
      message: 'Empresa y administrador creados exitosamente',
      company: populatedCompany
    });

  } catch (error) {
    console.error('Error creando empresa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   PUT /api/companies/:id
// @desc    Actualizar empresa
// @access  Private
router.put('/:id', [
  auth,
  checkPermission('companies', 'update'),
  body('name', 'Nombre de empresa es requerido').optional().notEmpty().trim(),
  body('cif', 'CIF es requerido').optional().notEmpty().trim(),
  logActivity('Actualizar empresa')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const company = await Company.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && company.id.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a esta empresa' });
    }

    const { name, cif, address, contact, settings, administrator } = req.body;

    // Si se está actualizando el CIF, verificar que no exista
    if (cif && cif.toUpperCase() !== company.cif) {
      const existingCompany = await Company.findOne({ where: { cif: cif.toUpperCase() } });
      if (existingCompany) {
        return res.status(400).json({ message: 'El CIF ya está registrado' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (cif) updateData.cif = cif.toUpperCase();
    if (address) updateData.address = { ...company.address, ...address };
    if (contact) updateData.contact = { ...company.contact, ...contact };
    if (settings) updateData.settings = { ...company.settings, ...settings };
    if (administrator) updateData.administrator = { ...company.administrator, ...administrator };

    await company.update(updateData);
    
    const updatedCompany = await Company.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['firstName', 'lastName', 'email']
      }]
    });

    res.json({
      message: 'Empresa actualizada exitosamente',
      company: updatedCompany
    });

  } catch (error) {
    console.error('Error actualizando empresa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   DELETE /api/companies/:id
// @desc    Eliminar empresa (soft delete)
// @access  Private
router.delete('/:id', [
  auth,
  authorize('super_admin'),
  checkPermission('companies', 'delete'),
  logActivity('Eliminar empresa')
], async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    // Verificar si tiene datos dependientes
    const [branchCount, vehicleCount, userCount] = await Promise.all([
      Branch.count({ where: { companyId: company.id } }),
      Vehicle.count({ where: { companyId: company.id } }),
      User.count({ where: { companyId: company.id } })
    ]);

    if (branchCount > 0 || vehicleCount > 0 || userCount > 0) {
      // Soft delete
      await company.update({ isActive: false });
      
      // Desactivar usuarios de la empresa
      await User.update(
        { isActive: false },
        { where: { companyId: company.id } }
      );
      
      res.json({ message: 'Empresa desactivada exitosamente' });
    } else {
      // Hard delete si no tiene datos dependientes
      await company.destroy();
      res.json({ message: 'Empresa eliminada exitosamente' });
    }

  } catch (error) {
    console.error('Error eliminando empresa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   PUT /api/companies/:id/activate
// @desc    Activar/desactivar empresa
// @access  Private
router.put('/:id/activate', [
  auth,
  authorize('super_admin'),
  body('isActive', 'Estado es requerido').isBoolean(),
  logActivity('Cambiar estado de empresa')
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
    
    const company = await Company.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    await company.update({ isActive });

    // Activar/desactivar usuarios de la empresa
    await User.update(
      { isActive },
      { where: { companyId: company.id } }
    );

    res.json({
      message: `Empresa ${isActive ? 'activada' : 'desactivada'} exitosamente`,
      company
    });

  } catch (error) {
    console.error('Error cambiando estado de empresa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/companies/:id/dashboard
// @desc    Obtener datos del dashboard de la empresa
// @access  Private
router.get('/:id/dashboard', [
  auth,
  checkPermission('companies', 'read'),
  logActivity('Ver dashboard de empresa')
], async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && company.id.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a esta empresa' });
    }

    const Maintenance = require('../models/Maintenance');
    
    // Obtener estadísticas generales
    const [stats, recentMaintenances, upcomingMaintenances] = await Promise.all([
      // Estadísticas generales
      Promise.all([
        Branch.count({ where: { companyId: company.id, isActive: true } }),
        Vehicle.count({ where: { companyId: company.id, isActive: true } }),
        User.count({ where: { companyId: company.id, isActive: true } }),
        Maintenance.count({ where: { companyId: company.id, status: 'en_proceso' } }),
        Maintenance.count({ 
          where: { 
            companyId: company.id, 
            scheduledDate: { [require('sequelize').Op.lt]: new Date() },
            status: 'programado'
          }
        })
      ]),
      
      // Mantenimientos recientes
      Maintenance.findAll({
        where: { companyId: company.id },
        include: [
          { model: Vehicle, attributes: ['plateNumber', 'make', 'model'] },
          { model: Branch, attributes: ['name'] },
          { model: User, as: 'assignedTo', attributes: ['firstName', 'lastName'] }
        ],
        order: [['createdAt', 'DESC']],
        limit: 5
      }),
        
      // Próximos mantenimientos
      Maintenance.findAll({
        where: { 
          companyId: company.id,
          status: 'programado',
          scheduledDate: { [require('sequelize').Op.gte]: new Date() }
        },
        include: [
          { model: Vehicle, attributes: ['plateNumber', 'make', 'model'] },
          { model: Branch, attributes: ['name'] }
        ],
        order: [['scheduledDate', 'ASC']],
        limit: 5
      })
    ]);

    const [branchCount, vehicleCount, userCount, activeMaintenances, overdueMaintenances] = stats;

    res.json({
      stats: {
        branches: branchCount,
        vehicles: vehicleCount,
        users: userCount,
        activeMaintenances,
        overdueMaintenances
      },
      recentMaintenances,
      upcomingMaintenances
    });

  } catch (error) {
    console.error('Error obteniendo dashboard:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;