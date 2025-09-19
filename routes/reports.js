const express = require('express');
const { body, validationResult } = require('express-validator');
const { Vehicle, Maintenance, FuelRecord, Company, Branch, User } = require('../models');
const { auth, checkPermission, logActivity } = require('../middleware/auth');
const { Op } = require('sequelize');
const {
  getVehicleStats,
  getMaintenanceStats,
  getFuelStats,
  getRecentMaintenances,
  getUpcomingMaintenances,
  getMaintenanceAlerts,
  getUserStats,
  getCompanyStats,
  getBranchStats,
  getMaintenanceChart,
  getVehicleDistribution,
  generateCSVResponse
} = require('../utils/reportHelpers');

const router = express.Router();

// @route   GET /api/reports/dashboard
// @desc    Obtener datos del dashboard principal
// @access  Private
router.get('/dashboard', [
  auth,
  checkPermission('reports', 'read'),
  logActivity('Ver dashboard')
], async (req, res) => {
  try {
    const { company, branch, period = '30' } = req.query;
    const companyId = company || req.user.companyId;
    
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(period));
    const dateTo = new Date();
    
    const baseQuery = { companyId: companyId };
    
    if (branch) {
      baseQuery.branchId = branch;
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      baseQuery.branchId = req.user.branchId;
    }

    // Obtener estadísticas con manejo de errores individual
    const [
      vehicleStats,
      maintenanceStats,
      fuelStats,
      recentMaintenances,
      upcomingMaintenances,
      alerts,
      userStats,
      companyStats,
      branchStats,
      maintenanceChart,
      vehicleDistribution
    ] = await Promise.allSettled([
      getVehicleStats(baseQuery),
      getMaintenanceStats(baseQuery, dateFrom, dateTo),
      getFuelStats(baseQuery, dateFrom, dateTo),
      getRecentMaintenances(baseQuery, 5),
      getUpcomingMaintenances(baseQuery, 10),
      getMaintenanceAlerts(baseQuery),
      getUserStats(baseQuery, req.user),
      getCompanyStats(req.user),
      getBranchStats(baseQuery, req.user),
      getMaintenanceChart(baseQuery),
      getVehicleDistribution(baseQuery)
    ]);

    res.json({
      period: parseInt(period),
      dateRange: { from: dateFrom, to: dateTo },
      vehicles: vehicleStats.status === 'fulfilled' ? vehicleStats.value : { total: 0, active: 0, inactive: 0, inMaintenance: 0 },
      maintenance: maintenanceStats.status === 'fulfilled' ? maintenanceStats.value : { total: 0, completed: 0, pending: 0, overdue: 0 },
      fuel: fuelStats.status === 'fulfilled' ? fuelStats.value : { totalLiters: 0, totalCost: 0, averageConsumption: 0 },
      recentMaintenances: recentMaintenances.status === 'fulfilled' ? recentMaintenances.value : [],
      upcomingMaintenances: upcomingMaintenances.status === 'fulfilled' ? upcomingMaintenances.value : [],
      alerts: alerts.status === 'fulfilled' ? alerts.value : [],
      users: userStats.status === 'fulfilled' ? userStats.value : { total: 0, active: 0 },
      companies: companyStats.status === 'fulfilled' ? companyStats.value : { total: 0 },
      branches: branchStats.status === 'fulfilled' ? branchStats.value : { total: 0 },
      maintenanceChart: maintenanceChart.status === 'fulfilled' ? maintenanceChart.value : [],
      vehicleDistribution: vehicleDistribution.status === 'fulfilled' ? vehicleDistribution.value : []
    });

  } catch (error) {
    console.error('Error obteniendo dashboard:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/reports/vehicles
// @desc    Reporte de vehículos
// @access  Private
router.get('/vehicles', [
  auth,
  checkPermission('reports', 'read'),
  logActivity('Generar reporte de vehículos')
], async (req, res) => {
  try {
    const { 
      company, 
      branch, 
      status, 
      vehicleType, 
      condition,
      yearFrom,
      yearTo,
      format = 'json'
    } = req.query;
    
    const companyId = company || req.user.companyId;
    const query = { companyId: companyId };
    
    if (branch) query.branchId = branch;
    if (status) query.status = status;
    if (vehicleType) query.vehicleType = vehicleType;
    if (condition) query.condition = condition;
    if (yearFrom || yearTo) {
      query.year = {};
      if (yearFrom) query.year[Op.gte] = parseInt(yearFrom);
      if (yearTo) query.year[Op.lte] = parseInt(yearTo);
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      query.branchId = req.user.branchId;
    }

    const vehicles = await Vehicle.findAll({
      where: query,
      include: [
        { model: Company, as: 'company', attributes: ['name'] },
        { model: Branch, as: 'branch', attributes: ['name', 'code'] },
        { model: User, as: 'createdBy', attributes: ['firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Estadísticas básicas
    const stats = {
      total: vehicles.length,
      byStatus: {},
      byType: {},
      byCondition: {}
    };

    // Agrupar estadísticas
    vehicles.forEach(vehicle => {
      // Por estado
      stats.byStatus[vehicle.status] = (stats.byStatus[vehicle.status] || 0) + 1;
      // Por tipo
      stats.byType[vehicle.vehicleType] = (stats.byType[vehicle.vehicleType] || 0) + 1;
      // Por condición
      stats.byCondition[vehicle.condition] = (stats.byCondition[vehicle.condition] || 0) + 1;
    });

    if (format === 'csv') {
      const exportData = vehicles.map(vehicle => ({
        'Placa': vehicle.plateNumber || 'N/A',
        'Marca': vehicle.make || 'N/A',
        'Modelo': vehicle.model || 'N/A',
        'Año': vehicle.year || 'N/A',
        'Tipo': vehicle.vehicleType || 'N/A',
        'Estado': vehicle.status || 'N/A',
        'Condición': vehicle.condition || 'N/A',
        'Sucursal': vehicle.branch?.name || 'N/A',
        'Fecha Registro': vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleDateString('es-ES') : 'N/A'
      }));
      return generateCSVResponse(res, exportData, 'reporte-vehiculos');
    }

    res.json({
      vehicles,
      stats,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Error generando reporte de vehículos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/reports/maintenance
// @desc    Reporte de mantenimientos
// @access  Private
router.get('/maintenance', [
  auth,
  checkPermission('reports', 'read'),
  logActivity('Generar reporte de mantenimientos')
], async (req, res) => {
  try {
    const { 
      company, 
      branch, 
      vehicle,
      status, 
      type, 
      priority,
      assignedTo,
      dateFrom,
      dateTo,
      format = 'json'
    } = req.query;
    
    const companyId = company || req.user.companyId;
    const query = { companyId: companyId };
    
    if (branch) query.branchId = branch;
    if (vehicle) query.vehicleId = vehicle;
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedToId = assignedTo;
    
    if (dateFrom || dateTo) {
      query.scheduledDate = {};
      if (dateFrom) query.scheduledDate[Op.gte] = new Date(dateFrom);
      if (dateTo) query.scheduledDate[Op.lte] = new Date(dateTo);
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      query.branchId = req.user.branchId;
    }

    const maintenances = await Maintenance.findAll({
      where: query,
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['plateNumber', 'make', 'model', 'year'] },
        { model: Company, as: 'company', attributes: ['name'] },
        { model: Branch, as: 'branch', attributes: ['name', 'code'] },
        { model: User, as: 'assignedTo', attributes: ['firstName', 'lastName'] },
        { model: User, as: 'createdBy', attributes: ['firstName', 'lastName'] }
      ],
      order: [['scheduledDate', 'DESC']]
    });

    // Estadísticas básicas
    const stats = {
      total: maintenances.length,
      byStatus: {},
      byType: {},
      byPriority: {}
    };

    // Agrupar estadísticas
    maintenances.forEach(maintenance => {
      stats.byStatus[maintenance.status] = (stats.byStatus[maintenance.status] || 0) + 1;
      stats.byType[maintenance.type] = (stats.byType[maintenance.type] || 0) + 1;
      stats.byPriority[maintenance.priority] = (stats.byPriority[maintenance.priority] || 0) + 1;
    });

    if (format === 'csv') {
      const exportData = maintenances.map(maintenance => ({
        'Orden': maintenance.workOrderNumber || 'N/A',
        'Vehículo': maintenance.vehicle?.plateNumber || 'N/A',
        'Tipo': maintenance.type || 'N/A',
        'Estado': maintenance.status || 'N/A',
        'Prioridad': maintenance.priority || 'N/A',
        'Fecha Programada': maintenance.scheduledDate ? new Date(maintenance.scheduledDate).toLocaleDateString('es-ES') : 'N/A',
        'Asignado a': maintenance.assignedTo ? `${maintenance.assignedTo.firstName} ${maintenance.assignedTo.lastName}` : 'N/A',
        'Sucursal': maintenance.branch?.name || 'N/A'
      }));
      return generateCSVResponse(res, exportData, 'reporte-mantenimientos');
    }

    res.json({
      maintenances,
      stats,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Error generando reporte de mantenimientos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/reports/fuel
// @desc    Reporte de combustible
// @access  Private
router.get('/fuel', [
  auth,
  checkPermission('reports', 'read'),
  logActivity('Generar reporte de combustible')
], async (req, res) => {
  try {
    const { 
      company, 
      branch, 
      vehicle,
      dateFrom,
      dateTo,
      format = 'json'
    } = req.query;
    
    const companyId = company || req.user.companyId;
    
    // Obtener vehículos de la empresa/sucursal
    const vehicleQuery = { companyId };
    if (branch) vehicleQuery.branchId = branch;
    if (vehicle) vehicleQuery.id = vehicle;
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      vehicleQuery.branchId = req.user.branchId;
    }

    const vehicles = await Vehicle.findAll({
      where: vehicleQuery,
      attributes: ['id']
    });
    
    const vehicleIds = vehicles.map(v => v.id);
    
    if (vehicleIds.length === 0) {
      return res.json({
        fuelRecords: [],
        stats: { totalRecords: 0, totalLiters: 0, totalCost: 0, averagePrice: 0 },
        generatedAt: new Date()
      });
    }

    const fuelQuery = { vehicleId: { [Op.in]: vehicleIds } };
    
    if (dateFrom || dateTo) {
      fuelQuery.fuelDate = {};
      if (dateFrom) fuelQuery.fuelDate[Op.gte] = new Date(dateFrom);
      if (dateTo) fuelQuery.fuelDate[Op.lte] = new Date(dateTo);
    }

    const fuelRecords = await FuelRecord.findAll({
      where: fuelQuery,
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'plateNumber', 'make', 'model', 'vehicleType'],
          include: [
            { model: Branch, as: 'branch', attributes: ['name'] }
          ]
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['firstName', 'lastName']
        }
      ],
      order: [['fuelDate', 'DESC']]
    });

    // Calcular estadísticas
    const stats = {
      totalRecords: fuelRecords.length,
      totalLiters: fuelRecords.reduce((sum, record) => sum + (record.liters || 0), 0),
      totalCost: fuelRecords.reduce((sum, record) => sum + (record.totalCost || 0), 0),
      averagePrice: fuelRecords.length > 0 ? 
        fuelRecords.reduce((sum, record) => sum + (record.pricePerLiter || 0), 0) / fuelRecords.length : 0
    };

    if (format === 'csv') {
      const exportData = fuelRecords.map(record => ({
        'Fecha': record.fuelDate ? new Date(record.fuelDate).toLocaleDateString('es-ES') : 'N/A',
        'Vehículo': record.vehicle?.plateNumber || 'N/A',
        'Marca/Modelo': `${record.vehicle?.make || ''} ${record.vehicle?.model || ''}`.trim() || 'N/A',
        'Tipo Combustible': record.fuelType || 'diesel',
        'Litros': record.liters || 0,
        'Precio/Litro': record.pricePerLiter || 0,
        'Costo Total': record.totalCost || 0,
        'Odómetro': record.odometer || 'N/A',
        'Estación': record.station || 'N/A',
        'Sucursal': record.vehicle?.branch?.name || 'N/A'
      }));
      return generateCSVResponse(res, exportData, 'reporte-combustible');
    }

    res.json({
      fuelRecords,
      stats,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Error generando reporte de combustible:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;