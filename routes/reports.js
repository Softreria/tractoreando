const express = require('express');
const { body, validationResult } = require('express-validator');
const Vehicle = require('../models/Vehicle');
const Maintenance = require('../models/Maintenance');
const FuelRecord = require('../models/FuelRecord');
const Company = require('../models/Company');
const Branch = require('../models/Branch');
const User = require('../models/User');
const { auth, checkPermission, logActivity } = require('../middleware/auth');
const moment = require('moment');

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
    
    const dateFrom = moment().subtract(parseInt(period), 'days').startOf('day').toDate();
    const dateTo = moment().endOf('day').toDate();
    
    const baseQuery = { companyId: companyId };
    
    if (branch) {
      baseQuery.branchId = branch;
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      baseQuery.branchId = req.user.branchId;
    }

    // Consultas paralelas para obtener estadísticas
    const [vehicleStats, maintenanceStats, fuelStats, recentMaintenances, upcomingMaintenances, alerts, userStats, companyStats, branchStats, maintenanceChart, vehicleDistribution] = await Promise.all([
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
      vehicles: vehicleStats,
      maintenance: maintenanceStats,
      fuel: fuelStats,
      recentMaintenances,
      upcomingMaintenances,
      alerts,
      users: userStats,
      companies: companyStats,
      branches: branchStats,
      maintenanceChart,
      vehicleDistribution
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
    
    const { Op } = require('sequelize');
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
        { model: Company, attributes: ['name'] },
        { model: Branch, attributes: ['name', 'code'] },
        { model: User, as: 'createdBy', attributes: ['firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Agregar estadísticas de mantenimiento para cada vehículo
    const vehiclesWithStats = await Promise.all(
      vehicles.map(async (vehicle) => {
        const [totalMaintenances, completedMaintenances, totalCostResult, lastMaintenance] = await Promise.all([
          Maintenance.count({ where: { vehicleId: vehicle.id } }),
          Maintenance.count({ where: { vehicleId: vehicle.id, status: 'completado' } }),
          Maintenance.findOne({
            attributes: [[Maintenance.sequelize.fn('SUM', Maintenance.sequelize.literal('CAST(costs->\'actual\' AS DECIMAL)')), 'total']],
            where: { vehicleId: vehicle.id, status: 'completado' },
            raw: true
          }),
          Maintenance.findOne({ 
            where: {
              vehicleId: vehicle.id, 
              status: 'completado' 
            },
            order: [['completedDate', 'DESC']]
          })
        ]);
        
        const totalCost = totalCostResult?.total || 0;
        
        return {
           ...vehicle.toJSON(),
           maintenanceStats: {
             total: totalMaintenances,
             completed: completedMaintenances,
             totalCost: totalCost,
             lastMaintenance: lastMaintenance?.completedDate,
             needsOilChange: vehicle.needsOilChange ? vehicle.needsOilChange() : false,
             needsInspection: vehicle.needsInspection ? vehicle.needsInspection() : false
           }
         };
      })
    );

    // Estadísticas generales
    const stats = {
      total: vehicles.length,
      byStatus: await getGroupedStats(query, 'status', Vehicle),
      byType: await getGroupedStats(query, 'vehicleType', Vehicle),
      byCondition: await getGroupedStats(query, 'condition', Vehicle),
      byYear: await getGroupedStats(query, 'year', Vehicle),
      averageAge: vehicles.reduce((sum, v) => sum + v.age, 0) / vehicles.length || 0
    };

    if (format === 'csv') {
      return generateCSVResponse(res, vehiclesWithStats, 'vehicles_report');
    }

    res.json({
      vehicles: vehiclesWithStats,
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
    const query = { company: companyId };
    
    if (branch) query.branch = branch;
    if (vehicle) query.vehicle = vehicle;
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    
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
      .populate('assignedTo', 'name lastName')
      .populate('createdBy', 'name lastName')
      .sort({ scheduledDate: -1 });

    // Estadísticas generales
    const stats = {
      total: maintenances.length,
      byStatus: await getGroupedStats(query, 'status', Maintenance),
      byType: await getGroupedStats(query, 'type', Maintenance),
      byPriority: await getGroupedStats(query, 'priority', Maintenance),
      totalCost: maintenances.reduce((sum, m) => sum + (m.costs.actual || 0), 0),
      averageCost: maintenances.length > 0 ? 
        maintenances.reduce((sum, m) => sum + (m.costs.actual || 0), 0) / maintenances.length : 0,
      averageDuration: await getAverageDuration(query),
      completionRate: maintenances.length > 0 ? 
        (maintenances.filter(m => m.status === 'completado').length / maintenances.length) * 100 : 0
    };

    if (format === 'csv') {
      return generateCSVResponse(res, maintenances, 'maintenance_report');
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

// @route   GET /api/reports/costs
// @desc    Reporte de costos (mantenimiento + combustible)
// @access  Private
router.get('/costs', [
  auth,
  checkPermission('reports', 'read'),
  logActivity('Generar reporte de costos')
], async (req, res) => {
  try {
    const { 
      company, 
      branch, 
      vehicle,
      dateFrom,
      dateTo,
      groupBy = 'month',
      format = 'json'
    } = req.query;
    
    const companyId = company || req.user.companyId;
    const dateFromParsed = dateFrom ? new Date(dateFrom) : moment().subtract(12, 'months').startOf('month').toDate();
    const dateToParsed = dateTo ? new Date(dateTo) : moment().endOf('month').toDate();
    
    // Condiciones base para mantenimientos
    const maintenanceWhere = {
      companyId,
      status: 'completado',
      completedDate: {
        [require('sequelize').Op.between]: [dateFromParsed, dateToParsed]
      }
    };
    
    // Condiciones base para combustible
    const fuelWhere = {
      companyId,
      fuelDate: {
        [require('sequelize').Op.between]: [dateFromParsed, dateToParsed]
      }
    };
    
    if (branch) {
      maintenanceWhere.branchId = branch;
      fuelWhere.branchId = branch;
    }
    if (vehicle) {
      maintenanceWhere.vehicleId = vehicle;
      fuelWhere.vehicleId = vehicle;
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      maintenanceWhere.branchId = req.user.branchId;
      fuelWhere.branchId = req.user.branchId;
    }

    // Agregación para costos de mantenimiento por período
    const groupFormat = getSequelizeGroupFormat(groupBy);
    const maintenanceCostsByPeriod = await Maintenance.findAll({
      attributes: [
        [groupFormat, '_id'],
        [Maintenance.sequelize.fn('SUM', Maintenance.sequelize.cast(Maintenance.sequelize.json('costs.actual'), 'DECIMAL')), 'maintenanceCost'],
        [Maintenance.sequelize.fn('SUM', Maintenance.sequelize.cast(Maintenance.sequelize.json('costs.labor'), 'DECIMAL')), 'laborCost'],
        [Maintenance.sequelize.fn('SUM', Maintenance.sequelize.cast(Maintenance.sequelize.json('costs.parts'), 'DECIMAL')), 'partsCost'],
        [Maintenance.sequelize.fn('COUNT', '*'), 'maintenanceCount']
      ],
      where: maintenanceWhere,
      group: [groupFormat],
      order: [[Maintenance.sequelize.literal('_id'), 'ASC']],
      raw: true
    });

    // Agregación para costos de combustible por período
    const fuelGroupFormat = groupBy === 'month' ? 
      FuelRecord.sequelize.fn('DATE_FORMAT', FuelRecord.sequelize.col('fuelDate'), '%Y-%m') :
      groupBy === 'week' ?
      FuelRecord.sequelize.fn('YEARWEEK', FuelRecord.sequelize.col('fuelDate')) :
      FuelRecord.sequelize.fn('DATE_FORMAT', FuelRecord.sequelize.col('fuelDate'), '%Y-%m-%d');
    
    const fuelCostsByPeriod = await FuelRecord.findAll({
      attributes: [
        [fuelGroupFormat, '_id'],
        [FuelRecord.sequelize.fn('SUM', FuelRecord.sequelize.col('totalCost')), 'fuelCost'],
        [FuelRecord.sequelize.fn('SUM', FuelRecord.sequelize.col('liters')), 'totalLiters'],
        [FuelRecord.sequelize.fn('COUNT', '*'), 'fuelCount']
      ],
      where: fuelWhere,
      group: [fuelGroupFormat],
      order: [[FuelRecord.sequelize.literal('_id'), 'ASC']],
      raw: true
    });

    // Combinar costos de mantenimiento y combustible por período
    const costsByPeriod = {};
    
    // Agregar costos de mantenimiento
    maintenanceCostsByPeriod.forEach(item => {
      const period = item._id;
      costsByPeriod[period] = {
        _id: period,
        maintenanceCost: parseFloat(item.maintenanceCost) || 0,
        laborCost: parseFloat(item.laborCost) || 0,
        partsCost: parseFloat(item.partsCost) || 0,
        maintenanceCount: item.maintenanceCount || 0,
        fuelCost: 0,
        totalLiters: 0,
        fuelCount: 0,
        totalCost: parseFloat(item.maintenanceCost) || 0
      };
    });
    
    // Agregar costos de combustible
    fuelCostsByPeriod.forEach(item => {
      const period = item._id;
      if (!costsByPeriod[period]) {
        costsByPeriod[period] = {
          _id: period,
          maintenanceCost: 0,
          laborCost: 0,
          partsCost: 0,
          maintenanceCount: 0,
          fuelCost: 0,
          totalLiters: 0,
          fuelCount: 0,
          totalCost: 0
        };
      }
      costsByPeriod[period].fuelCost = parseFloat(item.fuelCost) || 0;
      costsByPeriod[period].totalLiters = parseFloat(item.totalLiters) || 0;
      costsByPeriod[period].fuelCount = item.fuelCount || 0;
      costsByPeriod[period].totalCost += parseFloat(item.fuelCost) || 0;
    });
    
    // Convertir a array y ordenar
    const costsByPeriodArray = Object.values(costsByPeriod).sort((a, b) => a._id.localeCompare(b._id));

    // Costos por vehículo usando Sequelize con JOIN
    const costsByVehicle = await Maintenance.findAll({
      attributes: [
        'vehicleId',
        [Maintenance.sequelize.fn('SUM', Maintenance.sequelize.cast(Maintenance.sequelize.json('costs.actual'), 'DECIMAL')), 'totalCost'],
        [Maintenance.sequelize.fn('COUNT', '*'), 'count']
      ],
      include: [{
        model: Vehicle,
        as: 'vehicle',
        attributes: ['id', 'licensePlate', 'brand', 'model']
      }],
      where: maintenanceWhere,
      group: ['vehicleId', 'vehicle.id', 'vehicle.licensePlate', 'vehicle.brand', 'vehicle.model'],
      order: [[Maintenance.sequelize.literal('totalCost'), 'DESC']],
      limit: 10,
      raw: true,
      nest: true
    });

    // Costos por tipo de mantenimiento
    const costsByType = await Maintenance.findAll({
      attributes: [
        'type',
        [Maintenance.sequelize.fn('SUM', Maintenance.sequelize.cast(Maintenance.sequelize.json('costs.actual'), 'DECIMAL')), 'totalCost'],
        [Maintenance.sequelize.fn('COUNT', '*'), 'count']
      ],
      where: maintenanceWhere,
      group: ['type'],
      order: [[Maintenance.sequelize.literal('totalCost'), 'DESC']],
      raw: true
    });

    // Estadísticas totales
    const totalStats = {
      totalCost: costsByPeriodArray.reduce((sum, item) => sum + (parseFloat(item.totalCost) || 0), 0),
      maintenanceCost: costsByPeriodArray.reduce((sum, item) => sum + (parseFloat(item.maintenanceCost) || 0), 0),
      fuelCost: costsByPeriodArray.reduce((sum, item) => sum + (parseFloat(item.fuelCost) || 0), 0),
      laborCost: costsByPeriodArray.reduce((sum, item) => sum + (parseFloat(item.laborCost) || 0), 0),
      partsCost: costsByPeriodArray.reduce((sum, item) => sum + (parseFloat(item.partsCost) || 0), 0),
      totalLiters: costsByPeriodArray.reduce((sum, item) => sum + (parseFloat(item.totalLiters) || 0), 0),
      totalRecords: costsByPeriodArray.reduce((sum, item) => sum + (item.maintenanceCount || 0) + (item.fuelCount || 0), 0)
    };

    if (format === 'csv') {
      return generateCSVResponse(res, costsByPeriodArray, 'costs_report');
    }

    res.json({
      summary: totalStats,
      byPeriod: costsByPeriodArray,
      byVehicle: costsByVehicle,
      byType: costsByType,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Error generando reporte de costos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/reports/performance
// @desc    Reporte de rendimiento
// @access  Private
router.get('/performance', [
  auth,
  checkPermission('reports', 'read'),
  logActivity('Generar reporte de rendimiento')
], async (req, res) => {
  try {
    const { 
      company, 
      branch,
      dateFrom,
      dateTo,
      format = 'json'
    } = req.query;
    
    const companyId = company || req.user.companyId;
    const baseQuery = { company: companyId };
    
    if (branch) baseQuery.branch = branch;
    
    const dateQuery = {};
    if (dateFrom || dateTo) {
      if (dateFrom) dateQuery.$gte = new Date(dateFrom);
      if (dateTo) dateQuery.$lte = new Date(dateTo);
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      baseQuery.branch = req.user.branch;
    }

    // Rendimiento por mecánico
    const mechanicPerformance = await Maintenance.aggregate([
      { 
        $match: { 
          ...baseQuery, 
          status: 'completado',
          ...(Object.keys(dateQuery).length > 0 && { completedDate: dateQuery })
        } 
      },
      {
        $group: {
          _id: '$assignedTo',
          completedJobs: { $sum: 1 },
          totalHours: { $sum: '$duration' },
          totalCost: { $sum: '$costs.actual' },
          avgCost: { $avg: '$costs.actual' },
          avgDuration: { $avg: '$duration' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'mechanic'
        }
      },
      { $unwind: '$mechanic' },
      { $sort: { 'completedJobs': -1 } }
    ]);

    // Rendimiento por sucursal
    const branchPerformance = await Maintenance.aggregate([
      { 
        $match: { 
          ...baseQuery,
          status: 'completado',
          ...(Object.keys(dateQuery).length > 0 && { completedDate: dateQuery })
        } 
      },
      {
        $group: {
          _id: '$branch',
          completedJobs: { $sum: 1 },
          totalCost: { $sum: '$costs.actual' },
          avgCost: { $avg: '$costs.actual' },
          avgDuration: { $avg: '$duration' }
        }
      },
      {
        $lookup: {
          from: 'branches',
          localField: '_id',
          foreignField: '_id',
          as: 'branch'
        }
      },
      { $unwind: '$branch' },
      { $sort: { 'completedJobs': -1 } }
    ]);

    // Tiempo promedio por tipo de mantenimiento
    const avgTimeByType = await Maintenance.aggregate([
      { 
        $match: { 
          ...baseQuery,
          status: 'completado',
          ...(Object.keys(dateQuery).length > 0 && { completedDate: dateQuery })
        } 
      },
      {
        $group: {
          _id: '$type',
          avgDuration: { $avg: '$duration' },
          count: { $sum: 1 }
        }
      },
      { $sort: { 'avgDuration': -1 } }
    ]);

    // Eficiencia (trabajos completados a tiempo)
    const efficiency = await Maintenance.aggregate([
      { 
        $match: { 
          ...baseQuery,
          status: 'completado',
          ...(Object.keys(dateQuery).length > 0 && { completedDate: dateQuery })
        } 
      },
      {
        $project: {
          onTime: {
            $cond: [
              { $lte: ['$completedDate', '$scheduledDate'] },
              1,
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          onTimeJobs: { $sum: '$onTime' }
        }
      }
    ]);

    const efficiencyRate = efficiency[0] ? 
      (efficiency[0].onTimeJobs / efficiency[0].totalJobs) * 100 : 0;

    if (format === 'csv') {
      return generateCSVResponse(res, mechanicPerformance, 'performance_report');
    }

    res.json({
      mechanicPerformance,
      branchPerformance,
      avgTimeByType,
      efficiency: {
        rate: efficiencyRate,
        ...efficiency[0]
      },
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Error generando reporte de rendimiento:', error);
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
    const { Op } = require('sequelize');
    
    // Construir query base
    const baseQuery = { companyId };
    
    if (branch) baseQuery.branchId = branch;
    if (vehicle) baseQuery.vehicleId = vehicle;
    
    // Filtrar por fechas
    if (dateFrom || dateTo) {
      baseQuery.fuelDate = {};
      if (dateFrom) baseQuery.fuelDate[Op.gte] = new Date(dateFrom);
      if (dateTo) baseQuery.fuelDate[Op.lte] = new Date(dateTo);
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      // Obtener vehículos de la sucursal del usuario
      const userVehicles = await Vehicle.findAll({
        where: { branchId: req.user.branchId },
        attributes: ['id']
      });
      const vehicleIds = userVehicles.map(v => v.id);
      baseQuery.vehicleId = { [Op.in]: vehicleIds };
    }

    // Obtener registros de combustible
    const fuelRecords = await FuelRecord.findAll({
      where: baseQuery,
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
        fuelRecords.reduce((sum, record) => sum + (record.pricePerLiter || 0), 0) / fuelRecords.length : 0,
      byFuelType: {},
      byVehicle: {},
      byMonth: {}
    };

    // Agrupar por tipo de combustible
    fuelRecords.forEach(record => {
      const fuelType = record.fuelType || 'diesel';
      if (!stats.byFuelType[fuelType]) {
        stats.byFuelType[fuelType] = { count: 0, liters: 0, cost: 0 };
      }
      stats.byFuelType[fuelType].count++;
      stats.byFuelType[fuelType].liters += record.liters || 0;
      stats.byFuelType[fuelType].cost += record.totalCost || 0;
    });

    // Agrupar por vehículo
    fuelRecords.forEach(record => {
      const vehicleKey = record.vehicle?.plateNumber || 'N/A';
      if (!stats.byVehicle[vehicleKey]) {
        stats.byVehicle[vehicleKey] = { count: 0, liters: 0, cost: 0 };
      }
      stats.byVehicle[vehicleKey].count++;
      stats.byVehicle[vehicleKey].liters += record.liters || 0;
      stats.byVehicle[vehicleKey].cost += record.totalCost || 0;
    });

    // Agrupar por mes
    fuelRecords.forEach(record => {
      const month = moment(record.fuelDate).format('YYYY-MM');
      if (!stats.byMonth[month]) {
        stats.byMonth[month] = { count: 0, liters: 0, cost: 0 };
      }
      stats.byMonth[month].count++;
      stats.byMonth[month].liters += record.liters || 0;
      stats.byMonth[month].cost += record.totalCost || 0;
    });

    if (format === 'csv') {
      const exportData = fuelRecords.map(record => ({
        'Fecha': moment(record.fuelDate).format('DD/MM/YYYY'),
        'Vehículo': record.vehicle?.plateNumber || 'N/A',
        'Marca/Modelo': `${record.vehicle?.make || ''} ${record.vehicle?.model || ''}`.trim(),
        'Tipo Combustible': record.fuelType || 'diesel',
        'Litros': record.liters || 0,
        'Precio/Litro': record.pricePerLiter || 0,
        'Costo Total': record.totalCost || 0,
        'Odómetro': record.odometer || 'N/A',
        'Estación': record.station || 'N/A',
        'Ubicación': record.location || 'N/A',
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

// @route   GET /api/reports/vehicles/export
// @desc    Exportar reporte de vehículos
// @access  Private
router.get('/vehicles/export', [
  auth,
  checkPermission('reports', 'export'),
  logActivity('Exportar reporte de vehículos')
], async (req, res) => {
  try {
    const { format = 'csv', branch, vehicle, status, vehicleType, condition } = req.query;
    const companyId = req.user.companyId;
    
    const baseQuery = { companyId };
    
    if (branch) baseQuery.branchId = branch;
    if (status) baseQuery.status = status;
    if (vehicleType) baseQuery.vehicleType = vehicleType;
    if (condition) baseQuery.condition = condition;
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      baseQuery.branchId = req.user.branchId;
    }
    
    const vehicles = await Vehicle.findAll({
      where: baseQuery,
      include: [
        { model: Branch, as: 'branch', attributes: ['name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    const exportData = vehicles.map(vehicle => ({
      'Placa': vehicle.licensePlate,
      'Marca': vehicle.brand,
      'Modelo': vehicle.model,
      'Año': vehicle.year,
      'Tipo': vehicle.vehicleType,
      'Estado': vehicle.status,
      'Condición': vehicle.condition,
      'Kilometraje': vehicle.mileage,
      'Sucursal': vehicle.branch?.name || 'N/A',
      'Fecha Registro': moment(vehicle.createdAt).format('DD/MM/YYYY')
    }));
    
    if (format === 'csv') {
      generateCSVResponse(res, exportData, 'reporte-vehiculos');
    } else if (format === 'pdf') {
      await generatePDFResponse(res, exportData, 'Reporte de Vehículos', 'reporte-vehiculos');
    } else {
      res.status(400).json({ message: 'Formato no soportado' });
    }
    
  } catch (error) {
    console.error('Error exportando reporte de vehículos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/reports/maintenance/export
// @desc    Exportar reporte de mantenimientos
// @access  Private
router.get('/maintenance/export', [
  auth,
  checkPermission('reports', 'export'),
  logActivity('Exportar reporte de mantenimientos')
], async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate, branch, vehicle, type, priority, status } = req.query;
    const companyId = req.user.companyId;
    
    const baseQuery = { companyId };
    
    if (branch) baseQuery.branchId = branch;
    if (vehicle) baseQuery.vehicleId = vehicle;
    if (type) baseQuery.type = type;
    if (priority) baseQuery.priority = priority;
    if (status) baseQuery.status = status;
    
    if (startDate && endDate) {
      baseQuery.scheduledDate = {
        [require('sequelize').Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      baseQuery.branchId = req.user.branchId;
    }
    
    const maintenances = await Maintenance.findAll({
      where: baseQuery,
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['licensePlate', 'brand', 'model'] },
        { model: Branch, as: 'branch', attributes: ['name'] },
        { model: User, as: 'assignedMechanic', attributes: ['firstName', 'lastName'] }
      ],
      order: [['scheduledDate', 'DESC']]
    });
    
    const exportData = maintenances.map(maintenance => ({
      'ID': maintenance.id,
      'Vehículo': `${maintenance.vehicle?.brand} ${maintenance.vehicle?.model} (${maintenance.vehicle?.licensePlate})`,
      'Tipo': maintenance.type,
      'Prioridad': maintenance.priority,
      'Estado': maintenance.status,
      'Fecha Programada': moment(maintenance.scheduledDate).format('DD/MM/YYYY'),
      'Fecha Completado': maintenance.completedDate ? moment(maintenance.completedDate).format('DD/MM/YYYY') : 'N/A',
      'Mecánico': maintenance.assignedMechanic ? `${maintenance.assignedMechanic.firstName} ${maintenance.assignedMechanic.lastName}` : 'N/A',
      'Costo Total': maintenance.totalCost || 0,
      'Sucursal': maintenance.branch?.name || 'N/A'
    }));
    
    if (format === 'csv') {
      generateCSVResponse(res, exportData, 'reporte-mantenimientos');
    } else if (format === 'pdf') {
      await generatePDFResponse(res, exportData, 'Reporte de Mantenimientos', 'reporte-mantenimientos');
    } else {
      res.status(400).json({ message: 'Formato no soportado' });
    }
    
  } catch (error) {
    console.error('Error exportando reporte de mantenimientos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/reports/costs/export
// @desc    Exportar reporte de costos
// @access  Private
router.get('/costs/export', [
  auth,
  checkPermission('reports', 'export'),
  logActivity('Exportar reporte de costos')
], async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate, branch, vehicle, groupBy = 'month' } = req.query;
    const companyId = req.user.companyId;
    
    const dateFrom = startDate ? new Date(startDate) : moment().subtract(12, 'months').startOf('month').toDate();
    const dateTo = endDate ? new Date(endDate) : moment().endOf('month').toDate();
    
    const baseQuery = {
      companyId,
      completedDate: {
        [require('sequelize').Op.between]: [dateFrom, dateTo]
      },
      status: 'completado'
    };
    
    if (branch) baseQuery.branchId = branch;
    if (vehicle) baseQuery.vehicleId = vehicle;
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      baseQuery.branchId = req.user.branchId;
    }
    
    const maintenances = await Maintenance.findAll({
      where: baseQuery,
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['licensePlate', 'brand', 'model'] },
        { model: Branch, as: 'branch', attributes: ['name'] }
      ],
      order: [['completedDate', 'DESC']]
    });
    
    const exportData = maintenances.map(maintenance => ({
      'Fecha': moment(maintenance.completedDate).format('DD/MM/YYYY'),
      'Vehículo': `${maintenance.vehicle?.brand} ${maintenance.vehicle?.model} (${maintenance.vehicle?.licensePlate})`,
      'Tipo Mantenimiento': maintenance.type,
      'Descripción': maintenance.description,
      'Costo Mano de Obra': maintenance.laborCost || 0,
      'Costo Repuestos': maintenance.partsCost || 0,
      'Costo Total': maintenance.totalCost || 0,
      'Sucursal': maintenance.branch?.name || 'N/A'
    }));
    
    if (format === 'csv') {
      generateCSVResponse(res, exportData, 'reporte-costos');
    } else if (format === 'pdf') {
      await generatePDFResponse(res, exportData, 'Reporte de Costos', 'reporte-costos');
    } else {
      res.status(400).json({ message: 'Formato no soportado' });
    }
    
  } catch (error) {
    console.error('Error exportando reporte de costos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/reports/performance/export
// @desc    Exportar reporte de rendimiento
// @access  Private
router.get('/performance/export', [
  auth,
  checkPermission('reports', 'export'),
  logActivity('Exportar reporte de rendimiento')
], async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate, branch, mechanic, groupBy = 'month' } = req.query;
    const companyId = req.user.companyId;
    
    const dateFrom = startDate ? new Date(startDate) : moment().subtract(6, 'months').startOf('month').toDate();
    const dateTo = endDate ? new Date(endDate) : moment().endOf('month').toDate();
    
    const baseQuery = {
      companyId,
      completedDate: {
        [require('sequelize').Op.between]: [dateFrom, dateTo]
      },
      status: 'completado'
    };
    
    if (branch) baseQuery.branchId = branch;
    if (mechanic) baseQuery.assignedMechanicId = mechanic;
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      baseQuery.branchId = req.user.branchId;
    }
    
    const maintenances = await Maintenance.findAll({
      where: baseQuery,
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['licensePlate', 'brand', 'model'] },
        { model: Branch, as: 'branch', attributes: ['name'] },
        { model: User, as: 'assignedMechanic', attributes: ['firstName', 'lastName'] }
      ],
      order: [['completedDate', 'DESC']]
    });
    
    const exportData = maintenances.map(maintenance => {
      const duration = maintenance.completedDate && maintenance.scheduledDate 
        ? moment(maintenance.completedDate).diff(moment(maintenance.scheduledDate), 'days')
        : 0;
      
      return {
        'Fecha Completado': moment(maintenance.completedDate).format('DD/MM/YYYY'),
        'Vehículo': `${maintenance.vehicle?.brand} ${maintenance.vehicle?.model} (${maintenance.vehicle?.licensePlate})`,
        'Tipo': maintenance.type,
        'Mecánico': maintenance.assignedMechanic ? `${maintenance.assignedMechanic.firstName} ${maintenance.assignedMechanic.lastName}` : 'N/A',
        'Duración (días)': duration,
        'Costo Total': maintenance.totalCost || 0,
        'Eficiencia': duration <= 3 ? 'Alta' : duration <= 7 ? 'Media' : 'Baja',
        'Sucursal': maintenance.branch?.name || 'N/A'
      };
    });
    
    if (format === 'csv') {
      generateCSVResponse(res, exportData, 'reporte-rendimiento');
    } else if (format === 'pdf') {
      await generatePDFResponse(res, exportData, 'Reporte de Rendimiento', 'reporte-rendimiento');
    } else {
      res.status(400).json({ message: 'Formato no soportado' });
    }
    
  } catch (error) {
    console.error('Error exportando reporte de rendimiento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Funciones auxiliares

async function getVehicleStats(baseQuery) {
  const [total, active, byStatus, byType, byCondition] = await Promise.all([
    Vehicle.count({ where: baseQuery }),
    Vehicle.count({ where: { ...baseQuery, status: 'activo' } }),
    getGroupedStats(baseQuery, 'status', Vehicle),
    getGroupedStats(baseQuery, 'vehicleType', Vehicle),
    getGroupedStats(baseQuery, 'condition', Vehicle)
  ]);

  return {
    total,
    active,
    inactive: total - active,
    byStatus,
    byType,
    byCondition
  };
}

async function getMaintenanceStats(baseQuery, dateFrom, dateTo) {
  const { Op } = require('sequelize');
  const maintenanceQuery = {
    ...baseQuery,
    scheduledDate: { [Op.between]: [dateFrom, dateTo] }
  };

  const [total, completed, inProgress, scheduled, overdue] = await Promise.all([
    Maintenance.count({ where: maintenanceQuery }),
    Maintenance.count({ where: { ...maintenanceQuery, status: 'completado' } }),
    Maintenance.count({ where: { ...maintenanceQuery, status: 'en_proceso' } }),
    Maintenance.count({ where: { ...maintenanceQuery, status: 'programado' } }),
    Maintenance.count({ 
      where: {
        ...baseQuery, 
        status: 'programado',
        scheduledDate: { [Op.lt]: new Date() }
      }
    })
  ]);

  return {
    total,
    completed,
    inProgress,
    scheduled,
    overdue
  };
}

async function getRecentMaintenances(baseQuery, limit) {
  return await Maintenance.findAll({
    where: baseQuery,
    include: [
      { model: Vehicle, as: 'vehicle', attributes: ['plateNumber', 'make', 'model'] },
      { model: Branch, as: 'branch', attributes: ['name'] },
      { model: User, as: 'assignedTo', attributes: ['firstName', 'lastName'] }
    ],
    order: [['createdAt', 'DESC']],
    limit: limit
  });
}

async function getUpcomingMaintenances(baseQuery, limit) {
  const { Op } = require('sequelize');
  return await Maintenance.findAll({
    where: {
      ...baseQuery,
      status: 'programado',
      scheduledDate: { [Op.gte]: new Date() }
    },
    include: [
      { model: Vehicle, as: 'vehicle', attributes: ['plateNumber', 'make', 'model'] },
      { model: Branch, as: 'branch', attributes: ['name'] },
      { model: User, as: 'assignedTo', attributes: ['firstName', 'lastName'] }
    ],
    order: [['scheduledDate', 'ASC']],
    limit: limit
  });
}

async function getMaintenanceAlerts(baseQuery) {
  const { Op } = require('sequelize');
  
  const overdue = await Maintenance.count({
    where: {
      ...baseQuery,
      status: 'programado',
      scheduledDate: { [Op.lt]: new Date() }
    }
  });

  const dueToday = await Maintenance.count({
    where: {
      ...baseQuery,
      status: 'programado',
      scheduledDate: {
        [Op.between]: [
          moment().startOf('day').toDate(),
          moment().endOf('day').toDate()
        ]
      }
    }
  });

  const dueTomorrow = await Maintenance.count({
    where: {
      ...baseQuery,
      status: 'programado',
      scheduledDate: {
        [Op.between]: [
          moment().add(1, 'day').startOf('day').toDate(),
          moment().add(1, 'day').endOf('day').toDate()
        ]
      }
    }
  });

  return {
    overdue,
    dueToday,
    dueTomorrow
  };
}

async function getGroupedStats(query, field, Model) {
  return await Model.findAll({
    attributes: [
      [Model.sequelize.col(field), '_id'],
      [Model.sequelize.fn('COUNT', '*'), 'count']
    ],
    where: query,
    group: [field],
    order: [[Model.sequelize.literal('count'), 'DESC']],
    raw: true
  });
}

async function getAverageDuration(query) {
  // Convertir query de MongoDB a condiciones de Sequelize
  const whereConditions = { ...query, status: 'completado' };
  
  const result = await Maintenance.findOne({
    attributes: [
      [Maintenance.sequelize.fn('AVG', Maintenance.sequelize.col('duration')), 'avgDuration']
    ],
    where: whereConditions,
    raw: true
  });
  return parseFloat(result?.avgDuration) || 0;
}

function getGroupFormat(groupBy) {
  switch (groupBy) {
    case 'day':
      return { $dateToString: { format: '%Y-%m-%d', date: '$completedDate' } };
    case 'week':
      return { $dateToString: { format: '%Y-W%U', date: '$completedDate' } };
    case 'month':
      return { $dateToString: { format: '%Y-%m', date: '$completedDate' } };
    case 'year':
      return { $dateToString: { format: '%Y', date: '$completedDate' } };
    default:
      return { $dateToString: { format: '%Y-%m', date: '$completedDate' } };
  }
}

function getSequelizeGroupFormat(groupBy) {
  switch (groupBy) {
    case 'day':
      return Maintenance.sequelize.fn('DATE', Maintenance.sequelize.col('completedDate'));
    case 'week':
      return Maintenance.sequelize.fn('DATE_TRUNC', 'week', Maintenance.sequelize.col('completedDate'));
    case 'month':
      return Maintenance.sequelize.fn('DATE_TRUNC', 'month', Maintenance.sequelize.col('completedDate'));
    case 'year':
      return Maintenance.sequelize.fn('DATE_TRUNC', 'year', Maintenance.sequelize.col('completedDate'));
    default:
      return Maintenance.sequelize.fn('DATE_TRUNC', 'month', Maintenance.sequelize.col('completedDate'));
  }
}

function generateCSVResponse(res, data, filename) {
  // Implementación básica de CSV
  const csv = convertToCSV(data);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}_${moment().format('YYYY-MM-DD')}.csv`);
  res.send(csv);
}

function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
}

async function generatePDFResponse(res, data, title, filename) {
  try {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}_${moment().format('YYYY-MM-DD')}.pdf`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add title
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();
    
    // Add generation date
    doc.fontSize(12).text(`Generado el: ${moment().format('DD/MM/YYYY HH:mm')}`, { align: 'right' });
    doc.moveDown();
    
    if (data && data.length > 0) {
      const headers = Object.keys(data[0]);
      const columnWidth = (doc.page.width - 100) / headers.length;
      
      // Add table headers
      let yPosition = doc.y;
      doc.fontSize(10).fillColor('black');
      
      headers.forEach((header, index) => {
        doc.text(header, 50 + (index * columnWidth), yPosition, {
          width: columnWidth,
          align: 'left'
        });
      });
      
      doc.moveDown();
      
      // Add table rows
      data.forEach((row, rowIndex) => {
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
        }
        
        yPosition = doc.y;
        headers.forEach((header, index) => {
          const value = row[header] || '';
          doc.text(String(value), 50 + (index * columnWidth), yPosition, {
            width: columnWidth,
            align: 'left'
          });
        });
        
        doc.moveDown(0.5);
      });
    } else {
      doc.text('No hay datos para mostrar', { align: 'center' });
    }
    
    // Finalize the PDF
    doc.end();
    
  } catch (error) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ message: 'Error generando PDF' });
  }
}

async function getUserStats(baseQuery, user) {
  let userQuery = {};
  
  // Filtrar usuarios según el rol
  if (user.role === 'super_admin') {
    // Super admin puede ver todos los usuarios
  } else if (user.role === 'company_admin') {
    userQuery.companyId = user.companyId;
  } else {
    userQuery.branchId = user.branchId;
  }
  
  const total = await User.count({ where: userQuery });
  
  return { total };
}

async function getCompanyStats(user) {
  if (user.role !== 'super_admin') {
    return null;
  }
  
  const total = await Company.count();
  
  return { total };
}

async function getBranchStats(baseQuery, user) {
  if (!['super_admin', 'company_admin'].includes(user.role)) {
    return null;
  }
  
  let branchQuery = {};
  
  if (user.role === 'company_admin') {
    branchQuery.companyId = user.companyId;
  }
  
  const total = await Branch.count({ where: branchQuery });
  
  return { total };
}

async function getMaintenanceChart(baseQuery) {
  try {
    const last30Days = moment().subtract(30, 'days').startOf('day');
    const maintenances = await Maintenance.findAll({
      where: {
        ...baseQuery,
        createdAt: {
          [require('sequelize').Op.gte]: last30Days.toDate()
        }
      },
      attributes: [
        [require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'date'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: [require('sequelize').fn('DATE', require('sequelize').col('createdAt'))],
      order: [[require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'ASC']]
    });

    // Crear array con todos los días de los últimos 30 días
    const chartData = [];
    for (let i = 29; i >= 0; i--) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      const maintenance = maintenances.find(m => m.dataValues.date === date);
      chartData.push({
        name: moment(date).format('DD/MM'),
        mantenimientos: maintenance ? parseInt(maintenance.dataValues.count) : 0
      });
    }

    return chartData;
  } catch (error) {
    console.error('Error obteniendo datos del gráfico de mantenimiento:', error);
    return [];
  }
}

async function getVehicleDistribution(baseQuery) {
  try {
    const [total, active, inMaintenance] = await Promise.all([
      Vehicle.count({ where: baseQuery }),
      Vehicle.count({ where: { ...baseQuery, status: 'activo' } }),
      Maintenance.count({ 
        where: { 
          ...baseQuery,
          status: 'en_proceso' 
        } 
      })
    ]);

    const outOfService = total - active - inMaintenance;

    return [
      { name: 'Operativo', value: active },
      { name: 'Mantenimiento', value: inMaintenance },
      { name: 'Fuera de Servicio', value: outOfService > 0 ? outOfService : 0 },
      { name: 'Reserva', value: 0 }
    ];
  } catch (error) {
    console.error('Error obteniendo distribución de vehículos:', error);
    return [];
  }
}

async function getFuelStats(baseQuery, dateFrom, dateTo) {
  try {
    const { Op } = require('sequelize');
    
    // Construir query para registros de combustible
    const fuelQuery = {
      companyId: baseQuery.companyId,
      fuelDate: { [Op.between]: [dateFrom, dateTo] }
    };
    
    if (baseQuery.branchId) {
      // Obtener vehículos de la sucursal
      const vehicles = await Vehicle.findAll({
        where: { branchId: baseQuery.branchId },
        attributes: ['id']
      });
      const vehicleIds = vehicles.map(v => v.id);
      fuelQuery.vehicleId = { [Op.in]: vehicleIds };
    }
    
    const [totalRecords, totalLiters, totalCost, avgPrice] = await Promise.all([
      FuelRecord.count({ where: fuelQuery }),
      FuelRecord.sum('liters', { where: fuelQuery }) || 0,
      FuelRecord.sum('totalCost', { where: fuelQuery }) || 0,
      FuelRecord.findOne({
        attributes: [[FuelRecord.sequelize.fn('AVG', FuelRecord.sequelize.col('pricePerLiter')), 'avgPrice']],
        where: fuelQuery,
        raw: true
      })
    ]);
    
    return {
      totalRecords,
      totalLiters: parseFloat(totalLiters) || 0,
      totalCost: parseFloat(totalCost) || 0,
      averagePrice: parseFloat(avgPrice?.avgPrice) || 0
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas de combustible:', error);
    return {
      totalRecords: 0,
      totalLiters: 0,
      totalCost: 0,
      averagePrice: 0
    };
  }
}

module.exports = router;