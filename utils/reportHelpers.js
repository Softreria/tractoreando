const { Vehicle, Maintenance, FuelRecord, User, Company, Branch } = require('../models');
const { Op } = require('sequelize');

// Función para obtener estadísticas de vehículos
async function getVehicleStats(baseQuery) {
  try {
    const [total, active, inactive, inMaintenance] = await Promise.all([
      Vehicle.count({ where: baseQuery }),
      Vehicle.count({ where: { ...baseQuery, isActive: true } }),
      Vehicle.count({ where: { ...baseQuery, isActive: false } }),
      Vehicle.count({ where: { ...baseQuery, status: 'en_mantenimiento' } })
    ]);

    return { total, active, inactive, inMaintenance };
  } catch (error) {
    console.error('Error en getVehicleStats:', error);
    return { total: 0, active: 0, inactive: 0, inMaintenance: 0 };
  }
}

// Función para obtener estadísticas de mantenimiento
async function getMaintenanceStats(baseQuery, dateFrom, dateTo) {
  try {
    const maintenanceQuery = { ...baseQuery };
    if (dateFrom && dateTo) {
      maintenanceQuery.scheduledDate = {
        [Op.between]: [dateFrom, dateTo]
      };
    }

    const [total, completed, pending, overdue] = await Promise.all([
      Maintenance.count({ where: maintenanceQuery }),
      Maintenance.count({ where: { ...maintenanceQuery, status: 'completado' } }),
      Maintenance.count({ where: { ...maintenanceQuery, status: 'programado' } }),
      Maintenance.count({ 
        where: { 
          ...maintenanceQuery, 
          status: 'programado',
          scheduledDate: { [Op.lt]: new Date() }
        } 
      })
    ]);

    return { total, completed, pending, overdue };
  } catch (error) {
    console.error('Error en getMaintenanceStats:', error);
    return { total: 0, completed: 0, pending: 0, overdue: 0 };
  }
}

// Función para obtener estadísticas de combustible
async function getFuelStats(baseQuery, dateFrom, dateTo) {
  try {
    // Obtener vehículos de la empresa/sucursal
    const vehicles = await Vehicle.findAll({
      where: baseQuery,
      attributes: ['id']
    });
    
    const vehicleIds = vehicles.map(v => v.id);
    
    if (vehicleIds.length === 0) {
      return { totalLiters: 0, totalCost: 0, averageConsumption: 0 };
    }

    const fuelQuery = { vehicleId: { [Op.in]: vehicleIds } };
    if (dateFrom && dateTo) {
      fuelQuery.fuelDate = {
        [Op.between]: [dateFrom, dateTo]
      };
    }

    const fuelStats = await FuelRecord.findOne({
      attributes: [
        [FuelRecord.sequelize.fn('SUM', FuelRecord.sequelize.col('liters')), 'totalLiters'],
        [FuelRecord.sequelize.fn('SUM', FuelRecord.sequelize.col('totalCost')), 'totalCost'],
        [FuelRecord.sequelize.fn('AVG', FuelRecord.sequelize.col('liters')), 'averageConsumption']
      ],
      where: fuelQuery,
      raw: true
    });

    return {
      totalLiters: parseFloat(fuelStats?.totalLiters) || 0,
      totalCost: parseFloat(fuelStats?.totalCost) || 0,
      averageConsumption: parseFloat(fuelStats?.averageConsumption) || 0
    };
  } catch (error) {
    console.error('Error en getFuelStats:', error);
    return { totalLiters: 0, totalCost: 0, averageConsumption: 0 };
  }
}

// Función para obtener mantenimientos recientes
async function getRecentMaintenances(baseQuery, limit = 5) {
  try {
    return await Maintenance.findAll({
      where: baseQuery,
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['plateNumber', 'make', 'model'] },
        { model: User, as: 'assignedTo', attributes: ['firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']],
      limit
    });
  } catch (error) {
    console.error('Error en getRecentMaintenances:', error);
    return [];
  }
}

// Función para obtener próximos mantenimientos
async function getUpcomingMaintenances(baseQuery, limit = 10) {
  try {
    return await Maintenance.findAll({
      where: {
        ...baseQuery,
        status: 'programado',
        scheduledDate: { [Op.gte]: new Date() }
      },
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['plateNumber', 'make', 'model'] },
        { model: User, as: 'assignedTo', attributes: ['firstName', 'lastName'] }
      ],
      order: [['scheduledDate', 'ASC']],
      limit
    });
  } catch (error) {
    console.error('Error en getUpcomingMaintenances:', error);
    return [];
  }
}

// Función para obtener alertas de mantenimiento
async function getMaintenanceAlerts(baseQuery) {
  try {
    const overdue = await Maintenance.findAll({
      where: {
        ...baseQuery,
        status: 'programado',
        scheduledDate: { [Op.lt]: new Date() }
      },
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['plateNumber', 'make', 'model'] }
      ],
      limit: 10
    });

    return overdue.map(maintenance => ({
      type: 'overdue',
      message: `Mantenimiento vencido para ${maintenance.vehicle?.plateNumber}`,
      vehicle: maintenance.vehicle,
      scheduledDate: maintenance.scheduledDate,
      priority: maintenance.priority
    }));
  } catch (error) {
    console.error('Error en getMaintenanceAlerts:', error);
    return [];
  }
}

// Función para obtener estadísticas de usuarios
async function getUserStats(baseQuery, user) {
  try {
    const userQuery = {};
    
    if (user.role === 'super_admin') {
      if (baseQuery.companyId) {
        userQuery.companyId = baseQuery.companyId;
      }
    } else {
      userQuery.companyId = user.companyId;
    }

    const [total, active] = await Promise.all([
      User.count({ where: userQuery }),
      User.count({ where: { ...userQuery, isActive: true } })
    ]);

    return { total, active };
  } catch (error) {
    console.error('Error en getUserStats:', error);
    return { total: 0, active: 0 };
  }
}

// Función para obtener estadísticas de empresas
async function getCompanyStats(user) {
  try {
    if (user.role === 'super_admin') {
      const total = await Company.count({ where: { isActive: true } });
      return { total };
    }
    return { total: 1 };
  } catch (error) {
    console.error('Error en getCompanyStats:', error);
    return { total: 0 };
  }
}

// Función para obtener estadísticas de sucursales
async function getBranchStats(baseQuery, user) {
  try {
    const branchQuery = {};
    
    if (user.role === 'super_admin') {
      if (baseQuery.companyId) {
        branchQuery.companyId = baseQuery.companyId;
      }
    } else {
      branchQuery.companyId = user.companyId;
    }

    const total = await Branch.count({ where: { ...branchQuery, isActive: true } });
    return { total };
  } catch (error) {
    console.error('Error en getBranchStats:', error);
    return { total: 0 };
  }
}

// Función para obtener gráfico de mantenimientos
async function getMaintenanceChart(baseQuery) {
  try {
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const count = await Maintenance.count({
        where: {
          ...baseQuery,
          createdAt: {
            [Op.between]: [monthStart, monthEnd]
          }
        }
      });

      last6Months.push({
        month: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
        count
      });
    }

    return last6Months;
  } catch (error) {
    console.error('Error en getMaintenanceChart:', error);
    return [];
  }
}

// Función para obtener distribución de vehículos
async function getVehicleDistribution(baseQuery) {
  try {
    const distribution = await Vehicle.findAll({
      attributes: [
        'vehicleType',
        [Vehicle.sequelize.fn('COUNT', '*'), 'count']
      ],
      where: baseQuery,
      group: ['vehicleType'],
      raw: true
    });

    return distribution.map(item => ({
      type: item.vehicleType,
      count: parseInt(item.count)
    }));
  } catch (error) {
    console.error('Error en getVehicleDistribution:', error);
    return [];
  }
}

// Función para generar respuesta CSV
function generateCSVResponse(res, data, filename) {
  try {
    if (!data || data.length === 0) {
      return res.status(400).json({ message: 'No hay datos para exportar' });
    }

    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csv += values.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error generando CSV:', error);
    res.status(500).json({ message: 'Error generando archivo CSV' });
  }
}

module.exports = {
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
};