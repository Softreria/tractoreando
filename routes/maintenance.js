const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Maintenance, Vehicle, Branch, Company, User } = require('../models');
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
    
    // Los filtros se construyen más abajo en el objeto where de Sequelize

    // Construir filtros para Sequelize
    const where = { companyId: company || req.user.companyId };
    
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { workOrderNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (status) {
      where.status = status;
    }
    
    if (type) {
      where.type = type;
    }
    
    if (priority) {
      where.priority = priority;
    }
    
    if (branch) {
      where.branchId = branch;
    }
    
    if (vehicle) {
      where.vehicleId = vehicle;
    }
    
    if (assignedTo) {
      where.assignedToId = assignedTo;
    }
    
    if (dateFrom || dateTo) {
      where.scheduledDate = {};
      if (dateFrom) where.scheduledDate[Op.gte] = new Date(dateFrom);
      if (dateTo) where.scheduledDate[Op.lte] = new Date(dateTo);
    }

    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      where.branchId = req.user.branchId;
    }

    const maintenances = await Maintenance.findAll({
      where,
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['plateNumber', 'make', 'model', 'year']
        },
        {
          model: Company,
          as: 'company',
          attributes: ['name']
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['name', 'code']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['firstName', 'lastName']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['firstName', 'lastName']
        }
      ],
      order: [['scheduledDate', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });

    const total = await Maintenance.count({ where });

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
    const maintenance = await Maintenance.findByPk(req.params.id, {
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['plateNumber', 'make', 'model', 'year', 'vin', 'odometer']
        },
        {
          model: Company,
          as: 'company',
          attributes: ['name', 'taxId']
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['name', 'code', 'address']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['firstName', 'lastName', 'email', 'phone']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['firstName', 'lastName', 'email']
        }
      ]
    });

    if (!maintenance) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && maintenance.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este mantenimiento' });
    }

    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      const hasAccess = req.user.branch.toString() === maintenance.branch._id.toString();
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
  body('vehicleId', 'Vehículo es requerido').isUUID(),
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
      vehicleId,
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

    // Usar vehicleId si está presente, sino vehicle para compatibilidad
    const selectedVehicle = vehicleId || vehicle;

    const companyId = req.body.company || req.user.companyId;

    // Verificar que el vehículo existe, pertenece a la empresa y la empresa está activa
    const vehicleDoc = await Vehicle.findOne({ 
      where: { id: selectedVehicle, companyId: companyId },
      include: [{
        model: Company,
        as: 'company',
        where: { isActive: true }
      }]
    });
    if (!vehicleDoc) {
      return res.status(400).json({ message: 'Vehículo no válido o empresa inactiva' });
    }

    // Usar la sucursal del vehículo si no se especifica
    const branchId = branch || vehicleDoc.branchId;

    // Verificar que la sucursal pertenece a la empresa
    const branchDoc = await Branch.findOne({ 
      where: { id: branchId, companyId: companyId }
    });
    if (!branchDoc) {
      return res.status(400).json({ message: 'Sucursal no válida' });
    }

    // Generar número de orden de trabajo único
    const workOrderNumber = `WO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const maintenance = await Maintenance.create({
      vehicleId: selectedVehicle,
      companyId: companyId,
      branchId: branchId,
      type,
      priority,
      scheduledDate: new Date(scheduledDate),
      title: `${type} - ${description.substring(0, 50)}`,
      description,
      services: services || [],
      parts: parts || [],
      costs: {
        estimated: estimatedCost || 0,
        labor: 0,
        parts: 0,
        materials: 0,
        external: 0,
        tax: 0,
        discount: 0,
        total: 0
      },
      assignedToId: assignedTo,
      notes,
      workOrderNumber,
      odometerReading: vehicleDoc.odometer?.current || 0,
      createdById: req.user.id
    });

    const populatedMaintenance = await Maintenance.findByPk(maintenance.id, {
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['plateNumber', 'make', 'model', 'year']
        },
        {
          model: Company,
          as: 'company',
          attributes: ['name']
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['name', 'code']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['firstName', 'lastName']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['firstName', 'lastName']
        }
      ]
    });

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

    const maintenance = await Maintenance.findByPk(req.params.id);
    if (!maintenance) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && maintenance.companyId !== req.user.companyId) {
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
      lastModifiedById: req.user.id
    };
    
    if (type) updateData.type = type;
    if (priority) updateData.priority = priority;
    if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
    if (description) updateData.description = description;
    if (services) updateData.services = services;
    if (parts) updateData.parts = parts;
    if (assignedTo) updateData.assignedToId = assignedTo;
    if (notes) updateData.notes = notes;
    if (status) updateData.status = status;

    await maintenance.update(updateData);

    const updatedMaintenance = await Maintenance.findByPk(req.params.id, {
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['plateNumber', 'make', 'model', 'year']
        },
        {
          model: Company,
          as: 'company',
          attributes: ['name']
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['name', 'code']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['firstName', 'lastName']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['firstName', 'lastName']
        },
        {
          model: User,
          as: 'lastModifiedBy',
          attributes: ['firstName', 'lastName']
        }
      ]
    });

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
    
    const maintenance = await Maintenance.findByPk(req.params.id);
    if (!maintenance) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && maintenance.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este mantenimiento' });
    }

    const updateData = {
      status,
      lastModifiedById: req.user.id
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

    await maintenance.update(updateData);

    const updatedMaintenance = await Maintenance.findByPk(req.params.id, {
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['plateNumber', 'make', 'model', 'year']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['firstName', 'lastName']
        }
      ]
    });

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
    
    const maintenance = await Maintenance.findByPk(req.params.id);
    if (!maintenance) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && maintenance.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este mantenimiento' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (end <= start) {
      return res.status(400).json({ message: 'La hora de fin debe ser posterior a la de inicio' });
    }

    const duration = Math.round((end - start) / (1000 * 60)); // minutos

    await maintenance.addTimeEntry({
      user: req.user.id,
      startTime: start,
      endTime: end,
      duration,
      description
    });

    const updatedMaintenance = await Maintenance.findByPk(maintenance.id, {
      include: [
        {
          model: User,
          as: 'timeTracking.user',
          attributes: ['firstName', 'lastName']
        }
      ]
    });

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
    
    const maintenance = await Maintenance.findByPk(req.params.id);
    if (!maintenance) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && maintenance.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este mantenimiento' });
    }

    await maintenance.completeService(req.params.serviceId, req.user.id, notes, quality);

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
    
    const maintenance = await Maintenance.findByPk(req.params.id);
    if (!maintenance) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && maintenance.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este mantenimiento' });
    }

    await maintenance.installPart(req.params.partId, quantity, req.user.id, notes);

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
    const maintenance = await Maintenance.findByPk(req.params.id);
    if (!maintenance) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && maintenance.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este mantenimiento' });
    }

    // Solo permitir eliminar si está en estado programado
    if (maintenance.status !== 'programado') {
      return res.status(400).json({ message: 'Solo se pueden eliminar mantenimientos programados' });
    }

    await maintenance.destroy();
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
    const companyId = company || req.user.companyId;
    
    const whereConditions = { companyId: companyId };
    
    if (branch) {
      whereConditions.branchId = branch;
    }
    
    if (dateFrom || dateTo) {
      whereConditions.scheduledDate = {};
      if (dateFrom) whereConditions.scheduledDate[Op.gte] = new Date(dateFrom);
      if (dateTo) whereConditions.scheduledDate[Op.lte] = new Date(dateTo);
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      whereConditions.branchId = req.user.branchId;
    }

    const [statusStats, typeStats, priorityStats, totalMaintenances, avgCost] = await Promise.all([
      // Estadísticas por estado
      Maintenance.findAll({
        attributes: [
          'status',
          [Maintenance.sequelize.fn('COUNT', '*'), 'count']
        ],
        where: whereConditions,
        group: ['status'],
        raw: true
      }),
      // Estadísticas por tipo
      Maintenance.findAll({
        attributes: [
          'type',
          [Maintenance.sequelize.fn('COUNT', '*'), 'count']
        ],
        where: whereConditions,
        group: ['type'],
        raw: true
      }),
      // Estadísticas por prioridad
      Maintenance.findAll({
        attributes: [
          'priority',
          [Maintenance.sequelize.fn('COUNT', '*'), 'count']
        ],
        where: whereConditions,
        group: ['priority'],
        raw: true
      }),
      // Total de mantenimientos
      Maintenance.count({ where: whereConditions }),
      // Costo promedio de mantenimientos completados
      Maintenance.findOne({
        attributes: [
          [Maintenance.sequelize.fn('AVG', Maintenance.sequelize.cast(Maintenance.sequelize.json('costs.actual'), 'DECIMAL')), 'avgCost']
        ],
        where: {
          ...whereConditions,
          status: 'completado'
        },
        raw: true
      })
    ]);

    res.json({
      total: totalMaintenances,
      byStatus: statusStats.map(stat => ({ _id: stat.status, count: parseInt(stat.count) })),
      byType: typeStats.map(stat => ({ _id: stat.type, count: parseInt(stat.count) })),
      byPriority: priorityStats.map(stat => ({ _id: stat.priority, count: parseInt(stat.count) })),
      averageCost: parseFloat(avgCost?.avgCost) || 0
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
    const companyId = company || req.user.companyId;
    
    const whereConditions = { 
      companyId: companyId,
      scheduledDate: {
        [Op.gte]: new Date(start),
        [Op.lte]: new Date(end)
      }
    };
    
    if (branch) {
      whereConditions.branchId = branch;
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      whereConditions.branchId = { [Op.in]: req.user.branches };
    }

    const maintenances = await Maintenance.findAll({
      where: whereConditions,
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['plateNumber', 'make', 'model']
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['name']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['firstName', 'lastName']
        }
      ],
      attributes: ['id', 'workOrderNumber', 'type', 'priority', 'status', 'scheduledDate'],
      order: [['scheduledDate', 'ASC']]
    });

    const events = maintenances.map(maintenance => ({
      id: maintenance.id,
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