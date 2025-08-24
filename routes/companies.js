const express = require('express');
const { body, validationResult } = require('express-validator');
const Company = require('../models/Company');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Vehicle = require('../models/Vehicle');
const { auth, authorize, checkPermission, logActivity } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/companies
// @desc    Obtener todas las empresas (solo super_admin)
// @access  Private
router.get('/', [
  auth,
  authorize('super_admin'),
  logActivity('Listar empresas')
], async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rfc: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) {
      query.isActive = status === 'active';
    }

    const companies = await Company.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Company.countDocuments(query);

    // Agregar estadísticas para cada empresa
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        const branchCount = await Branch.countDocuments({ company: company._id, isActive: true });
        const vehicleCount = await Vehicle.countDocuments({ company: company._id, isActive: true });
        const userCount = await User.countDocuments({ company: company._id, isActive: true });
        
        return {
          ...company.toObject(),
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
    const company = await Company.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email');

    if (!company) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    // Verificar acceso (super_admin puede ver cualquier empresa)
    if (req.user.role !== 'super_admin' && company._id.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a esta empresa' });
    }

    // Obtener estadísticas
    const [branchCount, vehicleCount, userCount] = await Promise.all([
      Branch.countDocuments({ company: company._id, isActive: true }),
      Vehicle.countDocuments({ company: company._id, isActive: true }),
      User.countDocuments({ company: company._id, isActive: true })
    ]);

    res.json({
      company: {
        ...company.toObject(),
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
  body('rfc', 'RFC es requerido').notEmpty().trim(),
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

    const { name, rfc, address, contact, settings, subscription, limits, adminData } = req.body;

    // Verificar si el RFC ya existe
    const existingCompany = await Company.findOne({ rfc: rfc.toUpperCase() });
    if (existingCompany) {
      return res.status(400).json({ message: 'El RFC ya está registrado' });
    }

    // Verificar si el email del administrador ya existe
    const existingUser = await User.findOne({ email: adminData.email });
    if (existingUser) {
      return res.status(400).json({ message: 'El email del administrador ya está registrado' });
    }

    // Crear la empresa
    const company = new Company({
      name,
      rfc: rfc.toUpperCase(),
      address,
      contact,
      settings,
      subscription,
      limits,
      createdBy: req.user._id
    });

    await company.save();

    // Crear el usuario administrador
    const adminUser = new User({
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      email: adminData.email,
      phone: adminData.phone,
      password: adminData.password,
      role: 'company_admin',
      company: company._id,
      isActive: true,
      createdBy: req.user._id
    });

    await adminUser.save();

    // Crear sucursal principal
    const mainBranch = new Branch({
      name: 'Sucursal Principal',
      code: 'MAIN',
      company: company._id,
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
      createdBy: req.user._id
    });

    await mainBranch.save();

    // Asignar la sucursal principal al administrador
    adminUser.branches = [mainBranch._id];
    await adminUser.save();

    const populatedCompany = await Company.findById(company._id)
      .populate('createdBy', 'firstName lastName email');

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
  body('rfc', 'RFC es requerido').optional().notEmpty().trim(),
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

    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && company._id.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a esta empresa' });
    }

    const { name, rfc, address, contact, settings, subscription } = req.body;

    // Si se está actualizando el RFC, verificar que no exista
    if (rfc && rfc.toUpperCase() !== company.rfc) {
      const existingCompany = await Company.findOne({ rfc: rfc.toUpperCase() });
      if (existingCompany) {
        return res.status(400).json({ message: 'El RFC ya está registrado' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (rfc) updateData.rfc = rfc.toUpperCase();
    if (address) updateData.address = { ...company.address, ...address };
    if (contact) updateData.contact = { ...company.contact, ...contact };
    if (settings) updateData.settings = { ...company.settings, ...settings };
    if (subscription && req.user.role === 'super_admin') {
      updateData.subscription = { ...company.subscription, ...subscription };
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('createdBy', 'firstName lastName email');

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
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    // Verificar si tiene datos dependientes
    const [branchCount, vehicleCount, userCount] = await Promise.all([
      Branch.countDocuments({ company: company._id }),
      Vehicle.countDocuments({ company: company._id }),
      User.countDocuments({ company: company._id })
    ]);

    if (branchCount > 0 || vehicleCount > 0 || userCount > 0) {
      // Soft delete
      company.isActive = false;
      await company.save();
      
      // Desactivar usuarios de la empresa
      await User.updateMany(
        { company: company._id },
        { isActive: false }
      );
      
      res.json({ message: 'Empresa desactivada exitosamente' });
    } else {
      // Hard delete si no tiene datos dependientes
      await Company.findByIdAndDelete(req.params.id);
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
    
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    // Activar/desactivar usuarios de la empresa
    await User.updateMany(
      { company: company._id },
      { isActive }
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
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && company._id.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a esta empresa' });
    }

    const Maintenance = require('../models/Maintenance');
    
    // Obtener estadísticas generales
    const [stats, recentMaintenances, upcomingMaintenances] = await Promise.all([
      // Estadísticas generales
      Promise.all([
        Branch.countDocuments({ company: company._id, isActive: true }),
        Vehicle.countDocuments({ company: company._id, isActive: true }),
        User.countDocuments({ company: company._id, isActive: true }),
        Maintenance.countDocuments({ company: company._id, status: 'en_proceso' }),
        Maintenance.countDocuments({ 
          company: company._id, 
          scheduledDate: { $lt: new Date() },
          status: 'programado'
        })
      ]),
      
      // Mantenimientos recientes
      Maintenance.find({ company: company._id })
        .populate('vehicle', 'plateNumber make model')
        .populate('branch', 'name')
        .populate('assignedTo', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(5),
        
      // Próximos mantenimientos
      Maintenance.find({ 
        company: company._id,
        status: 'programado',
        scheduledDate: { $gte: new Date() }
      })
        .populate('vehicle', 'plateNumber make model')
        .populate('branch', 'name')
        .sort({ scheduledDate: 1 })
        .limit(5)
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