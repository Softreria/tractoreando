const express = require('express');
const { body, validationResult } = require('express-validator');
const Maintenance = require('../models/Maintenance');
const Vehicle = require('../models/Vehicle');
const Branch = require('../models/Branch');
const { auth, checkPermission, checkCompanyAccess, checkBranchAccess, logActivity } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/maintenance
// @desc    Obtener mantenimientos
// @access  Private
router.get('/', [
  auth,
  checkPermission('maintenance', 'read'),
  logActivity('Listar mantenimientos')
], async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status, 
      priority, 
      type, 
      branch, 
      vehicle, 
      assignedTo,
      dateFrom,
      dateTo,
      company 
    } = req.query;
    
    const query = { company: company || req.user.company._id };
    
    if (search) {
      query.$or = [
        { workOrderNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'services.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    if (priority) {
      query.priority = priority;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (branch) {
      query.branch = branch;
    }
    
    if (vehicle) {
      query.vehicle = vehicle;
    }
    
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    
    if (dateFrom || dateTo) {
      query.scheduledDate = {};
      if (dateFrom) query.scheduledDate.$gte = new Date(dateFrom);
      if (dateTo) query.scheduledDate.$lte = new Date(dateTo);
    }

    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      query.branch = { $in: req.user.branches };
    }

    const maintenances = await Maintenance.find(query)
      .populate('vehicle', 'plateNumber make model year')
      .populate('company', 'name')
      .populate('branch', 'name code')
      .populate('assignedTo', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ scheduledDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Maintenance.countDocuments(query);

    res.json({
      maintenances,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Error obteniendo mantenimientos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/maintenance/:id
// @desc    Obtener mantenimiento por ID
// @access  Private
router.get('/:id', [
  auth,
  checkPermission('maintenance', 'read'),
  logActivity('Ver mantenimiento')
], async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id)
      .populate('vehicle', 'plateNumber make model year vin odometer')
      .populate('company', 'name rfc')
      .populate('branch', 'name code address')
      .populate('assignedTo', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName email')
      .populate('approvals.approvedBy', 'firstName lastName')
      .populate('timeTracking.user', 'firstName lastName');

    if (!maintenance) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && maintenance.company._id.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este mantenimiento' });
    }

    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      const hasAccess = req.user.branches.some(userBranch => userBranch._id.toString() === maintenance.branch._id.toString());
      if (!hasAccess) {
        return res.status(403).json({ message: 'No tienes acceso a este mantenimiento' });
      }
    }

    res.json({ maintenance });

  } catch (error) {
    console.error('Error obteniendo mantenimiento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   POST /api/maintenance
// @desc    Crear nuevo mantenimiento
// @access  Private
router.post('/', [
  auth,
  checkPermission('maintenance', 'create'),
  body('vehicle', 'Vehículo es requerido').isMongoId(),
  body('type', 'Tipo de mantenimiento es requerido').notEmpty(),
  body('priority', 'Prioridad es requerida').isIn(['baja', 'media', 'alta', 'critica']),
  body('scheduledDate', 'Fecha programada es requerida').isISO8601(),
  body('description', 'Descripción es requerida').notEmpty().trim(),
  logActivity('Crear mantenimiento')
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
      vehicle,
      type,
      priority,
      scheduledDate,
      description,
      services,
      parts,
      estimatedCost,
      assignedTo,
      notes,
      branch
    } = req.body;

    const companyId = req.body.company || req.user.company._id;

    // Verificar que el vehículo existe y pertenece a la empresa
    const vehicleDoc = await Vehicle.findOne({ _id: vehicle, company: companyId });
    if (!vehicleDoc) {
      return res.status(400).json({ message: 'Vehículo no válido' });
    }

    // Usar la sucursal del vehículo si no se especifica
    const branchId = branch || vehicleDoc.branch;

    // Verificar que la sucursal pertenece a la empresa
    const branchDoc = await Branch.findOne({ _id: branchId, company: companyId });
    if (!branchDoc) {
      return res.status(400).json({ message: 'Sucursal no válida' });
    }

    const maintenance = new Maintenance({
      vehicle,
      company: companyId,
      branch: branchId,
      type,
      priority,
      scheduledDate: new Date(scheduledDate),
      description,
      services: services || [],
      parts: parts || [],
      costs: {
        estimated: estimatedCost || 0
      },
      assignedTo,
      notes,
      createdBy: req.user._id
    });

    await maintenance.save();

    const populatedMaintenance = await Maintenance.findById(maintenance._id)
      .populate('vehicle', 'plateNumber make model year')
      .populate('company', 'name')
      .populate('branch', 'name code')
      .populate('assignedTo', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      message: 'Mantenimiento creado exitosamente',
      maintenance: populatedMaintenance
    });

  } catch (error) {
    console.error('Error creando mantenimiento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   PUT /api/maintenance/:id
// @desc    Actualizar mantenimiento
// @access  Private
router.put('/:id', [
  auth,
  checkPermission('maintenance', 'update'),
  body('priority', 'Prioridad inválida').optional().isIn(['baja', 'media', 'alta', 'critica']),
  body('scheduledDate', 'Fecha programada inválida').optional().isISO8601(),
  logActivity('Actualizar mantenimiento')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && maintenance.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este mantenimiento' });
    }

    const {
      type,
      priority,
      scheduledDate,
      description,
      services,
      parts,
      assignedTo,
      notes,
      status
    } = req.body;

    const updateData = {
      lastModifiedBy: req.user._id
    };
    
    if (type) updateData.type = type;
    if (priority) updateData.priority = priority;
    if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
    if (description) updateData.description = description;
    if (services) updateData.services = services;
    if (parts) updateData.parts = parts;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (notes) updateData.notes = notes;
    if (status) updateData.status = status;

    const updatedMaintenance = await Maintenance.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('vehicle', 'plateNumber make model year')
     .populate('company', 'name')
     .populate('branch', 'name code')
     .populate('assignedTo', 'firstName lastName')
     .populate('createdBy', 'firstName lastName')
     .populate('lastModifiedBy', 'firstName lastName');

    res.json({
      message: 'Mantenimiento actualizado exitosamente',
      maintenance: updatedMaintenance
    });

  } catch (error) {
    console.error('Error actualizando mantenimiento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   PUT /api/maintenance/:id/status
// @desc    Actualizar estado del mantenimiento
// @access  Private
router.put('/:id/status', [
  auth,
  checkPermission('maintenance', 'update'),
  body('status', 'Estado es requerido').isIn(['programado', 'en_proceso', 'pausado', 'completado', 'cancelado']),
  logActivity('Cambiar estado de mantenimiento')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const { status, notes } = req.body;
    
    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && maintenance.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este mantenimiento' });
    }

    const updateData = {
      status,
      lastModifiedBy: req.user._id
    };

    // Actualizar fechas según el estado
    const now = new Date();
    switch (status) {
      case 'en_proceso':
        if (!maintenance.startDate) {
          updateData.startDate = now;
        }
        break;
      case 'completado':
        updateData.completedDate = now;
        if (!maintenance.startDate) {
          updateData.startDate = maintenance.scheduledDate;
        }
        break;
      case 'cancelado':
        updateData.canceledDate = now;
        break;
    }

    if (notes) {
      updateData.notes = notes;
    }

    const updatedMaintenance = await Maintenance.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('vehicle', 'plateNumber make model year')
     .populate('assignedTo', 'firstName lastName');

    res.json({
      message: 'Estado actualizado exitosamente',
      maintenance: updatedMaintenance
    });

  } catch (error) {
    console.error('Error actualizando estado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   POST /api/maintenance/:id/time
// @desc    Registrar tiempo de trabajo
// @access  Private
router.post('/:id/time', [
  auth,
  checkPermission('maintenance', 'update'),
  body('startTime', 'Hora de inicio es requerida').isISO8601(),
  body('endTime', 'Hora de fin es requerida').isISO8601(),
  body('description', 'Descripción es requerida').notEmpty().trim(),
  logActivity('Registrar tiempo de trabajo')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const { startTime, endTime, description } = req.body;
    
    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && maintenance.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este mantenimiento' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (end <= start) {
      return res.status(400).json({ message: 'La hora de fin debe ser posterior a la de inicio' });
    }

    const duration = Math.round((end - start) / (1000 * 60)); // minutos

    maintenance.addTimeEntry({
      user: req.user._id,
      startTime: start,
      endTime: end,
      duration,
      description
    });

    await maintenance.save();

    const updatedMaintenance = await Maintenance.findById(maintenance._id)
      .populate('timeTracking.user', 'firstName lastName');

    res.json({
      message: 'Tiempo registrado exitosamente',
      timeTracking: updatedMaintenance.timeTracking
    });

  } catch (error) {
    console.error('Error registrando tiempo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   POST /api/maintenance/:id/services/:serviceId/complete
// @desc    Completar servicio
// @access  Private
router.post('/:id/services/:serviceId/complete', [
  auth,
  checkPermission('maintenance', 'update'),
  logActivity('Completar servicio')
], async (req, res) => {
  try {
    const { notes, quality } = req.body;
    
    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && maintenance.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este mantenimiento' });
    }

    maintenance.completeService(req.params.serviceId, req.user._id, notes, quality);
    await maintenance.save();

    res.json({
      message: 'Servicio completado exitosamente',
      services: maintenance.services
    });

  } catch (error) {
    console.error('Error completando servicio:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   POST /api/maintenance/:id/parts/:partId/install
// @desc    Instalar parte
// @access  Private
router.post('/:id/parts/:partId/install', [
  auth,
  checkPermission('maintenance', 'update'),
  body('quantity', 'Cantidad es requerida').isInt({ min: 1 }),
  logActivity('Instalar parte')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const { quantity, notes } = req.body;
    
    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && maintenance.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este mantenimiento' });
    }

    maintenance.installPart(req.params.partId, quantity, req.user._id, notes);
    await maintenance.save();

    res.json({
      message: 'Parte instalada exitosamente',
      parts: maintenance.parts
    });

  } catch (error) {
    console.error('Error instalando parte:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   DELETE /api/maintenance/:id
// @desc    Eliminar mantenimiento
// @access  Private
router.delete('/:id', [
  auth,
  checkPermission('maintenance', 'delete'),
  logActivity('Eliminar mantenimiento')
], async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && maintenance.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este mantenimiento' });
    }

    // Solo permitir eliminar si está en estado programado
    if (maintenance.status !== 'programado') {
      return res.status(400).json({ message: 'Solo se pueden eliminar mantenimientos programados' });
    }

    await Maintenance.findByIdAndDelete(req.params.id);
    res.json({ message: 'Mantenimiento eliminado exitosamente' });

  } catch (error) {
    console.error('Error eliminando mantenimiento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/maintenance/stats
// @desc    Obtener estadísticas de mantenimiento
// @access  Private
router.get('/stats/summary', [
  auth,
  checkPermission('maintenance', 'read'),
  logActivity('Ver estadísticas de mantenimiento')
], async (req, res) => {
  try {
    const { company, branch, dateFrom, dateTo } = req.query;
    const companyId = company || req.user.company._id;
    
    const matchQuery = { company: companyId };
    
    if (branch) {
      matchQuery.branch = branch;
    }
    
    if (dateFrom || dateTo) {
      matchQuery.scheduledDate = {};
      if (dateFrom) matchQuery.scheduledDate.$gte = new Date(dateFrom);
      if (dateTo) matchQuery.scheduledDate.$lte = new Date(dateTo);
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      matchQuery.branch = { $in: req.user.branches };
    }

    const [statusStats, typeStats, priorityStats, totalMaintenances, avgCost] = await Promise.all([
      Maintenance.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Maintenance.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Maintenance.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Maintenance.countDocuments(matchQuery),
      Maintenance.aggregate([
        { $match: { ...matchQuery, status: 'completado' } },
        { $group: { _id: null, avgCost: { $avg: '$costs.actual' } } }
      ])
    ]);

    res.json({
      total: totalMaintenances,
      byStatus: statusStats,
      byType: typeStats,
      byPriority: priorityStats,
      averageCost: avgCost[0]?.avgCost || 0
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/maintenance/calendar
// @desc    Obtener mantenimientos para calendario
// @access  Private
router.get('/calendar/events', [
  auth,
  checkPermission('maintenance', 'read'),
  logActivity('Ver calendario de mantenimientos')
], async (req, res) => {
  try {
    const { start, end, branch, company } = req.query;
    const companyId = company || req.user.company._id;
    
    const query = { 
      company: companyId,
      scheduledDate: {
        $gte: new Date(start),
        $lte: new Date(end)
      }
    };
    
    if (branch) {
      query.branch = branch;
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      query.branch = { $in: req.user.branches };
    }

    const maintenances = await Maintenance.find(query)
      .populate('vehicle', 'plateNumber make model')
      .populate('branch', 'name')
      .populate('assignedTo', 'firstName lastName')
      .select('workOrderNumber type priority status scheduledDate vehicle branch assignedTo')
      .sort({ scheduledDate: 1 });

    const events = maintenances.map(maintenance => ({
      id: maintenance._id,
      title: `${maintenance.vehicle.plateNumber} - ${maintenance.type}`,
      start: maintenance.scheduledDate,
      end: maintenance.scheduledDate,
      color: getStatusColor(maintenance.status),
      extendedProps: {
        workOrderNumber: maintenance.workOrderNumber,
        vehicle: maintenance.vehicle,
        branch: maintenance.branch,
        assignedTo: maintenance.assignedTo,
        priority: maintenance.priority,
        status: maintenance.status
      }
    }));

    res.json({ events });

  } catch (error) {
    console.error('Error obteniendo eventos del calendario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Función auxiliar para obtener color según estado
function getStatusColor(status) {
  const colors = {
    'programado': '#3788d8',
    'en_proceso': '#ffa726',
    'pausado': '#ff7043',
    'completado': '#66bb6a',
    'cancelado': '#ef5350'
  };
  return colors[status] || '#9e9e9e';
}

module.exports = router;