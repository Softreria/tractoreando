const { sequelize, Company, Branch, Vehicle, User, FuelRecord } = require('./models');
const bcrypt = require('bcryptjs');

async function createSampleData() {
  try {
    await sequelize.authenticate();
    console.log('🔌 Conectado a la base de datos');

    // Crear empresa de ejemplo
    console.log('🏢 Creando empresa de ejemplo...');
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
      vehicleTypeAccess: ['tractor', 'truck', 'van'],
      role: 'company_admin',
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
    console.log('👥 Creando usuarios adicionales...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const manager = await User.create({
      firstName: 'Carlos',
      lastName: 'García',
      email: 'carlos.garcia@tractoreando.com',
      password: hashedPassword,
      phone: '+34 612 345 678',
      companyId: company.id,
      branchId: branch1.id,
      vehicleTypeAccess: ['tractor', 'truck', 'van'],
      role: 'company_admin',
      permissions: {},
      preferences: {},
      createdById: adminUser.id,
      isActive: true
    });

    const operator = await User.create({
      firstName: 'María',
      lastName: 'López',
      email: 'maria.lopez@tractoreando.com',
      password: hashedPassword,
      phone: '+34 623 456 789',
      companyId: company.id,
      branchId: branch2.id,
      vehicleTypeAccess: ['tractor', 'van'],
      role: 'operator',
      permissions: {},
      preferences: {},
      createdById: adminUser.id,
      isActive: true
    });

    // Crear vehículos
    console.log('🚗 Creando vehículos...');
    const vehicle1 = await Vehicle.create({
      plateNumber: '1234ABC',
      make: 'John Deere',
      model: '6120M',
      vin: 'JD6120M123456789',
      companyId: company.id,
      branchId: branch1.id,
      year: 2020,
      color: 'Verde',
      vehicleType: 'tractor',
      engine: {
        type: 'Diesel',
        power: '120 HP',
        displacement: '4.5L'
      },
      transmission: 'Manual',
      fuelCapacity: 280,
      odometer: 1250,
      documents: {
        registration: 'REG123456',
        insurance: 'INS789012'
      },
      specifications: {
        weight: '5500 kg',
        dimensions: '4.2m x 2.1m x 2.8m'
      },
      ownership: {
        type: 'owned',
        purchaseDate: '2020-03-15'
      },
      status: 'active',
      condition: 'good',
      maintenanceSchedule: {
        nextService: '2024-06-15',
        serviceInterval: 250
      },
      costs: {
        purchase: 85000,
        maintenance: 2500
      },
      createdById: adminUser.id,
      isActive: true
    });

    const vehicle2 = await Vehicle.create({
      plateNumber: '5678DEF',
      make: 'Mercedes-Benz',
      model: 'Sprinter 316',
      vin: 'MB316SPR987654321',
      companyId: company.id,
      branchId: branch1.id,
      year: 2019,
      color: 'Blanco',
      vehicleType: 'van',
      engine: {
        type: 'Diesel',
        power: '163 HP',
        displacement: '2.1L'
      },
      transmission: 'Manual',
      fuelCapacity: 75,
      odometer: 45000,
      documents: {
        registration: 'REG654321',
        insurance: 'INS210987'
      },
      specifications: {
        weight: '3500 kg',
        dimensions: '5.9m x 2.0m x 2.6m'
      },
      ownership: {
        type: 'leased',
        leaseStart: '2019-01-01'
      },
      status: 'active',
      condition: 'excellent',
      maintenanceSchedule: {
        nextService: '2024-05-20',
        serviceInterval: 15000
      },
      costs: {
        lease: 450,
        maintenance: 800
      },
      createdById: adminUser.id,
      isActive: true
    });

    const vehicle3 = await Vehicle.create({
      plateNumber: '9012GHI',
      make: 'Case IH',
      model: 'Puma 185',
      vin: 'CASE185P456789123',
      companyId: company.id,
      branchId: branch2.id,
      year: 2021,
      color: 'Rojo',
      vehicleType: 'tractor',
      engine: {
        type: 'Diesel',
        power: '185 HP',
        displacement: '6.7L'
      },
      transmission: 'CVT',
      fuelCapacity: 320,
      odometer: 850,
      documents: {
        registration: 'REG987654',
        insurance: 'INS456123'
      },
      specifications: {
        weight: '6200 kg',
        dimensions: '4.5m x 2.3m x 3.0m'
      },
      ownership: {
        type: 'owned',
        purchaseDate: '2021-02-10'
      },
      status: 'active',
      condition: 'excellent',
      maintenanceSchedule: {
        nextService: '2024-07-01',
        serviceInterval: 200
      },
      costs: {
        purchase: 125000,
        maintenance: 1200
      },
      createdById: adminUser.id,
      isActive: true
    });

    // Crear registros de combustible
    console.log('⛽ Creando registros de combustible...');
    const fuelRecords = [
      {
        vehicleId: vehicle1.id,
        fuelDate: new Date('2024-01-15'),
        liters: 180,
        odometer: 1100,
        pricePerLiter: 1.35,
        totalCost: 243.00,
        fuelType: 'diesel',
        station: 'Repsol',
        location: 'Madrid Centro',
        isFull: true,
        notes: 'Repostaje completo',
        createdById: manager.id,
        companyId: company.id
      },
      {
        vehicleId: vehicle1.id,
        fuelDate: new Date('2024-02-10'),
        liters: 200,
        odometer: 1200,
        pricePerLiter: 1.38,
        totalCost: 276.00,
        fuelType: 'diesel',
        station: 'Cepsa',
        location: 'Madrid Sur',
        isFull: true,
        notes: 'Depósito lleno',
        createdById: manager.id,
        companyId: company.id
      },
      {
        vehicleId: vehicle2.id,
        fuelDate: new Date('2024-01-20'),
        liters: 65,
        odometer: 44500,
        pricePerLiter: 1.42,
        totalCost: 92.30,
        fuelType: 'diesel',
        station: 'BP',
        location: 'Madrid Norte',
        isFull: true,
        notes: 'Repostaje rutinario',
        createdById: manager.id,
        companyId: company.id
      },
      {
        vehicleId: vehicle2.id,
        fuelDate: new Date('2024-02-25'),
        liters: 70,
        odometer: 45000,
        pricePerLiter: 1.40,
        totalCost: 98.00,
        fuelType: 'diesel',
        station: 'Shell',
        location: 'Madrid Este',
        isFull: true,
        notes: 'Depósito completo',
        createdById: manager.id,
        companyId: company.id
      },
      {
        vehicleId: vehicle3.id,
        fuelDate: new Date('2024-01-25'),
        liters: 220,
        odometer: 800,
        pricePerLiter: 1.33,
        totalCost: 292.60,
        fuelType: 'diesel',
        station: 'Galp',
        location: 'Barcelona Centro',
        isFull: true,
        notes: 'Primera carga del mes',
        createdById: operator.id,
        companyId: company.id
      },
      {
        vehicleId: vehicle3.id,
        fuelDate: new Date('2024-02-15'),
        liters: 250,
        odometer: 850,
        pricePerLiter: 1.36,
        totalCost: 340.00,
        fuelType: 'diesel',
        station: 'Repsol',
        location: 'Barcelona Norte',
        isFull: true,
        notes: 'Repostaje completo',
        createdById: operator.id,
        companyId: company.id
      }
    ];

    for (const record of fuelRecords) {
      await FuelRecord.create(record);
    }

    console.log('\n✅ Datos de ejemplo creados exitosamente!');
    console.log('\n📊 Resumen de datos creados:');
    console.log(`- 1 Empresa: ${company.name}`);
    console.log(`- 2 Delegaciones: ${branch1.name}, ${branch2.name}`);
    console.log(`- 2 Usuarios adicionales: ${manager.firstName} ${manager.lastName}, ${operator.firstName} ${operator.lastName}`);
    console.log(`- 3 Vehículos: ${vehicle1.make} ${vehicle1.model}, ${vehicle2.make} ${vehicle2.model}, ${vehicle3.make} ${vehicle3.model}`);
    console.log(`- ${fuelRecords.length} Registros de combustible`);
    
    console.log('\n🔑 Credenciales de usuarios:');
    console.log('- Admin: admin@tractoreando.com / admin123456');
    console.log('- Manager: carlos.garcia@tractoreando.com / password123');
    console.log('- Operator: maria.lopez@tractoreando.com / password123');

    await sequelize.close();
    console.log('\n🔌 Conexión cerrada.');
  } catch (error) {
    console.error('❌ Error creando datos de ejemplo:', error);
    await sequelize.close();
  }
}

createSampleData();