const express = require('express');
const { body, validationResult } = require('express-validator');
const Branch = require('../models/Branch');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const { auth, checkPermission, checkCompanyAccess, checkSubscriptionLimits, logActivity } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/branches
// @desc    Obtener delegaciones de la empresa
// @access  Private
router.get('/', [
  auth,
  checkPermission('branches', 'read'),
  logActivity('Listar delegaciones')
], async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, company } = req.query;
    
    const query = { company: company || req.user.company._id };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.isActive = status === 'active';
    }

    // Filtrar por delegaciones del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      query._id = { $in: req.user.branches };
    }

    const branches = await Branch.find(query)
      .populate('company', 'name')
      .populate('createdBy', 'name lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Branch.countDocuments(query);

    // Agregar estadísticas para cada delegación
    const branchesWithStats = await Promise.all(
      branches.map(async (branch) => {
        const vehicleCount = await Vehicle.countDocuments({ branch: branch._id, isActive: true });
        const userCount = await User.countDocuments({ branches: branch._id, isActive: true });
        
        const Maintenance = require('../models/Maintenance');
        const activeMaintenances = await Maintenance.countDocuments({ 
          branch: branch._id, 
          status: { $in: ['programado', 'en_proceso'] }
        });
        
        return {
          ...branch.toObject(),
          stats: {
            vehicles: vehicleCount,
            users: userCount,
            activeMaintenances
          }
        };
      })
    );

    res.json({
      branches: branchesWithStats,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Error obteniendo sucursales:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/branches/:id
// @desc    Obtener sucursal por ID
// @access  Private
router.get('/:id', [
  auth,
  checkPermission('branches', 'read'),
  logActivity('Ver delegación')
], async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id)
      .populate('company', 'name rfc')
      .populate('createdBy', 'name lastName email');

    if (!branch) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && branch.company._id.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
    }

    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      const hasAccess = req.user.branches.some(userBranch => userBranch._id.toString() === branch._id.toString());
      if (!hasAccess) {
        return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
      }
    }

    // Obtener estadísticas
    const Maintenance = require('../models/Maintenance');
    const [vehicleCount, userCount, activeMaintenances, completedMaintenances] = await Promise.all([
      Vehicle.countDocuments({ branch: branch._id, isActive: true }),
      User.countDocuments({ branches: branch._id, isActive: true }),
      Maintenance.countDocuments({ branch: branch._id, status: { $in: ['programado', 'en_proceso'] } }),
      Maintenance.countDocuments({ branch: branch._id, status: 'completado' })
    ]);

    res.json({
      branch: {
        ...branch.toObject(),
        stats: {
          vehicles: vehicleCount,
          users: userCount,
          activeMaintenances,
          completedMaintenances
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo sucursal:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   POST /api/branches
// @desc    Crear nueva sucursal
// @access  Private
router.post('/', [
  auth,
  checkPermission('branches', 'create'),
  checkSubscriptionLimits('branches'),
  body('name', 'Nombre de delegación es requerido').notEmpty().trim(),
  body('code', 'Código de delegación es requerido').notEmpty().trim(),
  body('address.street', 'Dirección es requerida').notEmpty().trim(),
  body('address.city', 'Ciudad es requerida').notEmpty().trim(),
  body('address.state', 'Estado es requerido').notEmpty().trim(),
  body('address.zipCode', 'Código postal es requerido').notEmpty().trim(),
  logActivity('Crear delegación')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const { name, code, address, contact, operatingHours } = req.body;
    const companyId = req.body.company || req.user.company._id;

    // Verificar que el código no exista en la empresa
    const existingBranch = await Branch.findOne({ 
      company: companyId, 
      code: code.toUpperCase() 
    });
    
    if (existingBranch) {
      return res.status(400).json({ message: 'El código de sucursal ya existe en esta empresa' });
    }

    const branch = new Branch({
      name,
      code: code.toUpperCase(),
      company: companyId,
      address,
      contact,
      operatingHours,
      createdBy: req.user._id
    });

    await branch.save();

    const populatedBranch = await Branch.findById(branch._id)
      .populate('company', 'name')
      .populate('createdBy', 'name lastName');

    res.status(201).json({
      message: 'Sucursal creada exitosamente',
      branch: populatedBranch
    });

  } catch (error) {
    console.error('Error creando sucursal:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   PUT /api/branches/:id
// @desc    Actualizar sucursal
// @access  Private
router.put('/:id', [
  auth,
  checkPermission('branches', 'update'),
  body('name', 'Nombre de delegación es requerido').optional().notEmpty().trim(),
  body('code', 'Código de delegación es requerido').optional().notEmpty().trim(),
  logActivity('Actualizar delegación')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && branch.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
    }

    const { name, code, address, contact, operatingHours } = req.body;

    // Si se está actualizando el código, verificar que no exista
    if (code && code.toUpperCase() !== branch.code) {
      const existingBranch = await Branch.findOne({ 
        company: branch.company, 
        code: code.toUpperCase(),
        _id: { $ne: branch._id }
      });
      
      if (existingBranch) {
        return res.status(400).json({ message: 'El código de sucursal ya existe en esta empresa' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (code) updateData.code = code.toUpperCase();
    if (address) updateData.address = { ...branch.address, ...address };
    if (contact) updateData.contact = { ...branch.contact, ...contact };
    if (operatingHours) updateData.operatingHours = { ...branch.operatingHours, ...operatingHours };


    const updatedBranch = await Branch.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('company', 'name')
     .populate('createdBy', 'name lastName');

    res.json({
      message: 'Sucursal actualizada exitosamente',
      branch: updatedBranch
    });

  } catch (error) {
    console.error('Error actualizando sucursal:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   DELETE /api/branches/:id
// @desc    Eliminar sucursal
// @access  Private
router.delete('/:id', [
  auth,
  checkPermission('branches', 'delete'),
  logActivity('Eliminar delegación')
], async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && branch.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
    }

    // Verificar si tiene datos dependientes
    const [vehicleCount, userCount] = await Promise.all([
      Vehicle.countDocuments({ branch: branch._id }),
      User.countDocuments({ branches: branch._id })
    ]);

    if (vehicleCount > 0 || userCount > 0) {
      // Soft delete
      branch.isActive = false;
      await branch.save();
      
      res.json({ message: 'Sucursal desactivada exitosamente' });
    } else {
      // Hard delete si no tiene datos dependientes
      await Branch.findByIdAndDelete(req.params.id);
      res.json({ message: 'Sucursal eliminada exitosamente' });
    }

  } catch (error) {
    console.error('Error eliminando sucursal:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   PUT /api/branches/:id/activate
// @desc    Activar/desactivar sucursal
// @access  Private
router.put('/:id/activate', [
  auth,
  checkPermission('branches', 'update'),
  body('isActive', 'Estado es requerido').isBoolean(),
  logActivity('Cambiar estado de delegación')
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
    
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && branch.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
    }

    branch.isActive = isActive;
    await branch.save();

    res.json({
      message: `Sucursal ${isActive ? 'activada' : 'desactivada'} exitosamente`,
      branch
    });

  } catch (error) {
    console.error('Error cambiando estado de sucursal:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/branches/:id/dashboard
// @desc    Obtener datos del dashboard de la sucursal
// @access  Private
router.get('/:id/dashboard', [
  auth,
  checkPermission('branches', 'read'),
  logActivity('Ver dashboard de delegación')
], async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && branch.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
    }

    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      const hasAccess = req.user.branches.some(userBranch => userBranch._id.toString() === branch._id.toString());
      if (!hasAccess) {
        return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
      }
    }

    const Maintenance = require('../models/Maintenance');
    
    // Obtener estadísticas
    const [stats, recentMaintenances, todayMaintenances] = await Promise.all([
      // Estadísticas generales
      Promise.all([
        Vehicle.countDocuments({ branch: branch._id, isActive: true }),
        User.countDocuments({ branches: branch._id, isActive: true }),
        Maintenance.countDocuments({ branch: branch._id, status: 'en_proceso' }),
        Maintenance.countDocuments({ 
          branch: branch._id, 
          scheduledDate: { $lt: new Date() },
          status: 'programado'
        }),
        Vehicle.countDocuments({ branch: branch._id, status: 'en_mantenimiento' })
      ]),
      
      // Mantenimientos recientes
      Maintenance.find({ branch: branch._id })
        .populate('vehicle', 'plateNumber make model')
        .populate('assignedTo', 'name lastName')
        .sort({ createdAt: -1 })
        .limit(5),
        
      // Mantenimientos de hoy
      Maintenance.find({ 
        branch: branch._id,
        scheduledDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      })
        .populate('vehicle', 'plateNumber make model')
        .populate('assignedTo', 'name lastName')
        .sort({ scheduledDate: 1 })
    ]);

    const [vehicleCount, userCount, activeMaintenances, overdueMaintenances, vehiclesInMaintenance] = stats;

    res.json({
      stats: {
        vehicles: vehicleCount,
        users: userCount,
        activeMaintenances,
        overdueMaintenances,
        vehiclesInMaintenance
      },
      recentMaintenances,
      todayMaintenances,
      isOpenNow: branch.isOpenNow()
    });

  } catch (error) {
    console.error('Error obteniendo dashboard de sucursal:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/branches/:id/vehicles
// @desc    Obtener vehículos de la sucursal
// @access  Private
router.get('/:id/vehicles', [
  auth,
  checkPermission('vehicles', 'read'),
  logActivity('Listar vehículos de delegación')
], async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && branch.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
    }

    const query = { branch: branch._id };
    if (status) {
      query.status = status;
    }

    const vehicles = await Vehicle.find(query)
      .populate('createdBy', 'name lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Vehicle.countDocuments(query);

    res.json({
      vehicles,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Error obteniendo vehículos de sucursal:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;