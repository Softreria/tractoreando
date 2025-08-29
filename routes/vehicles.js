const express = require('express');
const { body, validationResult } = require('express-validator');
const Vehicle = require('../models/Vehicle');
const Branch = require('../models/Branch');
const { auth, checkPermission, checkCompanyAccess, checkBranchAccess, checkSubscriptionLimits, logActivity } = require('../middleware/auth');

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
    
    const query = { company: company || req.user.company._id };
    
    if (search) {
      query.$or = [
        { plateNumber: { $regex: search, $options: 'i' } },
        { make: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { vin: { $regex: search, $options: 'i' } },
        { 'owner.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    if (branch) {
      query.branch = branch;
    }
    
    if (vehicleType) {
      query.vehicleType = vehicleType;
    }

    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      query.branch = req.user.branch;
    }

    // Filtrar por tipos de vehículos según permisos del usuario
    if (req.user.vehicleTypeAccess && req.user.vehicleTypeAccess.length > 0) {
      query.vehicleType = { $in: req.user.vehicleTypeAccess };
    }

    const vehicles = await Vehicle.find(query)
      .populate('company', 'name')
      .populate('branch', 'name code')
      .populate('createdBy', 'name lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Vehicle.countDocuments(query);

    // Agregar información de mantenimiento para cada vehículo
    const Maintenance = require('../models/Maintenance');
    const vehiclesWithMaintenance = await Promise.all(
      vehicles.map(async (vehicle) => {
        const [activeMaintenances, lastMaintenance, nextMaintenance] = await Promise.all([
          Maintenance.countDocuments({ 
            vehicle: vehicle._id, 
            status: { $in: ['programado', 'en_proceso'] }
          }),
          Maintenance.findOne({ 
            vehicle: vehicle._id, 
            status: 'completado' 
          }).sort({ completedDate: -1 }),
          Maintenance.findOne({ 
            vehicle: vehicle._id, 
            status: 'programado',
            scheduledDate: { $gte: new Date() }
          }).sort({ scheduledDate: 1 })
        ]);
        
        return {
          ...vehicle.toObject(),
          maintenance: {
            active: activeMaintenances,
            last: lastMaintenance,
            next: nextMaintenance,
            needsOilChange: vehicle.needsOilChange(),
            needsInspection: vehicle.needsInspection()
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
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('company', 'name rfc')
      .populate('branch', 'name code address')
      .populate('createdBy', 'name lastName email')
      .populate('lastModifiedBy', 'name lastName');

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && vehicle.company._id.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      const hasAccess = req.user.branch.toString() === vehicle.branch._id.toString();
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
      Maintenance.find({ vehicle: vehicle._id })
        .populate('branch', 'name')
        .populate('assignedTo', 'name lastName')
      .populate('createdBy', 'name lastName')
        .sort({ scheduledDate: -1 })
        .limit(10),
      Maintenance.find({ 
        vehicle: vehicle._id, 
        status: { $in: ['programado', 'en_proceso'] }
      })
        .populate('branch', 'name')
        .populate('assignedTo', 'name lastName')
        .sort({ scheduledDate: 1 }),
      Maintenance.find({ 
        vehicle: vehicle._id, 
        status: 'programado',
        scheduledDate: { $gte: new Date() }
      })
        .populate('branch', 'name')
        .populate('assignedTo', 'name lastName')
        .sort({ scheduledDate: 1 })
        .limit(5)
    ]);

    res.json({
      vehicle: {
        ...vehicle.toObject(),
        maintenance: {
          needsOilChange: vehicle.needsOilChange(),
          needsInspection: vehicle.needsInspection(),
          expiringDocuments: vehicle.getExpiringDocuments(30)
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
  checkSubscriptionLimits('vehicles'),
  body('plateNumber', 'Número de placa es requerido').notEmpty().trim(),
  body('make', 'Marca es requerida').notEmpty().trim(),
  body('model', 'Modelo es requerido').notEmpty().trim(),
  body('year', 'Año es requerido').isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  body('vehicleType', 'Tipo de vehículo es requerido').notEmpty(),
  body('branch', 'Sucursal es requerida').notEmpty().isMongoId(),
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

    const companyId = req.body.company || req.user.company._id;

    // Verificar que la sucursal pertenece a la empresa (solo si se proporciona)
    if (branch) {
      const branchDoc = await Branch.findOne({ _id: branch, company: companyId });
      if (!branchDoc) {
        return res.status(400).json({ message: 'Sucursal no válida' });
      }
    }

    // Verificar acceso al tipo de vehículo
    if (req.user.vehicleTypeAccess && req.user.vehicleTypeAccess.length > 0) {
      if (!req.user.vehicleTypeAccess.includes(vehicleType)) {
        return res.status(403).json({ message: 'No tienes acceso para crear este tipo de vehículo' });
      }
    }

    // Verificar que la placa no exista en la empresa
    const existingVehicle = await Vehicle.findOne({ 
      company: companyId, 
      plateNumber: plateNumber.toUpperCase() 
    });
    
    if (existingVehicle) {
      return res.status(400).json({ message: 'El número de placa ya existe en esta empresa' });
    }

    // Verificar VIN si se proporciona
    if (vin) {
      const existingVin = await Vehicle.findOne({ vin: vin.toUpperCase() });
      if (existingVin) {
        return res.status(400).json({ message: 'El VIN ya está registrado' });
      }
    }

    const vehicle = new Vehicle({
      plateNumber: plateNumber.toUpperCase(),
      vin: vin ? vin.toUpperCase() : undefined,
      company: companyId,
      branch,
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
      createdBy: req.user._id
    });

    await vehicle.save();

    const populatedVehicle = await Vehicle.findById(vehicle._id)
      .populate('company', 'name')
      .populate('branch', 'name code')
      .populate('createdBy', 'name lastName');

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

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && vehicle.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    // Verificar acceso al tipo de vehículo actual
    if (req.user.vehicleTypeAccess && req.user.vehicleTypeAccess.length > 0) {
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
        company: vehicle.company, 
        plateNumber: plateNumber.toUpperCase(),
        _id: { $ne: vehicle._id }
      });
      
      if (existingVehicle) {
        return res.status(400).json({ message: 'El número de placa ya existe en esta empresa' });
      }
    }

    // Verificar VIN único si se está actualizando
    if (vin && vin.toUpperCase() !== vehicle.vin) {
      const existingVin = await Vehicle.findOne({ 
        vin: vin.toUpperCase(),
        _id: { $ne: vehicle._id }
      });
      
      if (existingVin) {
        return res.status(400).json({ message: 'El VIN ya está registrado' });
      }
    }

    // Verificar acceso al nuevo tipo de vehículo si se está cambiando
    if (vehicleType && vehicleType !== vehicle.vehicleType) {
      if (req.user.vehicleTypeAccess && req.user.vehicleTypeAccess.length > 0) {
        if (!req.user.vehicleTypeAccess.includes(vehicleType)) {
          return res.status(403).json({ message: 'No tienes acceso para cambiar a este tipo de vehículo' });
        }
      }
    }

    // Verificar sucursal si se está cambiando
    if (branch && branch !== vehicle.branch.toString()) {
      const branchDoc = await Branch.findOne({ _id: branch, company: vehicle.company });
      if (!branchDoc) {
        return res.status(400).json({ message: 'Sucursal no válida' });
      }
    }

    const updateData = {
      lastModifiedBy: req.user._id,
      modifiedBy: req.user._id
    };
    
    if (plateNumber) updateData.plateNumber = plateNumber.toUpperCase();
    if (vin) updateData.vin = vin.toUpperCase();
    if (make) updateData.make = make;
    if (model) updateData.model = model;
    if (year) updateData.year = year;
    if (color) updateData.color = color;
    if (vehicleType) updateData.vehicleType = vehicleType;
    if (category) updateData.category = category;
    if (engine) updateData.engine = { ...vehicle.engine, ...engine };
    if (transmission) updateData.transmission = transmission;
    if (fuelCapacity) updateData.fuelCapacity = fuelCapacity;
    if (odometer) updateData.odometer = { ...vehicle.odometer, ...odometer };
    if (owner) updateData.owner = { ...vehicle.owner, ...owner };
    if (documents) updateData.documents = { ...vehicle.documents, ...documents };
    if (specifications) updateData.specifications = { ...vehicle.specifications, ...specifications };
    if (ownership) updateData.ownership = { ...vehicle.ownership, ...ownership };
    if (photos) updateData.photos = photos;
    if (maintenanceSchedule) updateData.maintenanceSchedule = { ...vehicle.maintenanceSchedule, ...maintenanceSchedule };
    if (costs) updateData.costs = { ...vehicle.costs, ...costs };
    if (status) updateData.status = status;
    if (condition) updateData.condition = condition;
    if (notes) updateData.notes = notes;
    if (branch) updateData.branch = branch;

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('company', 'name')
     .populate('branch', 'name code')
     .populate('createdBy', 'name lastName')
      .populate('lastModifiedBy', 'name lastName');

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
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && vehicle.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    // Verificar si tiene mantenimientos
    const Maintenance = require('../models/Maintenance');
    const maintenanceCount = await Maintenance.countDocuments({ vehicle: vehicle._id });

    if (maintenanceCount > 0) {
      // Soft delete
      vehicle.isActive = false;
      vehicle.status = 'dado_de_baja';
      await vehicle.save();
      
      res.json({ message: 'Vehículo dado de baja exitosamente' });
    } else {
      // Hard delete si no tiene mantenimientos
      await Vehicle.findByIdAndDelete(req.params.id);
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
    
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && vehicle.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    if (reading < vehicle.odometer.current) {
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

// @route   GET /api/vehicles/:id/maintenance-alerts
// @desc    Obtener alertas de mantenimiento
// @access  Private
router.get('/:id/maintenance-alerts', [
  auth,
  checkPermission('vehicles', 'read'),
  logActivity('Ver alertas de mantenimiento')
], async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && vehicle.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    const alerts = [];

    // Alertas de mantenimiento
    if (vehicle.needsOilChange()) {
      alerts.push({
        type: 'maintenance',
        priority: 'alta',
        title: 'Cambio de aceite requerido',
        description: 'El vehículo necesita cambio de aceite',
        dueKm: vehicle.maintenanceSchedule.oilChange.lastKm + vehicle.maintenanceSchedule.oilChange.intervalKm
      });
    }

    if (vehicle.needsInspection()) {
      alerts.push({
        type: 'maintenance',
        priority: 'media',
        title: 'Inspección general requerida',
        description: 'El vehículo necesita inspección general',
        dueKm: vehicle.maintenanceSchedule.generalInspection.lastKm + vehicle.maintenanceSchedule.generalInspection.intervalKm
      });
    }

    // Alertas de documentos
    const expiringDocs = vehicle.getExpiringDocuments(30);
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
    const companyId = company || req.user.company._id;
    
    const matchQuery = { company: companyId };
    
    if (branch) {
      matchQuery.branch = branch;
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      matchQuery.branch = req.user.branch;
    }

    const [statusStats, typeStats, conditionStats, totalVehicles] = await Promise.all([
      Vehicle.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Vehicle.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$vehicleType', count: { $sum: 1 } } }
      ]),
      Vehicle.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$condition', count: { $sum: 1 } } }
      ]),
      Vehicle.countDocuments(matchQuery)
    ]);

    res.json({
      total: totalVehicles,
      byStatus: statusStats,
      byType: typeStats,
      byCondition: conditionStats
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
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && vehicle.company.toString() !== req.user.company._id.toString()) {
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
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    }));

    // Actualizar vehículo con nuevas fotos
    vehicle.photos = vehicle.photos || [];
    vehicle.photos.push(...photosWithMetadata);
    vehicle.lastModifiedBy = req.user._id;
    
    await vehicle.save();

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
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso
    if (req.user.role !== 'super_admin' && vehicle.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    // Encontrar y eliminar la foto
    const photoIndex = vehicle.photos.findIndex(photo => photo._id.toString() === req.params.photoId);
    if (photoIndex === -1) {
      return res.status(404).json({ message: 'Foto no encontrada' });
    }

    vehicle.photos.splice(photoIndex, 1);
    vehicle.lastModifiedBy = req.user._id;
    
    await vehicle.save();

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

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso a la empresa
    if (vehicle.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    const newDocument = {
      name,
      url,
      type: type || 'document',
      uploadDate: new Date(),
      uploadedBy: req.user._id
    };

    vehicle.attachments.push(newDocument);
    vehicle.lastModifiedBy = req.user._id;
    await vehicle.save();

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
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('attachments.uploadedBy', 'name email')
      .select('attachments company');
      
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso a la empresa
    if (vehicle.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    res.json(vehicle.attachments);
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
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Verificar acceso a la empresa
    if (vehicle.company.toString() !== req.user.company._id.toString()) {
      return res.status(403).json({ message: 'No tienes acceso a este vehículo' });
    }

    const documentIndex = vehicle.attachments.findIndex(
      doc => doc._id.toString() === req.params.documentId
    );

    if (documentIndex === -1) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    vehicle.attachments.splice(documentIndex, 1);
    vehicle.lastModifiedBy = req.user._id;
    await vehicle.save();

    res.json({ message: 'Documento eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;