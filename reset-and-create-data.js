const { sequelize } = require('./config/database');
const { Company, Branch, User, Vehicle, FuelRecord } = require('./models');
const bcrypt = require('bcrypt');

async function resetAndCreateData() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa');

    // Eliminar datos existentes en orden correcto (respetando foreign keys)
    console.log('🗑️ Eliminando datos existentes...');
    await FuelRecord.destroy({ where: {}, force: true });
    await Vehicle.destroy({ where: {}, force: true });
    
    // Desactivar temporalmente las foreign key constraints para eliminar usuarios y branches
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true }).catch(() => {});
    await sequelize.query('SET session_replication_role = replica', { raw: true }).catch(() => {});
    
    await User.destroy({ where: {}, force: true });
    await Branch.destroy({ where: {}, force: true });
    await Company.destroy({ where: {}, force: true });
    
    // Reactivar foreign key constraints
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true }).catch(() => {});
    await sequelize.query('SET session_replication_role = DEFAULT', { raw: true }).catch(() => {});
    
    console.log('✅ Datos eliminados');

    // Crear empresa
    console.log('🏢 Creando empresa...');
    const company = await Company.create({
      name: 'Tractoreando S.L.',
      cif: 'B12345678',
      address: {
        street: 'Calle Principal 123',
        city: 'Madrid',
        state: 'Madrid',
        zipCode: '28001',
        country: 'España',
        additionalInfo: 'Edificio Principal, Planta 3'
      },
      contact: {
        phone: '+34 912 345 678',
        email: 'info@tractoreando.com',
        website: 'https://www.tractoreando.com'
      },
      settings: {
        currency: 'EUR',
        timezone: 'Europe/Madrid',
        maintenanceReminders: true,
        emailNotifications: true,
        subscription: {
          plan: 'premium',
          maxUsers: 50,
          maxVehicles: 100,
          maxBranches: 10,
          features: ['advanced_maintenance', 'advanced_reports', 'fuel_management'],
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          isActive: true
        }
      },
      administrator: {
        firstName: 'Admin',
        lastName: 'Principal',
        email: 'admin@tractoreando.com',
        phone: '+34 912 345 678',
        canManageUsers: true,
        userId: null
      },
      isActive: true
    });

    // Crear usuario administrador primero
    console.log('👤 Creando usuario administrador...');
    const hashedAdminPassword = await bcrypt.hash('admin123456', 10);
    
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'Principal',
      email: 'admin@tractoreando.com',
      password: hashedAdminPassword,
      phone: '+34 912 345 678',
      companyId: company.id,
      vehicleTypeAccess: ['Tractor', 'Camión', 'Furgoneta'],
      role: 'super_admin',
      permissions: {},
      preferences: {},
      isActive: true
    });

    // Crear delegaciones
    console.log('🏪 Creando delegaciones...');
    const branch1 = await Branch.create({
      name: 'Sede Central Madrid',
      type: 'delegacion',
      code: 'MAD001',
      companyId: company.id,
      address: {
        street: 'Calle Principal 123',
        city: 'Madrid',
        state: 'Madrid',
        zipCode: '28001',
        country: 'España',
        additionalInfo: 'Sede Central'
      },
      contact: {
        phone: '+34 912 345 678',
        email: 'madrid@tractoreando.com',
        manager: 'Juan Pérez'
      },
      operatingHours: {
        monday: { open: '08:00', close: '18:00', isOpen: true },
        tuesday: { open: '08:00', close: '18:00', isOpen: true },
        wednesday: { open: '08:00', close: '18:00', isOpen: true },
        thursday: { open: '08:00', close: '18:00', isOpen: true },
        friday: { open: '08:00', close: '18:00', isOpen: true },
        saturday: { open: '09:00', close: '14:00', isOpen: true },
        sunday: { open: null, close: null, isOpen: false }
      },
      createdById: adminUser.id,
      isActive: true
    });

    const branch2 = await Branch.create({
      name: 'Delegación Barcelona',
      type: 'delegacion',
      code: 'BCN001',
      companyId: company.id,
      address: {
        street: 'Avenida Diagonal 456',
        city: 'Barcelona',
        state: 'Cataluña',
        zipCode: '08006',
        country: 'España',
        additionalInfo: 'Oficina 2B'
      },
      contact: {
        phone: '+34 934 567 890',
        email: 'barcelona@tractoreando.com',
        manager: 'María García'
      },
      operatingHours: {
        monday: { open: '08:30', close: '17:30', isOpen: true },
        tuesday: { open: '08:30', close: '17:30', isOpen: true },
        wednesday: { open: '08:30', close: '17:30', isOpen: true },
        thursday: { open: '08:30', close: '17:30', isOpen: true },
        friday: { open: '08:30', close: '17:30', isOpen: true },
        saturday: { open: null, close: null, isOpen: false },
        sunday: { open: null, close: null, isOpen: false }
      },
      createdById: adminUser.id,
      isActive: true
    });

    // Crear usuarios adicionales
    console.log('👤 Creando usuarios adicionales...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const user1 = await User.create({
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan.perez@tractoreando.com',
      password: hashedPassword,
      phone: '+34 612 345 678',
      companyId: company.id,
      branchId: branch1.id,
      vehicleTypeAccess: ['Tractor', 'Camión'],
      role: 'operator',
      permissions: {},
      preferences: {},
      createdById: adminUser.id,
      isActive: true
    });

    const user2 = await User.create({
      firstName: 'María',
      lastName: 'García',
      email: 'maria.garcia@tractoreando.com',
      password: hashedPassword,
      phone: '+34 623 456 789',
      companyId: company.id,
      branchId: branch2.id,
      vehicleTypeAccess: ['Furgoneta', 'Camión'],
      role: 'branch_manager',
      permissions: {},
      preferences: {},
      createdById: adminUser.id,
      isActive: true
    });

    // Crear vehículos
    console.log('🚜 Creando vehículos...');
    const vehicle1 = await Vehicle.create({
      plateNumber: 'M-1234-AB',
      make: 'John Deere',
      model: '6120M',
      vehicleType: 'Tractor',
      year: 2020,
      companyId: company.id,
      branchId: branch1.id,
      engine: {
        type: 'diesel',
        displacement: '4.5L',
        cylinders: 4,
        horsepower: 120,
        torque: '520 Nm'
      },
      transmission: 'manual',
      fuelCapacity: 180,
      odometer: {
        current: 1250,
        lastUpdate: new Date(),
        unit: 'km'
      },
      status: 'activo',
      condition: 'bueno',
      createdById: adminUser.id,
      isActive: true
    });

    const vehicle2 = await Vehicle.create({
      plateNumber: 'B-5678-CD',
      make: 'Mercedes',
      model: 'Sprinter 316',
      vehicleType: 'Furgoneta',
      year: 2019,
      companyId: company.id,
      branchId: branch2.id,
      engine: {
        type: 'diesel',
        displacement: '2.1L',
        cylinders: 4,
        horsepower: 163,
        torque: '360 Nm'
      },
      transmission: 'manual',
      fuelCapacity: 75,
      odometer: {
        current: 45000,
        lastUpdate: new Date(),
        unit: 'km'
      },
      status: 'activo',
      condition: 'bueno',
      createdById: adminUser.id,
      isActive: true
    });

    const vehicle3 = await Vehicle.create({
      plateNumber: 'M-9876-EF',
      make: 'Iveco',
      model: 'Daily 35S14',
      vehicleType: 'Camión',
      year: 2021,
      companyId: company.id,
      branchId: branch1.id,
      engine: {
        type: 'diesel',
        displacement: '2.3L',
        cylinders: 4,
        horsepower: 136,
        torque: '320 Nm'
      },
      transmission: 'manual',
      fuelCapacity: 90,
      odometer: {
        current: 28000,
        lastUpdate: new Date(),
        unit: 'km'
      },
      status: 'activo',
      condition: 'bueno',
      createdById: adminUser.id,
      isActive: true
    });

    // Crear registros de combustible
    console.log('⛽ Creando registros de combustible...');
    const fuelRecords = [
      {
        vehicleId: vehicle1.id,
        fuelDate: new Date('2024-01-15'),
        liters: 120,
        pricePerLiter: 1.45,
        totalCost: 174.00,
        odometer: 1200,
        fuelType: 'diesel',
        location: 'Estación Madrid Centro',
        notes: 'Tanque lleno',
        isFull: true
      },
      {
        vehicleId: vehicle1.id,
        fuelDate: new Date('2024-02-01'),
        liters: 95,
        pricePerLiter: 1.42,
        totalCost: 134.90,
        odometer: 1250,
        fuelType: 'diesel',
        location: 'Estación Madrid Norte',
        notes: 'Repostaje parcial',
        isFull: false
      },
      {
        vehicleId: vehicle2.id,
        fuelDate: new Date('2024-01-20'),
        liters: 60,
        pricePerLiter: 1.48,
        totalCost: 88.80,
        odometer: 44800,
        fuelType: 'diesel',
        location: 'Estación Barcelona Sur',
        notes: 'Tanque lleno',
        isFull: true
      },
      {
        vehicleId: vehicle3.id,
        fuelDate: new Date('2024-02-05'),
        liters: 75,
        pricePerLiter: 1.46,
        totalCost: 109.50,
        odometer: 27800,
        fuelType: 'diesel',
        location: 'Estación Madrid Este',
        notes: 'Repostaje completo',
        isFull: true
      }
    ];

    for (const record of fuelRecords) {
      await FuelRecord.create({
        ...record,
        companyId: company.id,
        createdById: adminUser.id
      });
    }

    console.log('✅ Datos de ejemplo creados exitosamente!');
    console.log('\n📊 Resumen de datos creados:');
    console.log(`- 1 empresa: ${company.name}`);
    console.log(`- 2 delegaciones: ${branch1.name}, ${branch2.name}`);
    console.log(`- 3 usuarios: Admin, Juan Pérez, María García`);
    console.log(`- 3 vehículos: ${vehicle1.licensePlate}, ${vehicle2.licensePlate}, ${vehicle3.licensePlate}`);
    console.log(`- ${fuelRecords.length} registros de combustible`);
    console.log('\n🔑 Credenciales de acceso:');
    console.log('Email: admin@tractoreando.com');
    console.log('Contraseña: admin123456');
    console.log('\n⚠️ Recuerda cambiar la contraseña después del primer login');

  } catch (error) {
    console.error('❌ Error creando datos de ejemplo:', error);
  } finally {
    await sequelize.close();
  }
}

resetAndCreateData();