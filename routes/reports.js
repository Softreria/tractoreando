const express = require('express');
const { body, validationResult } = require('express-validator');
const Vehicle = require('../models/Vehicle');
const Maintenance = require('../models/Maintenance');
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
    const companyId = company || req.user.company._id;
    
    const dateFrom = moment().subtract(parseInt(period), 'days').startOf('day').toDate();
    const dateTo = moment().endOf('day').toDate();
    
    const baseQuery = { company: companyId };
    
    if (branch) {
      baseQuery.branch = branch;
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      baseQuery.branch = req.user.branch;
    }

    // Consultas paralelas para obtener estadísticas
    const [vehicleStats, maintenanceStats, recentMaintenances, upcomingMaintenances, alerts, userStats, companyStats, branchStats] = await Promise.all([
      getVehicleStats(baseQuery),
      getMaintenanceStats(baseQuery, dateFrom, dateTo),
      getRecentMaintenances(baseQuery, 5),
      getUpcomingMaintenances(baseQuery, 10),
      getMaintenanceAlerts(baseQuery),
      getUserStats(baseQuery, req.user),
      getCompanyStats(req.user),
      getBranchStats(baseQuery, req.user)
    ]);

    res.json({
      period: parseInt(period),
      dateRange: { from: dateFrom, to: dateTo },
      vehicles: vehicleStats,
      maintenance: maintenanceStats,
      recentMaintenances,
      upcomingMaintenances,
      alerts,
      users: userStats,
      companies: companyStats,
      branches: branchStats
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
    
    const companyId = company || req.user.company._id;
    const query = { company: companyId };
    
    if (branch) query.branch = branch;
    if (status) query.status = status;
    if (vehicleType) query.vehicleType = vehicleType;
    if (condition) query.condition = condition;
    if (yearFrom || yearTo) {
      query.year = {};
      if (yearFrom) query.year.$gte = parseInt(yearFrom);
      if (yearTo) query.year.$lte = parseInt(yearTo);
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      query.branch = req.user.branch;
    }

    const vehicles = await Vehicle.find(query)
      .populate('company', 'name')
      .populate('branch', 'name code')
      .populate('createdBy', 'name lastName')
      .sort({ createdAt: -1 });

    // Agregar estadísticas de mantenimiento para cada vehículo
    const vehiclesWithStats = await Promise.all(
      vehicles.map(async (vehicle) => {
        const [totalMaintenances, completedMaintenances, totalCost, lastMaintenance] = await Promise.all([
          Maintenance.countDocuments({ vehicle: vehicle._id }),
          Maintenance.countDocuments({ vehicle: vehicle._id, status: 'completado' }),
          Maintenance.aggregate([
            { $match: { vehicle: vehicle._id, status: 'completado' } },
            { $group: { _id: null, total: { $sum: '$costs.actual' } } }
          ]),
          Maintenance.findOne({ 
            vehicle: vehicle._id, 
            status: 'completado' 
          }).sort({ completedDate: -1 })
        ]);
        
        return {
          ...vehicle.toObject(),
          maintenanceStats: {
            total: totalMaintenances,
            completed: completedMaintenances,
            totalCost: totalCost[0]?.total || 0,
            lastMaintenance: lastMaintenance?.completedDate,
            needsOilChange: vehicle.needsOilChange(),
            needsInspection: vehicle.needsInspection()
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
    
    const companyId = company || req.user.company._id;
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
// @desc    Reporte de costos
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
    
    const companyId = company || req.user.company._id;
    const query = { 
      company: companyId,
      status: 'completado'
    };
    
    if (branch) query.branch = branch;
    if (vehicle) query.vehicle = vehicle;
    
    if (dateFrom || dateTo) {
      query.completedDate = {};
      if (dateFrom) query.completedDate.$gte = new Date(dateFrom);
      if (dateTo) query.completedDate.$lte = new Date(dateTo);
    }
    
    // Filtrar por sucursales del usuario si no es admin
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      query.branch = { $in: req.user.branches };
    }

    // Convertir query de MongoDB a condiciones de Sequelize
    const whereConditions = {};
    if (query.scheduledDate) {
      whereConditions.scheduledDate = query.scheduledDate;
    }
    if (query.status) {
      whereConditions.status = query.status;
    }
    if (query.vehicleId) {
      whereConditions.vehicleId = query.vehicleId;
    }
    if (query.branchId) {
      whereConditions.branchId = query.branchId;
    }

    // Agregación para costos por período usando Sequelize
    const groupFormat = getSequelizeGroupFormat(groupBy);
    const costsByPeriod = await Maintenance.findAll({
      attributes: [
        [groupFormat, '_id'],
        [Maintenance.sequelize.fn('SUM', Maintenance.sequelize.cast(Maintenance.sequelize.json('costs.actual'), 'DECIMAL')), 'totalCost'],
        [Maintenance.sequelize.fn('SUM', Maintenance.sequelize.cast(Maintenance.sequelize.json('costs.labor'), 'DECIMAL')), 'laborCost'],
        [Maintenance.sequelize.fn('SUM', Maintenance.sequelize.cast(Maintenance.sequelize.json('costs.parts'), 'DECIMAL')), 'partsCost'],
        [Maintenance.sequelize.fn('COUNT', '*'), 'count']
      ],
      where: whereConditions,
      group: [groupFormat],
      order: [[Maintenance.sequelize.literal('_id'), 'ASC']],
      raw: true
    });

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
      where: whereConditions,
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
      where: whereConditions,
      group: ['type'],
      order: [[Maintenance.sequelize.literal('totalCost'), 'DESC']],
      raw: true
    });

    // Estadísticas generales
    const totalStats = await Maintenance.findOne({
      attributes: [
        [Maintenance.sequelize.fn('SUM', Maintenance.sequelize.cast(Maintenance.sequelize.json('costs.actual'), 'DECIMAL')), 'totalCost'],
        [Maintenance.sequelize.fn('SUM', Maintenance.sequelize.cast(Maintenance.sequelize.json('costs.labor'), 'DECIMAL')), 'totalLaborCost'],
        [Maintenance.sequelize.fn('SUM', Maintenance.sequelize.cast(Maintenance.sequelize.json('costs.parts'), 'DECIMAL')), 'totalPartsCost'],
        [Maintenance.sequelize.fn('COUNT', '*'), 'count'],
        [Maintenance.sequelize.fn('AVG', Maintenance.sequelize.cast(Maintenance.sequelize.json('costs.actual'), 'DECIMAL')), 'avgCost']
      ],
      where: whereConditions,
      raw: true
    });

    const stats = totalStats || {
      totalCost: 0,
      totalLaborCost: 0,
      totalPartsCost: 0,
      count: 0,
      avgCost: 0
    };

    if (format === 'csv') {
      return generateCSVResponse(res, costsByPeriod, 'costs_report');
    }

    res.json({
      summary: stats,
      byPeriod: costsByPeriod,
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
    
    const companyId = company || req.user.company._id;
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

// Funciones auxiliares

async function getVehicleStats(baseQuery) {
  const [total, active, byStatus, byType, byCondition] = await Promise.all([
    Vehicle.countDocuments(baseQuery),
    Vehicle.countDocuments({ ...baseQuery, status: 'activo' }),
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
  const maintenanceQuery = {
    ...baseQuery,
    scheduledDate: { $gte: dateFrom, $lte: dateTo }
  };

  const [total, completed, inProgress, scheduled, overdue] = await Promise.all([
    Maintenance.countDocuments(maintenanceQuery),
    Maintenance.countDocuments({ ...maintenanceQuery, status: 'completado' }),
    Maintenance.countDocuments({ ...maintenanceQuery, status: 'en_proceso' }),
    Maintenance.countDocuments({ ...maintenanceQuery, status: 'programado' }),
    Maintenance.countDocuments({ 
      ...baseQuery, 
      status: 'programado',
      scheduledDate: { $lt: new Date() }
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
  return await Maintenance.find(baseQuery)
    .populate('vehicle', 'plateNumber make model')
    .populate('branch', 'name')
    .populate('assignedTo', 'name lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
}

async function getUpcomingMaintenances(baseQuery, limit) {
  return await Maintenance.find({
    ...baseQuery,
    status: 'programado',
    scheduledDate: { $gte: new Date() }
  })
    .populate('vehicle', 'plateNumber make model')
    .populate('branch', 'name')
    .populate('assignedTo', 'firstName lastName')
    .sort({ scheduledDate: 1 })
    .limit(limit);
}

async function getMaintenanceAlerts(baseQuery) {
  const overdue = await Maintenance.countDocuments({
    ...baseQuery,
    status: 'programado',
    scheduledDate: { $lt: new Date() }
  });

  const dueToday = await Maintenance.countDocuments({
    ...baseQuery,
    status: 'programado',
    scheduledDate: {
      $gte: moment().startOf('day').toDate(),
      $lte: moment().endOf('day').toDate()
    }
  });

  const dueTomorrow = await Maintenance.countDocuments({
    ...baseQuery,
    status: 'programado',
    scheduledDate: {
      $gte: moment().add(1, 'day').startOf('day').toDate(),
      $lte: moment().add(1, 'day').endOf('day').toDate()
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

async function getUserStats(baseQuery, user) {
  let userQuery = {};
  
  // Filtrar usuarios según el rol
  if (user.role === 'super_admin') {
    // Super admin puede ver todos los usuarios
  } else if (user.role === 'company_admin') {
    userQuery.company = user.company._id;
  } else {
    userQuery.branch = user.branch;
  }
  
  const total = await User.countDocuments(userQuery);
  
  return { total };
}

async function getCompanyStats(user) {
  if (user.role !== 'super_admin') {
    return null;
  }
  
  const total = await Company.countDocuments({});
  
  return { total };
}

async function getBranchStats(baseQuery, user) {
  if (!['super_admin', 'company_admin'].includes(user.role)) {
    return null;
  }
  
  let branchQuery = {};
  
  if (user.role === 'company_admin') {
    branchQuery.company = user.company._id;
  }
  
  const total = await Branch.countDocuments(branchQuery);
  
  return { total };
}

module.exports = router;