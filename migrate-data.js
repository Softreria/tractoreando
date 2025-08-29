const mongoose = require('mongoose');
const { sequelize } = require('./config/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDB Models (Mongoose)
const MongoUser = require('./models/User');
const MongoCompany = require('./models/Company');
const MongoBranch = require('./models/Branch');
const MongoVehicle = require('./models/Vehicle');
const MongoMaintenance = require('./models/Maintenance');

// PostgreSQL Models (Sequelize)
const { User, Company, Branch, Vehicle, Maintenance } = require('./models');

class DataMigrator {
  constructor() {
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando';
    this.migrationStats = {
      companies: { total: 0, migrated: 0, errors: 0 },
      users: { total: 0, migrated: 0, errors: 0 },
      branches: { total: 0, migrated: 0, errors: 0 },
      vehicles: { total: 0, migrated: 0, errors: 0 },
      maintenance: { total: 0, migrated: 0, errors: 0 }
    };
  }

  async connectDatabases() {
    try {
      console.log('🔗 Conectando a MongoDB...');
      await mongoose.connect(this.mongoUri);
      console.log('✅ Conectado a MongoDB');

      console.log('🔗 Conectando a PostgreSQL...');
      await sequelize.authenticate();
      console.log('✅ Conectado a PostgreSQL');

      // Sincronizar modelos de PostgreSQL
      await sequelize.sync({ force: false });
      console.log('✅ Modelos de PostgreSQL sincronizados');
    } catch (error) {
      console.error('❌ Error conectando a las bases de datos:', error);
      throw error;
    }
  }

  async migrateCompanies() {
    console.log('\n🏢 Migrando empresas...');
    try {
      const mongoCompanies = await MongoCompany.find({});
      this.migrationStats.companies.total = mongoCompanies.length;
      console.log(`📊 Total de empresas a migrar: ${mongoCompanies.length}`);

      for (const mongoCompany of mongoCompanies) {
        try {
          // Verificar si ya existe
          const existingCompany = await Company.findOne({
            where: { cif: mongoCompany.cif }
          });

          if (existingCompany) {
            console.log(`⚠️  Empresa ${mongoCompany.name} ya existe, omitiendo...`);
            continue;
          }

          const companyData = {
            name: mongoCompany.name,
            cif: mongoCompany.cif,
            address: mongoCompany.address,
            contact: mongoCompany.contact,
            administrator: mongoCompany.administrator,
            subscription: mongoCompany.subscription,
            settings: mongoCompany.settings,
            isActive: mongoCompany.isActive,
            createdAt: mongoCompany.createdAt,
            updatedAt: mongoCompany.updatedAt
          };

          const newCompany = await Company.create(companyData);
          
          // Guardar mapeo de IDs para referencias posteriores
          this.companyIdMap = this.companyIdMap || new Map();
          this.companyIdMap.set(mongoCompany._id.toString(), newCompany.id);
          
          this.migrationStats.companies.migrated++;
          console.log(`✅ Empresa migrada: ${mongoCompany.name}`);
        } catch (error) {
          this.migrationStats.companies.errors++;
          console.error(`❌ Error migrando empresa ${mongoCompany.name}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Error en migración de empresas:', error);
      throw error;
    }
  }

  async migrateBranches() {
    console.log('\n🏪 Migrando delegaciones...');
    try {
      const mongoBranches = await MongoBranch.find({});
      this.migrationStats.branches.total = mongoBranches.length;
      console.log(`📊 Total de delegaciones a migrar: ${mongoBranches.length}`);

      for (const mongoBranch of mongoBranches) {
        try {
          // Verificar si ya existe
          const existingBranch = await Branch.findOne({
            where: { code: mongoBranch.code }
          });

          if (existingBranch) {
            console.log(`⚠️  Delegación ${mongoBranch.name} ya existe, omitiendo...`);
            continue;
          }

          const companyId = this.companyIdMap?.get(mongoBranch.company?.toString());
          if (!companyId) {
            console.log(`⚠️  No se encontró empresa para delegación ${mongoBranch.name}, omitiendo...`);
            continue;
          }

          const branchData = {
            name: mongoBranch.name,
            type: mongoBranch.type,
            code: mongoBranch.code,
            companyId: companyId,
            address: mongoBranch.address,
            contact: mongoBranch.contact,
            operatingHours: mongoBranch.operatingHours,
            isActive: mongoBranch.isActive,
            createdAt: mongoBranch.createdAt,
            updatedAt: mongoBranch.updatedAt
          };

          const newBranch = await Branch.create(branchData);
          
          // Guardar mapeo de IDs
          this.branchIdMap = this.branchIdMap || new Map();
          this.branchIdMap.set(mongoBranch._id.toString(), newBranch.id);
          
          this.migrationStats.branches.migrated++;
          console.log(`✅ Delegación migrada: ${mongoBranch.name}`);
        } catch (error) {
          this.migrationStats.branches.errors++;
          console.error(`❌ Error migrando delegación ${mongoBranch.name}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Error en migración de delegaciones:', error);
      throw error;
    }
  }

  async migrateUsers() {
    console.log('\n👤 Migrando usuarios...');
    try {
      const mongoUsers = await MongoUser.find({});
      this.migrationStats.users.total = mongoUsers.length;
      console.log(`📊 Total de usuarios a migrar: ${mongoUsers.length}`);

      for (const mongoUser of mongoUsers) {
        try {
          // Verificar si ya existe
          const existingUser = await User.findOne({
            where: { email: mongoUser.email }
          });

          if (existingUser) {
            console.log(`⚠️  Usuario ${mongoUser.email} ya existe, omitiendo...`);
            continue;
          }

          const companyId = this.companyIdMap?.get(mongoUser.company?.toString());
          const branchId = this.branchIdMap?.get(mongoUser.branch?.toString());

          if (!companyId) {
            console.log(`⚠️  No se encontró empresa para usuario ${mongoUser.email}, omitiendo...`);
            continue;
          }

          const userData = {
            firstName: mongoUser.firstName,
            lastName: mongoUser.lastName,
            email: mongoUser.email,
            password: mongoUser.password, // Ya está hasheada
            role: mongoUser.role,
            companyId: companyId,
            branchId: branchId,
            permissions: mongoUser.permissions,
            profile: mongoUser.profile,
            preferences: mongoUser.preferences,
            isActive: mongoUser.isActive,
            emailVerified: mongoUser.emailVerified,
            lastLogin: mongoUser.lastLogin,
            createdAt: mongoUser.createdAt,
            updatedAt: mongoUser.updatedAt
          };

          const newUser = await User.create(userData);
          
          // Guardar mapeo de IDs
          this.userIdMap = this.userIdMap || new Map();
          this.userIdMap.set(mongoUser._id.toString(), newUser.id);
          
          this.migrationStats.users.migrated++;
          console.log(`✅ Usuario migrado: ${mongoUser.email}`);
        } catch (error) {
          this.migrationStats.users.errors++;
          console.error(`❌ Error migrando usuario ${mongoUser.email}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Error en migración de usuarios:', error);
      throw error;
    }
  }

  async migrateVehicles() {
    console.log('\n🚗 Migrando vehículos...');
    try {
      const mongoVehicles = await MongoVehicle.find({});
      this.migrationStats.vehicles.total = mongoVehicles.length;
      console.log(`📊 Total de vehículos a migrar: ${mongoVehicles.length}`);

      for (const mongoVehicle of mongoVehicles) {
        try {
          // Verificar si ya existe
          const existingVehicle = await Vehicle.findOne({
            where: { plateNumber: mongoVehicle.plateNumber }
          });

          if (existingVehicle) {
            console.log(`⚠️  Vehículo ${mongoVehicle.plateNumber} ya existe, omitiendo...`);
            continue;
          }

          const companyId = this.companyIdMap?.get(mongoVehicle.company?.toString());
          const branchId = this.branchIdMap?.get(mongoVehicle.branch?.toString());

          if (!companyId) {
            console.log(`⚠️  No se encontró empresa para vehículo ${mongoVehicle.plateNumber}, omitiendo...`);
            continue;
          }

          const vehicleData = {
            plateNumber: mongoVehicle.plateNumber,
            make: mongoVehicle.make,
            model: mongoVehicle.model,
            year: mongoVehicle.year,
            vin: mongoVehicle.vin,
            color: mongoVehicle.color,
            vehicleType: mongoVehicle.vehicleType,
            companyId: companyId,
            branchId: branchId,
            technicalSpecs: mongoVehicle.technicalSpecs,
            odometer: mongoVehicle.odometer,
            documents: mongoVehicle.documents,
            specifications: mongoVehicle.specifications,
            ownership: mongoVehicle.ownership,
            photos: mongoVehicle.photos,
            status: mongoVehicle.status,
            condition: mongoVehicle.condition,
            maintenanceSchedule: mongoVehicle.maintenanceSchedule,
            costs: mongoVehicle.costs,
            isActive: mongoVehicle.isActive,
            createdAt: mongoVehicle.createdAt,
            updatedAt: mongoVehicle.updatedAt
          };

          const newVehicle = await Vehicle.create(vehicleData);
          
          // Guardar mapeo de IDs
          this.vehicleIdMap = this.vehicleIdMap || new Map();
          this.vehicleIdMap.set(mongoVehicle._id.toString(), newVehicle.id);
          
          this.migrationStats.vehicles.migrated++;
          console.log(`✅ Vehículo migrado: ${mongoVehicle.plateNumber}`);
        } catch (error) {
          this.migrationStats.vehicles.errors++;
          console.error(`❌ Error migrando vehículo ${mongoVehicle.plateNumber}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Error en migración de vehículos:', error);
      throw error;
    }
  }

  async migrateMaintenance() {
    console.log('\n🔧 Migrando mantenimientos...');
    try {
      const mongoMaintenances = await MongoMaintenance.find({});
      this.migrationStats.maintenance.total = mongoMaintenances.length;
      console.log(`📊 Total de mantenimientos a migrar: ${mongoMaintenances.length}`);

      for (const mongoMaintenance of mongoMaintenances) {
        try {
          // Verificar si ya existe
          const existingMaintenance = await Maintenance.findOne({
            where: { workOrderNumber: mongoMaintenance.workOrderNumber }
          });

          if (existingMaintenance) {
            console.log(`⚠️  Mantenimiento ${mongoMaintenance.workOrderNumber} ya existe, omitiendo...`);
            continue;
          }

          const vehicleId = this.vehicleIdMap?.get(mongoMaintenance.vehicle?.toString());
          const companyId = this.companyIdMap?.get(mongoMaintenance.company?.toString());
          const branchId = this.branchIdMap?.get(mongoMaintenance.branch?.toString());

          if (!vehicleId || !companyId) {
            console.log(`⚠️  No se encontraron referencias para mantenimiento ${mongoMaintenance.workOrderNumber}, omitiendo...`);
            continue;
          }

          const maintenanceData = {
            vehicleId: vehicleId,
            companyId: companyId,
            branchId: branchId,
            workOrderNumber: mongoMaintenance.workOrderNumber,
            type: mongoMaintenance.type,
            priority: mongoMaintenance.priority,
            status: mongoMaintenance.status,
            scheduledDate: mongoMaintenance.scheduledDate,
            startDate: mongoMaintenance.startDate,
            completedDate: mongoMaintenance.completedDate,
            odometer: mongoMaintenance.odometer,
            description: mongoMaintenance.description,
            services: mongoMaintenance.services,
            parts: mongoMaintenance.parts,
            costs: mongoMaintenance.costs,
            costResponsibility: mongoMaintenance.costResponsibility,
            inspections: mongoMaintenance.inspections,
            photos: mongoMaintenance.photos,
            attachments: mongoMaintenance.attachments,
            approvals: mongoMaintenance.approvals,
            timeTracking: mongoMaintenance.timeTracking,
            quality: mongoMaintenance.quality,
            warranty: mongoMaintenance.warranty,
            nextMaintenance: mongoMaintenance.nextMaintenance,
            isActive: mongoMaintenance.isActive,
            createdAt: mongoMaintenance.createdAt,
            updatedAt: mongoMaintenance.updatedAt
          };

          await Maintenance.create(maintenanceData);
          
          this.migrationStats.maintenance.migrated++;
          console.log(`✅ Mantenimiento migrado: ${mongoMaintenance.workOrderNumber}`);
        } catch (error) {
          this.migrationStats.maintenance.errors++;
          console.error(`❌ Error migrando mantenimiento ${mongoMaintenance.workOrderNumber}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Error en migración de mantenimientos:', error);
      throw error;
    }
  }

  async updateReferences() {
    console.log('\n🔗 Actualizando referencias...');
    try {
      // Actualizar referencias de admin en empresas
      for (const [mongoCompanyId, pgCompanyId] of this.companyIdMap.entries()) {
        const mongoCompany = await MongoCompany.findById(mongoCompanyId);
        if (mongoCompany && mongoCompany.admin) {
          const adminId = this.userIdMap?.get(mongoCompany.admin.toString());
          if (adminId) {
            await Company.update(
              { adminId: adminId },
              { where: { id: pgCompanyId } }
            );
          }
        }
      }

      // Actualizar referencias de createdBy en delegaciones
      for (const [mongoBranchId, pgBranchId] of this.branchIdMap.entries()) {
        const mongoBranch = await MongoBranch.findById(mongoBranchId);
        if (mongoBranch && mongoBranch.createdBy) {
          const createdById = this.userIdMap?.get(mongoBranch.createdBy.toString());
          if (createdById) {
            await Branch.update(
              { createdById: createdById },
              { where: { id: pgBranchId } }
            );
          }
        }
      }

      console.log('✅ Referencias actualizadas');
    } catch (error) {
      console.error('❌ Error actualizando referencias:', error);
    }
  }

  printMigrationStats() {
    console.log('\n📊 RESUMEN DE MIGRACIÓN');
    console.log('========================');
    
    Object.entries(this.migrationStats).forEach(([entity, stats]) => {
      const successRate = stats.total > 0 ? ((stats.migrated / stats.total) * 100).toFixed(1) : '0';
      console.log(`${entity.toUpperCase()}:`);
      console.log(`  Total: ${stats.total}`);
      console.log(`  Migrados: ${stats.migrated}`);
      console.log(`  Errores: ${stats.errors}`);
      console.log(`  Éxito: ${successRate}%`);
      console.log('');
    });
  }

  async migrate() {
    try {
      console.log('🚀 Iniciando migración de datos de MongoDB a PostgreSQL...');
      
      await this.connectDatabases();
      
      // Migrar en orden de dependencias
      await this.migrateCompanies();
      await this.migrateBranches();
      await this.migrateUsers();
      await this.migrateVehicles();
      await this.migrateMaintenance();
      
      // Actualizar referencias
      await this.updateReferences();
      
      this.printMigrationStats();
      
      console.log('\n🎉 ¡Migración completada exitosamente!');
      
    } catch (error) {
      console.error('❌ Error durante la migración:', error);
      throw error;
    } finally {
      await mongoose.connection.close();
      await sequelize.close();
      console.log('\n🔌 Conexiones cerradas');
    }
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  const migrator = new DataMigrator();
  migrator.migrate()
    .then(() => {
      console.log('✅ Proceso de migración finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso de migración:', error);
      process.exit(1);
    });
}

module.exports = DataMigrator;