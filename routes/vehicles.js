const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Vehicle, Branch, Company, User, FuelRecord } = require('../models');
const { auth, checkPermission, checkCompanyAccess, checkBranchAccess, logActivity } = require('../middleware/auth');
const { checkVehicleLimits } = require('../middleware/companyAdmin');

const router = express.Router();

// @route   GET /api/vehicles
// @desc    Obtener vehículos
// @access  Private
router.get('/', [
  auth,
  checkPermission('vehicles', 'read'),
  logActivity('Listar vehículos')
], async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, branch, vehicleType, company } = req.query;
    
    // Para super_admin: permitir ver todos los vehículos o filtrar por empresa
    // Para otros usuarios: validar que tengan companyId
    let whereConditions = {};
    
    if (req.user.role === 'super_admin') {
      // Super admin puede ver todos los vehículos o filtrar por empresa específica
      if (company) {
        whereConditions.companyId = company;
      }
      // Si no se especifica company, no agregar filtro de companyId (ver todos)
    } else {
      // Para usuarios normales, validar companyId
      const companyId = company || req.user.companyId;
      if (!companyId) {
        return res.status(400).json({ 
          message: 'No se pudo determinar la empresa del usuario' 
        });
      }
      whereConditions.companyId = companyId;
    }
    
    if (search) {
      whereConditions[Op.or] = [
        { plateNumber: { [Op.iLike]: `%${search}%` } },
        { make: { [Op.iLike]: `%${search}%` } },
        { model: { [Op.iLike]: `%${search}%` } },
        { vin: { [Op.iLike]: `%${search}%` } },
        { '$createdBy.firstName$': { [Op.iLike]: `%${search}%` } },
        { '$createdBy.lastName$': { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (status) {
      whereConditions.status = status;
    }
    
    if (branch) {
      whereConditions.branchId = branch;
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      whereConditions.branchId = req.user.branchId;
    }

    // Filtrar por tipos de vehículos según permisos del usuario (excepto super_admin)
    if (req.user.role !== 'super_admin' && req.user.vehicleTypeAccess && req.user.vehicleTypeAccess.length > 0) {
      const allowedTypes = req.user.vehicleTypeAccess;
      if (vehicleType) {
        // Si se especifica un tipo específico, verificar que esté permitido
        if (allowedTypes.includes(vehicleType)) {
          whereConditions.vehicleType = vehicleType;
        } else {
          // Si el tipo no está permitido, devolver array vacío
          return res.json({
            vehicles: [],
            pagination: {
              current: parseInt(page),
              pages: 0,
              total: 0
            }
          });
        }
      } else {
        // Si no se especifica tipo, filtrar por tipos permitidos
        whereConditions.vehicleType = { [Op.in]: allowedTypes };
      }
    } else if (vehicleType) {
      // Para super_admin y company_admin, aplicar filtro de tipo si se especifica
      whereConditions.vehicleType = vehicleType;
    }

    const vehicles = await Vehicle.findAll({
      where: whereConditions,
      include: [
        { 
          model: Company, 
          as: 'company', 
          attributes: ['name'],
          where: { isActive: true }
        },
        { model: Branch, as: 'branch', attributes: ['name', 'code'] },
        { model: User, as: 'createdBy', attributes: ['firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    const total = await Vehicle.count({ 
      where: whereConditions,
      include: [
        { 
          model: Company, 
          as: 'company',
          where: { isActive: true }
        }
      ]
    });

    // Agregar información de mantenimiento para cada vehículo
    const Maintenance = require('../models/Maintenance');
    const vehiclesWithMaintenance = await Promise.all(
      vehicles.map(async (vehicle) => {
        const [activeMaintenances, lastMaintenance, nextMaintenance, allMaintenances] = await Promise.all([
          Maintenance.count({ 
            where: {
              vehicleId: vehicle.id, 
              status: { [Op.in]: ['programado', 'en_proceso'] }
            }
          }),
          Maintenance.findOne({ 
            where: {
              vehicleId: vehicle.id, 
              status: 'completado' 
            },
            order: [['completedDate', 'DESC']]
          }),
          Maintenance.findOne({ 
            where: {
              vehicleId: vehicle.id, 
              status: 'programado',
              scheduledDate: { [Op.gte]: new Date() }
            },
            order: [['scheduledDate', 'ASC']]
          }),
          Maintenance.findAll({ 
            where: {
              vehicleId: vehicle.id, 
              status: { [Op.in]: ['programado', 'en_proceso'] }
            },
            order: [['scheduledDate', 'ASC']]
          })
        ]);
        
        return {
          ...vehicle.toJSON(),
          maintenances: allMaintenances,
          maintenance: {
            active: activeMaintenances,
            last: lastMaintenance,
            next: nextMaintenance,
            needsOilChange: typeof vehicle.needsOilChange === 'function' ? vehicle.needsOilChange() : false,
            needsInspection: typeof vehicle.needsInspection === 'function' ? vehicle.needsInspection() : false
          }
        };
      })
    );

    res.json({
      vehicles: vehiclesWithMaintenance,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Error obteniendo vehículos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/vehicles/:id
// @desc    Obtener vehículo por ID
// @access  Private
router.get('/:id', [
  auth,
  checkPermission('vehicles', 'read'),
  logActivity('Ver vehículo')
], async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id, {
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'taxId'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code', 'address'] },
        { model: User, as: 'createdBy', attributes: ['firstName', 'lastName', 'email'] },
        { model: User, as: 'lastModifiedBy', attributes: ['firstName', 'lastName'] }
      ]
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && vehicle.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      const hasAccess = req.user.branchId === vehicle.branchId;
      if (!hasAccess) {
        return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
      }
    }

    // Verificar acceso al tipo de vehículo
    if (req.user.vehicleTypeAccess && req.user.vehicleTypeAccess.length > 0) {
      if (!req.user.vehicleTypeAccess.includes(vehicle.vehicleType)) {
        return res.status(403).json({ message: 'No tienes acceso a este tipo de vehículo' });
      }
    }

    // Obtener historial de mantenimiento
    const Maintenance = require('../models/Maintenance');
    const [maintenanceHistory, activeMaintenances, upcomingMaintenances] = await Promise.all([
      Maintenance.findAll({
        where: { vehicleId: vehicle.id },
        include: [
          { model: Branch, as: 'branch', attributes: ['name'] },
          { model: User, as: 'assignedTo', attributes: ['firstName', 'lastName'] },
          { model: User, as: 'createdBy', attributes: ['firstName', 'lastName'] }
        ],
        order: [['scheduledDate', 'DESC']],
        limit: 10
      }),
      Maintenance.findAll({
        where: { 
          vehicleId: vehicle.id, 
          status: { [Op.in]: ['programado', 'en_proceso'] }
        },
        include: [
          { model: Branch, as: 'branch', attributes: ['name'] },
          { model: User, as: 'assignedTo', attributes: ['firstName', 'lastName'] }
        ],
        order: [['scheduledDate', 'ASC']]
      }),
      Maintenance.findAll({
        where: { 
          vehicleId: vehicle.id, 
          status: 'programado',
          scheduledDate: { [Op.gte]: new Date() }
        },
        include: [
          { model: Branch, as: 'branch', attributes: ['name'] },
          { model: User, as: 'assignedTo', attributes: ['firstName', 'lastName'] }
        ],
        order: [['scheduledDate', 'ASC']],
        limit: 5
      })
    ]);

    res.json({
      vehicle: {
        ...vehicle.toJSON(),
        maintenance: {
          needsOilChange: vehicle.needsOilChange ? vehicle.needsOilChange() : false,
          needsInspection: vehicle.needsInspection ? vehicle.needsInspection() : false,
          expiringDocuments: vehicle.getExpiringDocuments ? vehicle.getExpiringDocuments(30) : []
        }
      },
      maintenanceHistory,
      activeMaintenances,
      upcomingMaintenances
    });

  } catch (error) {
    console.error('Error obteniendo vehículo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   POST /api/vehicles
// @desc    Crear nuevo vehículo
// @access  Private
router.post('/', [
  auth,
  checkPermission('vehicles', 'create'),
  checkVehicleLimits,
  body('plateNumber', 'Número de placa es requerido').notEmpty().trim(),
  body('make', 'Marca es requerida').notEmpty().trim(),
  body('model', 'Modelo es requerido').notEmpty().trim(),
  body('year', 'Año es requerido').isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  body('vehicleType', 'Tipo de vehículo es requerido').notEmpty(),
  body('branch', 'La delegación es requerida').notEmpty().isUUID(),
  logActivity('Crear vehículo')
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
      plateNumber,
      vin,
      make,
      model,
      year,
      color,
      vehicleType,
      category,
      engine,
      transmission,
      fuelCapacity,
      odometer,
      owner,
      documents,
      specifications,
      ownership,
      photos,
      maintenanceSchedule,
      costs,
      notes,
      branch
    } = req.body;

    // Obtener la delegación y derivar el companyId de ella (delegación es obligatoria)
    const branchDoc = await Branch.findByPk(branch, {
      include: [{ model: Company, as: 'company' }]
    });
    
    if (!branchDoc) {
      return res.status(400).json({ message: 'Delegación no válida' });
    }
    
    const companyId = branchDoc.companyId;
    
    // Verificar que el usuario tenga acceso a esta empresa
    if (req.user.role !== 'super_admin' && req.user.companyId !== companyId) {
      return res.status(403).json({ message: 'No tienes acceso a esta delegación' });
    }

    // Verificar acceso al tipo de vehículo (excepto super_admin)
    if (req.user.role !== 'super_admin' && req.user.vehicleTypeAccess && req.user.vehicleTypeAccess.length > 0) {
      if (!req.user.vehicleTypeAccess.includes(vehicleType)) {
        return res.status(403).json({ message: 'No tienes acceso para crear este tipo de vehículo' });
      }
    }

    // Verificar que la placa no exista en la empresa
    const existingVehicle = await Vehicle.findOne({ 
      where: {
        companyId: companyId, 
        plateNumber: plateNumber.toUpperCase() 
      }
    });
    
    if (existingVehicle) {
      return res.status(400).json({ message: 'El número de placa ya existe en esta empresa' });
    }

    // Verificar VIN si se proporciona
    if (vin) {
      const existingVin = await Vehicle.findOne({ where: { vin: vin.toUpperCase() } });
      if (existingVin) {
        return res.status(400).json({ message: 'El VIN ya está registrado' });
      }
    }

    const vehicle = await Vehicle.create({
      plateNumber: plateNumber.toUpperCase(),
      vin: vin ? vin.toUpperCase() : undefined,
      companyId,
      branchId: branch,
      make,
      model,
      year,
      color,
      vehicleType,
      category,
      engine,
      transmission,
      fuelCapacity,
      odometer,
      owner,
      documents,
      specifications,
      ownership,
      photos,
      maintenanceSchedule,
      costs,
      notes,
      createdById: req.user.id
    });

    const populatedVehicle = await Vehicle.findByPk(vehicle.id, {
      include: [
        { model: Company, as: 'company', attributes: ['name'] },
        { model: Branch, as: 'branch', attributes: ['name', 'code'] },
        { model: User, as: 'createdBy', attributes: ['firstName', 'lastName'] }
      ]
    });

    res.status(201).json({
      message: 'Vehículo creado exitosamente',
      vehicle: populatedVehicle
    });

  } catch (error) {
    console.error('Error creando vehículo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   PUT /api/vehicles/:id
// @desc    Actualizar vehículo
// @access  Private
router.put('/:id', [
  auth,
  checkPermission('vehicles', 'update'),
  body('plateNumber', 'Número de placa es requerido').optional().notEmpty().trim(),
  body('year', 'Año inválido').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  logActivity('Actualizar vehículo')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && vehicle.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    // Verificar acceso al tipo de vehículo actual (excepto super_admin)
    if (req.user.role !== 'super_admin' && req.user.vehicleTypeAccess && req.user.vehicleTypeAccess.length > 0) {
      if (!req.user.vehicleTypeAccess.includes(vehicle.vehicleType)) {
        return res.status(403).json({ message: 'No tienes acceso a este tipo de vehículo' });
      }
    }

    const {
      plateNumber,
      vin,
      make,
      model,
      year,
      color,
      vehicleType,
      category,
      engine,
      transmission,
      fuelCapacity,
      odometer,
      owner,
      documents,
      specifications,
      ownership,
      photos,
      maintenanceSchedule,
      costs,
      status,
      condition,
      notes,
      branch
    } = req.body;

    // Verificar placa única si se está actualizando
    if (plateNumber && plateNumber.toUpperCase() !== vehicle.plateNumber) {
      const existingVehicle = await Vehicle.findOne({ 
        where: {
          companyId: vehicle.companyId, 
          plateNumber: plateNumber.toUpperCase(),
          id: { [Op.ne]: vehicle.id }
        }
      });
      
      if (existingVehicle) {
        return res.status(400).json({ message: 'El número de placa ya existe en esta empresa' });
      }
    }

    // Verificar VIN único si se está actualizando
    if (vin && vin.toUpperCase() !== vehicle.vin) {
      const existingVin = await Vehicle.findOne({ 
        where: {
          vin: vin.toUpperCase(),
          id: { [Op.ne]: vehicle.id }
        }
      });
      
      if (existingVin) {
        return res.status(400).json({ message: 'El VIN ya está registrado' });
      }
    }

    // Verificar acceso al nuevo tipo de vehículo si se está cambiando (excepto super_admin)
    if (vehicleType && vehicleType !== vehicle.vehicleType) {
      if (req.user.role !== 'super_admin' && req.user.vehicleTypeAccess && req.user.vehicleTypeAccess.length > 0) {
        if (!req.user.vehicleTypeAccess.includes(vehicleType)) {
          return res.status(403).json({ message: 'No tienes acceso para cambiar a este tipo de vehículo' });
        }
      }
    }

    // Verificar sucursal si se está cambiando
    if (branch && branch !== vehicle.branchId) {
      const branchDoc = await Branch.findOne({ where: { id: branch, companyId: vehicle.companyId } });
      if (!branchDoc) {
        return res.status(400).json({ message: 'Sucursal no válida' });
      }
    }

    const updateData = {
      lastModifiedById: req.user.id
    };
    
    if (plateNumber) updateData.plateNumber = plateNumber.toUpperCase();
    if (vin) updateData.vin = vin.toUpperCase();
    if (make) updateData.make = make;
    if (model) updateData.model = model;
    if (year) updateData.year = year;
    if (color) updateData.color = color;
    if (vehicleType) updateData.vehicleType = vehicleType;
    if (category) updateData.category = category;
    if (engine) updateData.engine = typeof engine === 'string' ? JSON.parse(engine) : { ...(vehicle.engine || {}), ...engine };
    if (transmission) updateData.transmission = transmission;
    if (fuelCapacity) updateData.fuelCapacity = fuelCapacity;
    if (odometer) updateData.odometer = typeof odometer === 'string' ? JSON.parse(odometer) : { ...(vehicle.odometer || {}), ...odometer };
    if (owner) updateData.owner = typeof owner === 'string' ? JSON.parse(owner) : { ...(vehicle.owner || {}), ...owner };
    if (documents) updateData.documents = typeof documents === 'string' ? JSON.parse(documents) : { ...(vehicle.documents || {}), ...documents };
    if (specifications) updateData.specifications = typeof specifications === 'string' ? JSON.parse(specifications) : { ...(vehicle.specifications || {}), ...specifications };
    if (ownership) updateData.ownership = typeof ownership === 'string' ? JSON.parse(ownership) : { ...(vehicle.ownership || {}), ...ownership };
    if (photos) updateData.photos = Array.isArray(photos) ? photos : (typeof photos === 'string' ? JSON.parse(photos) : photos);
    if (maintenanceSchedule) updateData.maintenanceSchedule = typeof maintenanceSchedule === 'string' ? JSON.parse(maintenanceSchedule) : { ...(vehicle.maintenanceSchedule || {}), ...maintenanceSchedule };
    if (costs) updateData.costs = typeof costs === 'string' ? JSON.parse(costs) : { ...(vehicle.costs || {}), ...costs };
    if (status) updateData.status = status;
    if (condition) updateData.condition = condition;
    if (notes) updateData.notes = notes;
    if (branch) updateData.branchId = branch;

    await vehicle.update(updateData);

    const updatedVehicle = await Vehicle.findByPk(vehicle.id, {
      include: [
        { model: Company, as: 'company', attributes: ['name'] },
        { model: Branch, as: 'branch', attributes: ['name', 'code'] },
        { model: User, as: 'createdBy', attributes: ['firstName', 'lastName'] },
        { model: User, as: 'lastModifiedBy', attributes: ['firstName', 'lastName'] }
      ]
    });

    res.json({
      message: 'Vehículo actualizado exitosamente',
      vehicle: updatedVehicle
    });

  } catch (error) {
    console.error('Error actualizando vehículo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   DELETE /api/vehicles/:id
// @desc    Eliminar vehículo
// @access  Private
router.delete('/:id', [
  auth,
  checkPermission('vehicles', 'delete'),
  logActivity('Eliminar vehículo')
], async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && vehicle.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    // Verificar si tiene mantenimientos
    const Maintenance = require('../models/Maintenance');
    const maintenanceCount = await Maintenance.count({ where: { vehicleId: vehicle.id } });

    if (maintenanceCount > 0) {
      // Soft delete
      await vehicle.update({
        isActive: false,
        status: 'dado_de_baja'
      });
      
      res.json({ message: 'Vehículo dado de baja exitosamente' });
    } else {
      // Hard delete si no tiene mantenimientos
      await vehicle.destroy();
      res.json({ message: 'Vehículo eliminado exitosamente' });
    }

  } catch (error) {
    console.error('Error eliminando vehículo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   PUT /api/vehicles/:id/odometer
// @desc    Actualizar kilometraje
// @access  Private
router.put('/:id/odometer', [
  auth,
  checkPermission('vehicles', 'update'),
  body('reading', 'Lectura de kilometraje es requerida').isNumeric(),
  logActivity('Actualizar kilometraje')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const { reading, date } = req.body;
    
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && vehicle.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    const currentOdometer = vehicle.odometer?.current || 0;
    if (reading < currentOdometer) {
      return res.status(400).json({ message: 'La nueva lectura debe ser mayor a la actual' });
    }

    await vehicle.updateOdometer(reading, date ? new Date(date) : new Date());

    res.json({
      message: 'Kilometraje actualizado exitosamente',
      odometer: vehicle.odometer
    });

  } catch (error) {
    console.error('Error actualizando kilometraje:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   PATCH /api/vehicles/:id/mileage
// @desc    Actualizar kilometraje (alias para compatibilidad con frontend)
// @access  Private
router.patch('/:id/mileage', [
  auth,
  checkPermission('vehicles', 'update'),
  body('mileage', 'Kilometraje es requerido').isNumeric().optional(),
  body('currentMileage', 'Kilometraje actual es requerido').isNumeric().optional(),
  logActivity('Actualizar kilometraje')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const { mileage, currentMileage, notes } = req.body;
    const reading = mileage || currentMileage;
    
    if (!reading) {
      return res.status(400).json({ message: 'Kilometraje es requerido' });
    }
    
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && vehicle.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    const currentOdometer = vehicle.odometer?.current || 0;
    if (reading < currentOdometer) {
      return res.status(400).json({ message: 'La nueva lectura debe ser mayor a la actual' });
    }

    await vehicle.updateOdometer(reading, new Date());

    res.json({
      message: 'Kilometraje actualizado exitosamente',
      odometer: vehicle.odometer,
      notes: notes
    });

  } catch (error) {
    console.error('Error actualizando kilometraje:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/vehicles/:id/maintenance-history
// @desc    Obtener historial de mantenimiento del vehículo
// @access  Private
router.get('/:id/maintenance-history', [
  auth,
  checkPermission('vehicles', 'read'),
  logActivity('Ver historial de mantenimiento')
], async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && vehicle.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    const Maintenance = require('../models/Maintenance');
    const User = require('../models/User');
    
    const maintenanceHistory = await Maintenance.findAll({
      where: { vehicleId: req.params.id },
      include: [
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
      order: [['scheduledDate', 'DESC']]
    });

    res.json({ maintenanceHistory });

  } catch (error) {
    console.error('Error obteniendo historial de mantenimiento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/vehicles/:id/maintenance-alerts
// @desc    Obtener alertas de mantenimiento
// @access  Private
router.get('/:id/maintenance-alerts', [
  auth,
  checkPermission('vehicles', 'read'),
  logActivity('Ver alertas de mantenimiento')
], async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && vehicle.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    const alerts = [];

    // Alertas de mantenimiento
    if (vehicle.needsOilChange && vehicle.needsOilChange()) {
      alerts.push({
        type: 'maintenance',
        priority: 'alta',
        title: 'Cambio de aceite requerido',
        description: 'El vehículo necesita cambio de aceite',
        dueKm: vehicle.maintenanceSchedule.oilChange.lastKm + vehicle.maintenanceSchedule.oilChange.intervalKm
      });
    }

    if (vehicle.needsInspection && vehicle.needsInspection()) {
      alerts.push({
        type: 'maintenance',
        priority: 'media',
        title: 'Inspección general requerida',
        description: 'El vehículo necesita inspección general',
        dueKm: vehicle.maintenanceSchedule.generalInspection.lastKm + vehicle.maintenanceSchedule.generalInspection.intervalKm
      });
    }

    // Alertas de documentos
    const expiringDocs = vehicle.getExpiringDocuments ? vehicle.getExpiringDocuments(30) : [];
    expiringDocs.forEach(doc => {
      alerts.push({
        type: 'document',
        priority: 'critica',
        title: `${doc.type} por vencer`,
        description: `Documento vence el ${doc.date.toLocaleDateString()}`,
        dueDate: doc.date
      });
    });

    res.json({ alerts });

  } catch (error) {
    console.error('Error obteniendo alertas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/vehicles/:id/maintenance
// @desc    Obtener historial de mantenimiento con paginación
// @access  Private
router.get('/:id/maintenance', [
  auth,
  checkPermission('vehicles', 'read'),
  logActivity('Ver historial de mantenimiento')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    
    // Verificar que el vehículo existe y el usuario tiene acceso
    const vehicle = await Vehicle.findOne({
      where: { 
        id,
        ...(req.user.role !== 'super_admin' && { companyId: req.user.companyId })
      }
    });
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }
    
    // Construir condiciones de búsqueda
    const whereConditions = { vehicleId: id };
    
    if (startDate || endDate) {
      whereConditions.scheduledDate = {};
      if (startDate) whereConditions.scheduledDate[Op.gte] = new Date(startDate);
      if (endDate) whereConditions.scheduledDate[Op.lte] = new Date(endDate);
    }
    
    const Maintenance = require('../models/Maintenance');
    const User = require('../models/User');
    const Branch = require('../models/Branch');
    
    // Obtener registros con paginación
    const offset = (page - 1) * limit;
    const { count, rows: maintenances } = await Maintenance.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name']
        }
      ],
      order: [['scheduledDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      maintenances,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalRecords: count,
        total: count,
        hasNext: page * limit < count,
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo historial de mantenimiento:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/vehicles/:id/stats
// @desc    Obtener estadísticas generales del vehículo
// @access  Private
router.get('/:id/stats', [
  auth,
  checkPermission('vehicles', 'read'),
  logActivity('Ver estadísticas del vehículo')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    // Verificar que el vehículo existe y el usuario tiene acceso
    const vehicle = await Vehicle.findOne({
      where: { 
        id,
        ...(req.user.role !== 'super_admin' && { companyId: req.user.companyId })
      }
    });
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }
    
    // Construir condiciones de fecha
    const dateConditions = {};
    if (startDate || endDate) {
      dateConditions.createdAt = {};
      if (startDate) dateConditions.createdAt[Op.gte] = new Date(startDate);
      if (endDate) dateConditions.createdAt[Op.lte] = new Date(endDate);
    }
    
    const fuelDateConditions = {};
    if (startDate || endDate) {
      fuelDateConditions.fuelDate = {};
      if (startDate) fuelDateConditions.fuelDate[Op.gte] = new Date(startDate);
      if (endDate) fuelDateConditions.fuelDate[Op.lte] = new Date(endDate);
    }
    
    const Maintenance = require('../models/Maintenance');
    const FuelRecord = require('../models/FuelRecord');
    
    // Obtener estadísticas en paralelo
    const [maintenanceStats, fuelStats] = await Promise.all([
      // Estadísticas de mantenimiento
      Maintenance.findOne({
        attributes: [
          [Maintenance.sequelize.fn('COUNT', Maintenance.sequelize.col('id')), 'count'],
          [Maintenance.sequelize.fn('SUM', 
            Maintenance.sequelize.literal('COALESCE("costs"->\'total\', 0)')
          ), 'totalCost']
        ],
        where: {
          vehicleId: id,
          ...dateConditions
        },
        raw: true
      }),
      
      // Estadísticas de combustible
      FuelRecord.findOne({
        attributes: [
          [FuelRecord.sequelize.fn('COUNT', FuelRecord.sequelize.col('id')), 'count'],
          [FuelRecord.sequelize.fn('SUM', FuelRecord.sequelize.col('liters')), 'totalLiters'],
          [FuelRecord.sequelize.fn('SUM', FuelRecord.sequelize.col('totalCost')), 'totalCost'],
          [FuelRecord.sequelize.fn('AVG', FuelRecord.sequelize.col('pricePerLiter')), 'avgPricePerLiter']
        ],
        where: {
          vehicleId: id,
          ...fuelDateConditions
        },
        raw: true
      })
    ]);
    
    // Calcular consumo promedio
    const fuelRecordsForConsumption = await FuelRecord.findAll({
      where: {
        vehicleId: id,
        odometer: { [Op.not]: null },
        ...fuelDateConditions
      },
      order: [['fuelDate', 'ASC']],
      attributes: ['odometer', 'liters']
    });
    
    let averageConsumption = null;
    if (fuelRecordsForConsumption.length >= 2) {
      let totalKm = 0;
      let totalLiters = 0;
      
      for (let i = 1; i < fuelRecordsForConsumption.length; i++) {
        const current = fuelRecordsForConsumption[i];
        const previous = fuelRecordsForConsumption[i - 1];
        
        const kmDiff = current.odometer - previous.odometer;
        if (kmDiff > 0) {
          totalKm += kmDiff;
          totalLiters += current.liters;
        }
      }
      
      if (totalKm > 0) {
        averageConsumption = (totalLiters / totalKm) * 100; // L/100km
      }
    }
    
    res.json({
      vehicle: {
        id: vehicle.id,
        plateNumber: vehicle.plateNumber,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vehicleType: vehicle.vehicleType
      },
      period: {
        startDate,
        endDate
      },
      maintenanceCount: parseInt(maintenanceStats?.count) || 0,
      totalMaintenanceCost: parseFloat(maintenanceStats?.totalCost) || 0,
      fuelRecordCount: parseInt(fuelStats?.count) || 0,
      totalFuelCost: parseFloat(fuelStats?.totalCost) || 0,
      totalLiters: parseFloat(fuelStats?.totalLiters) || 0,
      averagePricePerLiter: parseFloat(fuelStats?.avgPricePerLiter) || 0,
      averageConsumption,
      totalCost: (parseFloat(maintenanceStats?.totalCost) || 0) + (parseFloat(fuelStats?.totalCost) || 0)
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas del vehículo:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/vehicles/stats
// @desc    Obtener estadísticas de vehículos
// @access  Private
router.get('/stats/summary', [
  auth,
  checkPermission('vehicles', 'read'),
  logActivity('Ver estadísticas de vehículos')
], async (req, res) => {
  try {
    const { company, branch } = req.query;
    const companyId = company || req.user.companyId;
    
    const matchQuery = { company: companyId };
    
    if (branch) {
      matchQuery.branch = branch;
    }
    
    // Filtrar por sucursales del usuario si no es admin
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

    const [statusStats, typeStats, conditionStats, totalVehicles] = await Promise.all([
      // Estadísticas por estado
      Vehicle.findAll({
        attributes: [
          'status',
          [Vehicle.sequelize.fn('COUNT', '*'), 'count']
        ],
        where: whereConditions,
        group: ['status'],
        raw: true
      }),
      // Estadísticas por tipo de vehículo
      Vehicle.findAll({
        attributes: [
          'vehicleType',
          [Vehicle.sequelize.fn('COUNT', '*'), 'count']
        ],
        where: whereConditions,
        group: ['vehicleType'],
        raw: true
      }),
      // Estadísticas por condición
      Vehicle.findAll({
        attributes: [
          'condition',
          [Vehicle.sequelize.fn('COUNT', '*'), 'count']
        ],
        where: whereConditions,
        group: ['condition'],
        raw: true
      }),
      // Total de vehículos
      Vehicle.count({ where: whereConditions })
    ]);

    // Formatear los resultados para mantener compatibilidad con el frontend
    const formattedStatusStats = statusStats.map(stat => ({
      _id: stat.status,
      count: parseInt(stat.count)
    }));
    
    const formattedTypeStats = typeStats.map(stat => ({
      _id: stat.vehicleType,
      count: parseInt(stat.count)
    }));
    
    const formattedConditionStats = conditionStats.map(stat => ({
      _id: stat.condition,
      count: parseInt(stat.count)
    }));

    res.json({
      total: totalVehicles,
      byStatus: formattedStatusStats,
      byType: formattedTypeStats,
      byCondition: formattedConditionStats
    });

  } catch (error) {
    console.error('Error al obtener estadísticas de vehículos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   POST /api/vehicles/:id/photos
// @desc    Subir fotos de vehículo
// @access  Private
router.post('/:id/photos', [
  auth,
  checkPermission('vehicles', 'update'),
  logActivity('Subir fotos de vehículo')
], async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && vehicle.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    const { photos } = req.body;
    
    if (!photos || !Array.isArray(photos)) {
      return res.status(400).json({ message: 'Se requiere un array de fotos' });
    }

    // Validar estructura de fotos
    for (const photo of photos) {
      if (!photo.url || !photo.category) {
        return res.status(400).json({ message: 'Cada foto debe tener URL y categoría' });
      }
    }

    // Añadir metadatos a las fotos
    const photosWithMetadata = photos.map(photo => ({
      ...photo,
      uploadedBy: req.user.id,
      uploadedAt: new Date()
    }));

    // Actualizar vehículo con nuevas fotos
    const currentPhotos = vehicle.photos || [];
    await vehicle.update({
      photos: [...currentPhotos, ...photosWithMetadata],
      lastModifiedById: req.user.id
    });

    res.json({
      message: 'Fotos subidas exitosamente',
      photos: photosWithMetadata
    });

  } catch (error) {
    console.error('Error subiendo fotos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   DELETE /api/vehicles/:id/photos/:photoId
// @desc    Eliminar foto de vehículo
// @access  Private
router.delete('/:id/photos/:photoId', [
  auth,
  checkPermission('vehicles', 'update'),
  logActivity('Eliminar foto de vehículo')
], async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && vehicle.companyId !== req.user.company.id) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    // Encontrar y eliminar la foto
    const photos = vehicle.photos || [];
    const photoIndex = photos.findIndex(photo => photo.id === req.params.photoId);
    if (photoIndex === -1) {
      return res.status(404).json({ message: 'Foto no encontrada' });
    }

    const updatedPhotos = [...photos];
    updatedPhotos.splice(photoIndex, 1);
    
    await vehicle.update({
      photos: updatedPhotos,
      lastModifiedById: req.user.id
    });

    res.json({ message: 'Foto eliminada exitosamente' });

  } catch (error) {
    console.error('Error eliminando foto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   POST /api/vehicles/:id/documents
// @desc    Subir documento a un vehículo
// @access  Private
router.post('/:id/documents', [
  auth,
  checkPermission('vehicles', 'update'),
  logActivity('Subir documento de vehículo')
], async (req, res) => {
  try {
    const { name, url, type } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ message: 'Nombre y URL del documento son requeridos' });
    }

    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso a la empresa
    if (vehicle.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    const newDocument = {
      name,
      url,
      type: type || 'document',
      uploadDate: new Date(),
      uploadedBy: req.user.id
    };

    const currentAttachments = vehicle.attachments || [];
    await vehicle.update({
      attachments: [...currentAttachments, newDocument],
      lastModifiedById: req.user.id
    });

    res.json({
      message: 'Documento subido exitosamente',
      document: newDocument
    });
  } catch (error) {
    console.error('Error al subir documento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/vehicles/:id/documents
// @desc    Obtener documentos de un vehículo
// @access  Private
router.get('/:id/documents', [
  auth,
  checkPermission('vehicles', 'read'),
  logActivity('Ver documentos de vehículo')
], async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id, {
      attributes: ['attachments', 'companyId']
    });
      
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso a la empresa
    if (vehicle.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    res.json(vehicle.attachments || []);
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   DELETE /api/vehicles/:id/documents/:documentId
// @desc    Eliminar documento de un vehículo
// @access  Private
router.delete('/:id/documents/:documentId', [
  auth,
  checkPermission('vehicles', 'update'),
  logActivity('Eliminar documento de vehículo')
], async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso a la empresa
    if (vehicle.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    const attachments = vehicle.attachments || [];
    const documentIndex = attachments.findIndex(
      doc => doc.id === req.params.documentId
    );

    if (documentIndex === -1) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    const updatedAttachments = [...attachments];
    updatedAttachments.splice(documentIndex, 1);
    
    await vehicle.update({
      attachments: updatedAttachments,
      lastModifiedById: req.user.id
    });

    res.json({ message: 'Documento eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ==================== RUTAS DE COMBUSTIBLE ====================

// @route   GET /api/vehicles/:id/fuel
// @desc    Obtener registros de combustible de un vehículo
// @access  Private
router.get('/:id/fuel', [
  auth,
  checkPermission('vehicles', 'read'),
  logActivity('Ver registros de combustible')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    
    // Verificar que el vehículo existe y el usuario tiene acceso
    const vehicle = await Vehicle.findOne({
      where: { 
        id,
        ...(req.user.role !== 'super_admin' && { companyId: req.user.companyId })
      }
    });
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }
    
    // Construir condiciones de búsqueda
    const whereConditions = { vehicleId: id };
    
    if (startDate || endDate) {
      whereConditions.fuelDate = {};
      if (startDate) whereConditions.fuelDate[Op.gte] = new Date(startDate);
      if (endDate) whereConditions.fuelDate[Op.lte] = new Date(endDate);
    }
    
    // Obtener registros con paginación
    const offset = (page - 1) * limit;
    const { count, rows: fuelRecords } = await FuelRecord.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['fuelDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Obtener estadísticas
    const stats = await FuelRecord.getFuelStats(id, startDate, endDate);
    
    res.json({
      fuelRecords,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalRecords: count,
        hasNext: page * limit < count,
        hasPrev: page > 1
      },
      stats
    });
    
  } catch (error) {
    console.error('Error obteniendo registros de combustible:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/vehicles/:id/fuel
// @desc    Crear nuevo registro de combustible
// @access  Private
router.post('/:id/fuel', [
  auth,
  checkPermission('vehicles', 'update'),
  body('fuelDate', 'Fecha de repostaje es requerida').isISO8601().toDate(),
  body('liters', 'Litros son requeridos').isFloat({ min: 0.1, max: 1000 }),
  body('odometer', 'Odómetro debe ser un número válido').optional().isInt({ min: 0 }),
  body('pricePerLiter', 'Precio por litro debe ser válido').optional().isFloat({ min: 0 }),
  body('totalCost', 'Costo total debe ser válido').optional().isFloat({ min: 0 }),
  body('fuelType', 'Tipo de combustible inválido').optional().isIn(['diesel', 'gasolina_95', 'gasolina_98', 'gas_natural', 'electrico', 'hibrido', 'otro']),
  body('station', 'Nombre de estación muy largo').optional().isLength({ max: 100 }),
  body('location', 'Ubicación muy larga').optional().isLength({ max: 200 }),
  body('isFull', 'isFull debe ser booleano').optional().isBoolean(),
  body('notes', 'Notas muy largas').optional().isLength({ max: 500 }),
  logActivity('Registrar combustible')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    const {
      fuelDate,
      liters,
      odometer,
      pricePerLiter,
      totalCost,
      fuelType = 'diesel',
      station,
      location,
      isFull = true,
      notes,
      receipt
    } = req.body;
    
    // Verificar que el vehículo existe y el usuario tiene acceso
    const vehicle = await Vehicle.findOne({
      where: { 
        id,
        ...(req.user.role !== 'super_admin' && { companyId: req.user.companyId })
      }
    });
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }
    
    // Crear el registro de combustible
    const fuelRecord = await FuelRecord.create({
      vehicleId: id,
      fuelDate,
      liters,
      odometer,
      pricePerLiter,
      totalCost,
      fuelType,
      station,
      location,
      isFull,
      notes,
      receipt,
      createdById: req.user.id,
      companyId: vehicle.companyId
    });
    
    // Obtener el registro creado con las asociaciones
    const createdRecord = await FuelRecord.findByPk(fuelRecord.id, {
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    res.status(201).json({
      message: 'Registro de combustible creado exitosamente',
      fuelRecord: createdRecord
    });
    
  } catch (error) {
    console.error('Error creando registro de combustible:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: 'Error de validación',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/vehicles/:id/fuel/:fuelId
// @desc    Actualizar registro de combustible
// @access  Private
router.put('/:id/fuel/:fuelId', [
  auth,
  checkPermission('vehicles', 'update'),
  body('fuelDate', 'Fecha de repostaje es requerida').optional().isISO8601().toDate(),
  body('liters', 'Litros son requeridos').optional().isFloat({ min: 0.1, max: 1000 }),
  body('odometer', 'Odómetro debe ser un número válido').optional().isInt({ min: 0 }),
  body('pricePerLiter', 'Precio por litro debe ser válido').optional().isFloat({ min: 0 }),
  body('totalCost', 'Costo total debe ser válido').optional().isFloat({ min: 0 }),
  body('fuelType', 'Tipo de combustible inválido').optional().isIn(['diesel', 'gasolina_95', 'gasolina_98', 'gas_natural', 'electrico', 'hibrido', 'otro']),
  body('station', 'Nombre de estación muy largo').optional().isLength({ max: 100 }),
  body('location', 'Ubicación muy larga').optional().isLength({ max: 200 }),
  body('isFull', 'isFull debe ser booleano').optional().isBoolean(),
  body('notes', 'Notas muy largas').optional().isLength({ max: 500 }),
  logActivity('Actualizar registro de combustible')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }
    
    const { id, fuelId } = req.params;
    
    // Verificar que el vehículo existe y el usuario tiene acceso
    const vehicle = await Vehicle.findOne({
      where: { 
        id,
        ...(req.user.role !== 'super_admin' && { companyId: req.user.companyId })
      }
    });
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }
    
    // Buscar el registro de combustible
    const fuelRecord = await FuelRecord.findOne({
      where: {
        id: fuelId,
        vehicleId: id,
        companyId: vehicle.companyId
      }
    });
    
    if (!fuelRecord) {
      return res.status(404).json({ message: 'Registro de combustible no encontrado' });
    }
    
    // Actualizar el registro
    await fuelRecord.update(req.body);
    
    // Obtener el registro actualizado con las asociaciones
    const updatedRecord = await FuelRecord.findByPk(fuelRecord.id, {
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    res.json({
      message: 'Registro de combustible actualizado exitosamente',
      fuelRecord: updatedRecord
    });
    
  } catch (error) {
    console.error('Error actualizando registro de combustible:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: 'Error de validación',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/vehicles/:id/fuel/:fuelId
// @desc    Eliminar registro de combustible
// @access  Private
router.delete('/:id/fuel/:fuelId', [
  auth,
  checkPermission('vehicles', 'delete'),
  logActivity('Eliminar registro de combustible')
], async (req, res) => {
  try {
    const { id, fuelId } = req.params;
    
    // Verificar que el vehículo existe y el usuario tiene acceso
    const vehicle = await Vehicle.findOne({
      where: { 
        id,
        ...(req.user.role !== 'super_admin' && { companyId: req.user.companyId })
      }
    });
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }
    
    // Buscar el registro de combustible
    const fuelRecord = await FuelRecord.findOne({
      where: {
        id: fuelId,
        vehicleId: id,
        companyId: vehicle.companyId
      }
    });
    
    if (!fuelRecord) {
      return res.status(404).json({ message: 'Registro de combustible no encontrado' });
    }
    
    // Eliminar el registro
    await fuelRecord.destroy();
    
    res.json({ message: 'Registro de combustible eliminado exitosamente' });
    
  } catch (error) {
    console.error('Error eliminando registro de combustible:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/vehicles/:id/fuel/stats
// @desc    Obtener estadísticas de combustible de un vehículo
// @access  Private
router.get('/:id/fuel/stats', [
  auth,
  checkPermission('vehicles', 'read'),
  logActivity('Ver estadísticas de combustible')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, period = '30' } = req.query;
    
    // Verificar que el vehículo existe y el usuario tiene acceso
    const vehicle = await Vehicle.findOne({
      where: { 
        id,
        ...(req.user.role !== 'super_admin' && { companyId: req.user.companyId })
      }
    });
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }
    
    // Calcular fechas si no se proporcionan
    let start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : null;
    
    if (!start && !end) {
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - parseInt(period));
    }
    
    // Obtener estadísticas generales
    const generalStats = await FuelRecord.getFuelStats(id, start, end);
    
    // Obtener consumo promedio
    const averageConsumption = await FuelRecord.getAverageConsumption(id, parseInt(period));
    
    // Obtener registros recientes para gráficos
    const recentRecords = await FuelRecord.findAll({
      where: {
        vehicleId: id,
        ...(start && end && {
          fuelDate: {
            [Op.between]: [start, end]
          }
        })
      },
      order: [['fuelDate', 'ASC']],
      limit: 50,
      attributes: ['fuelDate', 'liters', 'totalCost', 'pricePerLiter', 'odometer']
    });
    
    // Calcular tendencias mensuales
    const monthlyStats = {};
    recentRecords.forEach(record => {
      const month = record.fuelDate.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          totalLiters: 0,
          totalCost: 0,
          recordCount: 0
        };
      }
      monthlyStats[month].totalLiters += record.liters;
      monthlyStats[month].totalCost += record.totalCost || 0;
      monthlyStats[month].recordCount += 1;
    });
    
    res.json({
      vehicle: {
        id: vehicle.id,
        plateNumber: vehicle.plateNumber,
        make: vehicle.make,
        model: vehicle.model,
        fuelCapacity: vehicle.fuelCapacity
      },
      period: {
        startDate: start,
        endDate: end,
        days: period
      },
      stats: {
        ...generalStats,
        averageConsumption
      },
      monthlyStats,
      recentRecords
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas de combustible:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Endpoint para resumen mensual de combustible por empresa
router.get('/fuel/company-summary', [
  auth,
  checkPermission('vehicles', 'read'),
  logActivity('Ver resumen de combustible por empresa')
], async (req, res) => {
  try {
    const { year, month } = req.query;
    const currentDate = new Date();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;

    // Validar parámetros
    if (targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({ message: 'Mes inválido' });
    }

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // Obtener todos los vehículos de la empresa del usuario
    const vehicles = await Vehicle.findAll({
      where: {
        companyId: req.user.companyId,
        isActive: true
      },
      include: [
        {
          model: FuelRecord,
          as: 'fuelRecords',
          where: {
            fuelDate: {
              [Op.between]: [startDate, endDate]
            }
          },
          required: false
        },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] }
      ],
      order: [['plateNumber', 'ASC']]
    });

    // Procesar datos por vehículo
    const vehicleSummaries = vehicles.map(vehicle => {
      const fuelRecords = vehicle.fuelRecords || [];
      
      const totalLiters = fuelRecords.reduce((sum, record) => sum + (record.liters || 0), 0);
      const totalCost = fuelRecords.reduce((sum, record) => sum + (record.totalCost || 0), 0);
      const recordCount = fuelRecords.length;
      
      // Calcular consumo promedio si hay registros con odómetro
      const recordsWithOdometer = fuelRecords.filter(r => r.odometer && r.odometer > 0).sort((a, b) => a.odometer - b.odometer);
      let averageConsumption = null;
      
      if (recordsWithOdometer.length >= 2) {
        const totalKm = recordsWithOdometer[recordsWithOdometer.length - 1].odometer - recordsWithOdometer[0].odometer;
        const totalLitersForConsumption = recordsWithOdometer.slice(1).reduce((sum, record) => sum + (record.liters || 0), 0);
        if (totalKm > 0 && totalLitersForConsumption > 0) {
          averageConsumption = (totalLitersForConsumption / totalKm * 100).toFixed(2);
        }
      }

      return {
        vehicleId: vehicle.id,
        plateNumber: vehicle.plateNumber,
        make: vehicle.make,
        model: vehicle.model,
        vehicleType: vehicle.vehicleType,
        branch: vehicle.branch ? vehicle.branch.name : 'Sin asignar',
        totalLiters: parseFloat(totalLiters.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        recordCount,
        averageConsumption: averageConsumption ? parseFloat(averageConsumption) : null,
        averagePricePerLiter: totalLiters > 0 ? parseFloat((totalCost / totalLiters).toFixed(2)) : null
      };
    });

    // Calcular totales generales
    const totalCompanyLiters = vehicleSummaries.reduce((sum, v) => sum + v.totalLiters, 0);
    const totalCompanyCost = vehicleSummaries.reduce((sum, v) => sum + v.totalCost, 0);
    const totalRecords = vehicleSummaries.reduce((sum, v) => sum + v.recordCount, 0);
    
    // Agrupar por tipo de vehículo
    const byVehicleType = vehicleSummaries.reduce((acc, vehicle) => {
      const type = vehicle.vehicleType;
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          totalLiters: 0,
          totalCost: 0,
          recordCount: 0
        };
      }
      acc[type].count += 1;
      acc[type].totalLiters += vehicle.totalLiters;
      acc[type].totalCost += vehicle.totalCost;
      acc[type].recordCount += vehicle.recordCount;
      return acc;
    }, {});

    // Agrupar por sucursal
    const byBranch = vehicleSummaries.reduce((acc, vehicle) => {
      const branch = vehicle.branch;
      if (!acc[branch]) {
        acc[branch] = {
          count: 0,
          totalLiters: 0,
          totalCost: 0,
          recordCount: 0
        };
      }
      acc[branch].count += 1;
      acc[branch].totalLiters += vehicle.totalLiters;
      acc[branch].totalCost += vehicle.totalCost;
      acc[branch].recordCount += vehicle.recordCount;
      return acc;
    }, {});

    res.json({
      period: {
        year: targetYear,
        month: targetMonth,
        monthName: new Date(targetYear, targetMonth - 1).toLocaleString('es-ES', { month: 'long' }),
        startDate,
        endDate
      },
      summary: {
        totalVehicles: vehicles.length,
        vehiclesWithRecords: vehicleSummaries.filter(v => v.recordCount > 0).length,
        totalLiters: parseFloat(totalCompanyLiters.toFixed(2)),
        totalCost: parseFloat(totalCompanyCost.toFixed(2)),
        totalRecords,
        averagePricePerLiter: totalCompanyLiters > 0 ? parseFloat((totalCompanyCost / totalCompanyLiters).toFixed(2)) : null
      },
      vehicles: vehicleSummaries,
      byVehicleType,
      byBranch
    });

  } catch (error) {
    console.error('Error obteniendo resumen de combustible por empresa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;