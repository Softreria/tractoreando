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

// Funciones auxiliares
async function getMaintenanceChart(baseQuery) {
  try {
    const { sequelize } = require('../models');
    
    const maintenanceChart = await Maintenance.findAll({
      attributes: [
        [sequelize.fn('DATE_TRUNC', 'day', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', '*'), 'count']
      ],
      where: baseQuery,
      group: [sequelize.fn('DATE_TRUNC', 'day', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE_TRUNC', 'day', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });
    
    return maintenanceChart;
  } catch (error) {
    console.error('Error en getMaintenanceChart:', error);
    return [];
  }
}

module.exports = router;