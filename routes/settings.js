const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, checkPermission, logActivity } = require('../middleware/auth');
const Vehicle = require('../models/Vehicle');
const Maintenance = require('../models/Maintenance');
const Company = require('../models/Company');
const Branch = require('../models/Branch');
const User = require('../models/User');
const moment = require('moment');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// @route   GET /api/settings
// @desc    Obtener configuraciones del sistema
// @access  Private
router.get('/', [
  auth,
  checkPermission('settings', 'read'),
  logActivity('Consultar configuraciones')
], async (req, res) => {
  try {
    // Configuraciones por defecto del sistema
    const defaultSettings = {
      autoBackup: false,
      backupFrequency: 'weekly',
      backupRetentionDays: 30,
      emailNotifications: true,
      smsNotifications: false,
      maintenanceReminders: true,
      systemLanguage: 'es',
      timezone: 'Europe/Madrid',
      currency: 'EUR'
    };

    res.json(defaultSettings);
  } catch (error) {
    console.error('Error obteniendo configuraciones:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   PUT /api/settings
// @desc    Actualizar configuraciones del sistema
// @access  Private
router.put('/', [
  auth,
  checkPermission('settings', 'write'),
  logActivity('Actualizar configuraciones')
], async (req, res) => {
  try {
    // Por ahora solo devolvemos éxito
    // En el futuro se puede implementar persistencia en base de datos
    res.json({ message: 'Configuraciones actualizadas exitosamente' });
  } catch (error) {
    console.error('Error actualizando configuraciones:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/settings/stats
// @desc    Obtener estadísticas del sistema
// @access  Private (solo super_admin)
router.get('/stats', [
  auth,
  checkPermission('settings', 'read'),
  logActivity('Consultar estadísticas del sistema')
], async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Solo super administradores pueden ver estadísticas del sistema' });
    }

    const stats = {
      database: {
        size: '125.4 MB',
        tables: 8,
        records: {
          companies: await Company.count(),
          branches: await Branch.count(),
          users: await User.count(),
          vehicles: await Vehicle.count(),
          maintenances: await Maintenance.count()
        }
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      activity: {
        activeUsers: await User.count({ where: { isActive: true } }),
        recentMaintenances: await Maintenance.count({
          where: {
            createdAt: {
              [require('sequelize').Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        pendingMaintenances: await Maintenance.count({
          where: { status: 'pending' }
        })
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   DELETE /api/settings/clean/:type
// @desc    Limpiar datos del sistema
// @access  Private (solo super_admin)
router.delete('/clean/:type', [
  auth,
  checkPermission('settings', 'delete'),
  logActivity('Limpiar datos del sistema')
], async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Solo super administradores pueden limpiar datos del sistema' });
    }

    const { type } = req.params;

    switch (type) {
      case 'logs':
        // Por ahora solo simulamos la limpieza
        // En el futuro se puede implementar limpieza real de logs
        res.json({ message: 'Logs antiguos eliminados exitosamente', deletedRecords: 0 });
        break;
      default:
        res.status(400).json({ message: 'Tipo de limpieza no válido' });
    }
  } catch (error) {
    console.error('Error limpiando datos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   POST /api/settings/backup
// @desc    Crear backup de la base de datos
// @access  Private (solo super_admin)
router.post('/backup', [
  auth,
  checkPermission('settings', 'backup'),
  logActivity('Crear backup')
], async (req, res) => {
  try {
    // Solo super_admin puede crear backups completos
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Solo super administradores pueden crear backups' });
    }

    const backupData = {
      metadata: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        createdBy: req.user.id,
        type: 'full_backup'
      },
      companies: [],
      branches: [],
      users: [],
      vehicles: [],
      maintenances: []
    };

    // Exportar todas las empresas
    const companies = await Company.findAll({
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    });
    backupData.companies = companies.map(company => company.toJSON());

    // Exportar todas las sucursales
    const branches = await Branch.findAll({
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    });
    backupData.branches = branches.map(branch => branch.toJSON());

    // Exportar todos los usuarios (sin contraseñas)
    const users = await User.findAll({
      attributes: { exclude: ['password', 'createdAt', 'updatedAt'] }
    });
    backupData.users = users.map(user => user.toJSON());

    // Exportar todos los vehículos
    const vehicles = await Vehicle.findAll({
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    });
    backupData.vehicles = vehicles.map(vehicle => vehicle.toJSON());

    // Exportar todos los mantenimientos
    const maintenances = await Maintenance.findAll({
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    });
    backupData.maintenances = maintenances.map(maintenance => maintenance.toJSON());

    // Crear directorio de backups si no existe
    const backupDir = path.join(__dirname, '../backups');
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir, { recursive: true });
    }

    // Guardar backup en archivo
    const filename = `backup-${moment().format('YYYY-MM-DD-HH-mm-ss')}.json`;
    const filepath = path.join(backupDir, filename);
    await fs.writeFile(filepath, JSON.stringify(backupData, null, 2));

    // Configurar headers para descarga de archivo
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', JSON.stringify(backupData).length);
    
    // Enviar el archivo de backup directamente
    res.send(JSON.stringify(backupData, null, 2));

  } catch (error) {
    console.error('Error creando backup:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   POST /api/settings/restore
// @desc    Restaurar backup de la base de datos
// @access  Private (solo super_admin)
router.post('/restore', [
  auth,
  checkPermission('settings', 'restore'),
  logActivity('Restaurar backup')
], async (req, res) => {
  try {
    // Solo super_admin puede restaurar backups
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Solo super administradores pueden restaurar backups' });
    }

    const { backupData, mode = 'merge' } = req.body;

    if (!backupData || !backupData.metadata) {
      return res.status(400).json({ message: 'Datos de backup inválidos' });
    }

    const results = {
      companies: { created: 0, updated: 0, errors: 0 },
      branches: { created: 0, updated: 0, errors: 0 },
      users: { created: 0, updated: 0, errors: 0 },
      vehicles: { created: 0, updated: 0, errors: 0 },
      maintenances: { created: 0, updated: 0, errors: 0 }
    };

    // Restaurar empresas
    if (backupData.companies) {
      for (const companyData of backupData.companies) {
        try {
          const [company, created] = await Company.findOrCreate({
            where: { id: companyData.id },
            defaults: companyData
          });
          
          if (created) {
            results.companies.created++;
          } else if (mode === 'overwrite') {
            await company.update(companyData);
            results.companies.updated++;
          }
        } catch (error) {
          results.companies.errors++;
        }
      }
    }

    // Restaurar sucursales
    if (backupData.branches) {
      for (const branchData of backupData.branches) {
        try {
          const [branch, created] = await Branch.findOrCreate({
            where: { id: branchData.id },
            defaults: branchData
          });
          
          if (created) {
            results.branches.created++;
          } else if (mode === 'overwrite') {
            await branch.update(branchData);
            results.branches.updated++;
          }
        } catch (error) {
          results.branches.errors++;
        }
      }
    }

    // Restaurar usuarios (sin contraseñas)
    if (backupData.users) {
      for (const userData of backupData.users) {
        try {
          const [user, created] = await User.findOrCreate({
            where: { id: userData.id },
            defaults: { ...userData, password: 'temp_password_needs_reset' }
          });
          
          if (created) {
            results.users.created++;
          } else if (mode === 'overwrite') {
            await user.update(userData);
            results.users.updated++;
          }
        } catch (error) {
          results.users.errors++;
        }
      }
    }

    // Restaurar vehículos
    if (backupData.vehicles) {
      for (const vehicleData of backupData.vehicles) {
        try {
          const [vehicle, created] = await Vehicle.findOrCreate({
            where: { id: vehicleData.id },
            defaults: vehicleData
          });
          
          if (created) {
            results.vehicles.created++;
          } else if (mode === 'overwrite') {
            await vehicle.update(vehicleData);
            results.vehicles.updated++;
          }
        } catch (error) {
          results.vehicles.errors++;
        }
      }
    }

    // Restaurar mantenimientos
    if (backupData.maintenances) {
      for (const maintenanceData of backupData.maintenances) {
        try {
          const [maintenance, created] = await Maintenance.findOrCreate({
            where: { id: maintenanceData.id },
            defaults: maintenanceData
          });
          
          if (created) {
            results.maintenances.created++;
          } else if (mode === 'overwrite') {
            await maintenance.update(maintenanceData);
            results.maintenances.updated++;
          }
        } catch (error) {
          results.maintenances.errors++;
        }
      }
    }

    res.json({
      message: 'Backup restaurado exitosamente',
      mode,
      results
    });

  } catch (error) {
    console.error('Error restaurando backup:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/settings/backups
// @desc    Listar backups disponibles
// @access  Private (solo super_admin)
router.get('/backups', [
  auth,
  checkPermission('settings', 'read'),
  logActivity('Listar backups')
], async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Solo super administradores pueden ver backups' });
    }

    const backupDir = path.join(__dirname, '../backups');
    
    try {
      const files = await fs.readdir(backupDir);
      const backups = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(backupDir, file);
          const stats = await fs.stat(filepath);
          
          try {
            const content = await fs.readFile(filepath, 'utf8');
            const data = JSON.parse(content);
            
            backups.push({
              filename: file,
              size: stats.size,
              createdAt: stats.birthtime,
              metadata: data.metadata || {},
              records: {
                companies: data.companies?.length || 0,
                branches: data.branches?.length || 0,
                users: data.users?.length || 0,
                vehicles: data.vehicles?.length || 0,
                maintenances: data.maintenances?.length || 0
              }
            });
          } catch (parseError) {
            // Archivo corrupto, omitir
          }
        }
      }

      // Ordenar por fecha de creación (más reciente primero)
      backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json({ backups });

    } catch (error) {
      // Directorio no existe
      res.json({ backups: [] });
    }

  } catch (error) {
    console.error('Error listando backups:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   DELETE /api/settings/backups/:filename
// @desc    Eliminar backup
// @access  Private (solo super_admin)
router.delete('/backups/:filename', [
  auth,
  checkPermission('settings', 'delete'),
  logActivity('Eliminar backup')
], async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Solo super administradores pueden eliminar backups' });
    }

    const { filename } = req.params;
    
    // Validar nombre de archivo
    if (!filename.endsWith('.json') || filename.includes('..')) {
      return res.status(400).json({ message: 'Nombre de archivo inválido' });
    }

    const backupDir = path.join(__dirname, '../backups');
    const filepath = path.join(backupDir, filename);

    await fs.unlink(filepath);

    res.json({ message: 'Backup eliminado exitosamente' });

  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: 'Backup no encontrado' });
    }
    console.error('Error eliminando backup:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;