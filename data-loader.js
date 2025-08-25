#!/usr/bin/env node

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Importar modelos
const Company = require('./models/Company');
const Branch = require('./models/Branch');
const User = require('./models/User');
const Vehicle = require('./models/Vehicle');
const Maintenance = require('./models/Maintenance');

// Configuración optimizada para producción
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  bufferCommands: false,
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 30000
};

// Colores para logging
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Función para crear datos en lotes
async function createInBatches(Model, data, batchSize = 10) {
  const results = [];
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    log(`  📦 Procesando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)} (${batch.length} elementos)`, 'blue');
    
    try {
      const batchResults = await Model.insertMany(batch, { 
        ordered: false,
        timeout: 30000
      });
      results.push(...batchResults);
      
      // Pequeña pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      log(`❌ Error en lote: ${error.message}`, 'red');
      // Intentar insertar uno por uno en caso de error
      for (const item of batch) {
        try {
          const result = await Model.create(item);
          results.push(result);
        } catch (itemError) {
          log(`❌ Error insertando elemento: ${itemError.message}`, 'red');
        }
      }
    }
  }
  
  return results;
}

// Plantillas de datos
const dataTemplates = {
  spanish: {
    companies: [
      {
        name: 'Transportes Andalucía S.L.',
        rfc: 'A41234567',
        address: {
          street: 'Calle Sierpes, 45',
          city: 'Sevilla',
          state: 'Andalucía',
          zipCode: '41004',
          country: 'España'
        },
        contact: {
          phone: '+34 954 123 456',
          email: 'info@transportesandalucia.es',
          website: 'www.transportesandalucia.es'
        },
        settings: {
          currency: 'EUR',
          timezone: 'Europe/Madrid'
        }
      },
      {
        name: 'Logística Catalana S.A.',
        rfc: 'A08987654',
        address: {
          street: 'Passeig de Gràcia, 123',
          city: 'Barcelona',
          state: 'Cataluña',
          zipCode: '08008',
          country: 'España'
        },
        contact: {
          phone: '+34 93 456 789',
          email: 'contacto@logisticacatalana.es',
          website: 'www.logisticacatalana.es'
        },
        settings: {
          currency: 'EUR',
          timezone: 'Europe/Madrid'
        }
      }
    ],
    vehicleTypes: ['Camión', 'Furgoneta', 'Tráiler', 'Autobús'],
    maintenanceTypes: ['Preventivo', 'Correctivo', 'Inspección', 'Reparación']
  },
  
  production: {
    companies: [
      {
        name: 'Empresa Demo',
        rfc: 'DEMO123456789',
        address: {
          street: 'Calle Principal 1',
          city: 'Ciudad Principal',
          state: 'Estado Principal',
          zipCode: '00000',
          country: 'País'
        },
        contact: {
          phone: '+00 000 000 000',
          email: 'demo@empresa.com',
          website: 'www.empresa.com'
        },
        settings: {
          currency: 'USD',
          timezone: 'UTC'
        }
      }
    ],
    vehicleTypes: ['Truck', 'Van', 'Trailer'],
    maintenanceTypes: ['Preventive', 'Corrective', 'Inspection']
  },
  
  sample: {
    companies: [
      {
        name: 'Transportes García S.L.',
        rfc: 'TGS123456789',
        address: {
          street: 'Calle Mayor 123',
          city: 'Madrid',
          state: 'Madrid',
          zipCode: '28001',
          country: 'España'
        },
        contact: {
          phone: '+34 91 123 4567',
          email: 'info@transportesgarcia.es',
          website: 'www.transportesgarcia.es'
        },
        settings: {
          currency: 'EUR',
          timezone: 'Europe/Madrid',
          maintenanceReminders: true,
          emailNotifications: true
        },
        subscription: {
          plan: 'premium',
          maxVehicles: 50,
          maxUsers: 10,
          features: ['maintenance', 'reports', 'notifications']
        }
      },
      {
        name: 'Logística del Norte S.A.',
        rfc: 'LDN987654321',
        address: {
          street: 'Avenida Industrial 456',
          city: 'Bilbao',
          state: 'País Vasco',
          zipCode: '48001',
          country: 'España'
        },
        contact: {
          phone: '+34 94 987 6543',
          email: 'contacto@logisticanorte.es',
          website: 'www.logisticanorte.es'
        },
        settings: {
          currency: 'EUR',
          timezone: 'Europe/Madrid',
          maintenanceReminders: true,
          emailNotifications: false
        },
        subscription: {
          plan: 'basic',
          maxVehicles: 20,
          maxUsers: 5,
          features: ['maintenance', 'basic_reports']
        }
      }
    ],
    vehicleTypes: ['Camión', 'Furgoneta', 'Tráiler', 'Autobús', 'Motocicleta'],
    maintenanceTypes: ['Preventivo', 'Correctivo', 'Inspección', 'Reparación', 'Emergencia']
  }
};

// Función para crear empresas
async function createCompanies(template, options = {}) {
  log('📊 Creando empresas...', 'cyan');
  
  const companies = template.companies.map(company => ({
    ...company,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
  
  const createdCompanies = options.useBatches 
    ? await createInBatches(Company, companies)
    : await Company.insertMany(companies);
    
  log(`✅ ${createdCompanies.length} empresas creadas`, 'green');
  return createdCompanies;
}

// Función para crear sucursales
async function createBranches(companies, template, options = {}) {
  log('🏢 Creando sucursales...', 'cyan');
  
  const { tempAdminId } = options;
  const branches = [];
  
  companies.forEach((company, index) => {
    // Crear 2-3 sucursales por empresa
    const branchCount = Math.floor(Math.random() * 2) + 2;
    
    for (let i = 0; i < branchCount; i++) {
      branches.push({
        name: `Sucursal ${i + 1}`,
        code: `SUC${index + 1}${String(i + 1).padStart(2, '0')}`,
        company: company._id,
        createdBy: tempAdminId,
        address: {
          street: `Calle Sucursal ${i + 1}, ${(i + 1) * 10}`,
          city: company.address.city,
          state: company.address.state,
          zipCode: company.address.zipCode,
          country: company.address.country
        },
        contact: {
          phone: company.contact.phone,
          email: `sucursal${i + 1}@${company.contact.email.split('@')[1]}`
        },
        isMain: i === 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  });
  
  const createdBranches = options.useBatches 
    ? await createInBatches(Branch, branches)
    : await Branch.insertMany(branches);
    
  log(`✅ ${createdBranches.length} sucursales creadas`, 'green');
  return createdBranches;
}

// Función para crear usuarios
async function createUsers(companies, branches, template, options = {}) {
  log('👥 Creando usuarios...', 'cyan');
  
  const users = [];
  const saltRounds = 10;
  
  // Usuario super admin
  users.push({
    username: 'admin',
    email: 'admin@tractoreando.com',
    password: await bcrypt.hash('admin123', saltRounds),
    firstName: 'Super',
    lastName: 'Admin',
    role: 'super_admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  // Usuarios por empresa
  for (const company of companies) {
    const companyBranches = branches.filter(b => b.company.toString() === company._id.toString());
    
    // Admin de empresa
    users.push({
      username: `admin_${company.name.toLowerCase().replace(/\s+/g, '_')}`,
      email: `admin@${company.contact.email.split('@')[1]}`,
      password: await bcrypt.hash('admin123', saltRounds),
      firstName: 'Admin',
      lastName: 'Empresa',
      role: 'company_admin',
      company: company._id,
      branch: companyBranches[0]?._id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Operadores
    for (let i = 0; i < 3; i++) {
      users.push({
        username: `operador${i + 1}_${company.name.toLowerCase().replace(/\s+/g, '_')}`,
        email: `operador${i + 1}@${company.contact.email.split('@')[1]}`,
        password: await bcrypt.hash('operador123', saltRounds),
        firstName: `Operador${i + 1}`,
        lastName: 'Sistema',
        role: 'operator',
        company: company._id,
        branch: companyBranches[i % companyBranches.length]?._id,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }
  
  const createdUsers = options.useBatches 
    ? await createInBatches(User, users)
    : await User.insertMany(users);
    
  log(`✅ ${createdUsers.length} usuarios creados`, 'green');
  return createdUsers;
}

// Función para crear vehículos
async function createVehicles(companies, branches, users, template, options = {}) {
  log('🚛 Creando vehículos...', 'cyan');
  
  const vehicles = [];
  const vehicleTypeMap = {
    'Camión': 'camion',
    'Furgoneta': 'van',
    'Tráiler': 'trailer',
    'Autobús': 'autobus',
    'Motocicleta': 'motocicleta'
  };
  
  companies.forEach(company => {
    const companyBranches = branches.filter(b => b.company.toString() === company._id.toString());
    const companyUsers = users.filter(u => u.company && u.company.toString() === company._id.toString());
    const vehicleCount = Math.floor(Math.random() * 8) + 5; // 5-12 vehículos por empresa
    
    for (let i = 0; i < vehicleCount; i++) {
      const year = 2015 + Math.floor(Math.random() * 9); // 2015-2023
      const templateType = template.vehicleTypes[Math.floor(Math.random() * template.vehicleTypes.length)];
      
      vehicles.push({
        plateNumber: `${Math.random().toString(36).substr(2, 3).toUpperCase()}-${Math.floor(Math.random() * 9000) + 1000}`,
        make: ['Mercedes', 'Volvo', 'Scania', 'MAN', 'Iveco'][Math.floor(Math.random() * 5)],
        model: `Modelo ${year}`,
        year: year,
        vehicleType: vehicleTypeMap[templateType] || 'camion',
        company: company._id,
        branch: companyBranches[i % companyBranches.length]?._id,
        createdBy: companyUsers[i % companyUsers.length]?._id || users[0]._id,
        status: ['activo', 'en_mantenimiento', 'fuera_de_servicio'][Math.floor(Math.random() * 3)],
        odometer: {
          current: Math.floor(Math.random() * 200000) + 10000,
          unit: 'km'
        },
        engine: {
          type: ['diesel', 'gasolina', 'hibrido'][Math.floor(Math.random() * 3)]
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  });
  
  const createdVehicles = options.useBatches 
    ? await createInBatches(Vehicle, vehicles)
    : await Vehicle.insertMany(vehicles);
    
  log(`✅ ${createdVehicles.length} vehículos creados`, 'green');
  return createdVehicles;
}

// Función para crear mantenimientos
async function createMaintenance(vehicles, users, template, options = {}) {
  log('🔧 Creando registros de mantenimiento...', 'cyan');
  
  const maintenances = [];
  
  // Mapeo de tipos de mantenimiento a valores válidos del enum
  const typeMap = {
    'Preventivo': 'preventivo',
    'Correctivo': 'correctivo',
    'Inspección': 'inspeccion',
    'Reparación': 'correctivo',
    'Emergencia': 'emergencia'
  };
  
  // Valores válidos para status
  const validStatuses = ['programado', 'en_proceso', 'pausado', 'completado', 'cancelado', 'pendiente_aprobacion', 'pendiente_partes'];
  
  vehicles.forEach(vehicle => {
    const maintenanceCount = Math.floor(Math.random() * 3) + 1; // 1-3 mantenimientos por vehículo
    
    for (let i = 0; i < maintenanceCount; i++) {
      const daysAgo = Math.floor(Math.random() * 365);
      const maintenanceDate = new Date();
      maintenanceDate.setDate(maintenanceDate.getDate() - daysAgo);
      
      const templateType = template.maintenanceTypes[Math.floor(Math.random() * template.maintenanceTypes.length)];
      const mappedType = typeMap[templateType] || 'preventivo';
      
      // Seleccionar un usuario aleatorio como creador
      const randomUser = users[Math.floor(Math.random() * users.length)];
      
      maintenances.push({
        vehicle: vehicle._id,
        company: vehicle.company,
        branch: vehicle.branch,
        workOrderNumber: `WO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
        type: mappedType,
        title: `Mantenimiento ${templateType} - ${vehicle.plateNumber}`,
        description: `Mantenimiento ${templateType.toLowerCase()} programado para el vehículo ${vehicle.plateNumber}`,
        scheduledDate: maintenanceDate,
        odometerReading: Math.max(0, (vehicle.odometer?.current || 0) - Math.floor(Math.random() * 10000)),
        status: validStatuses[Math.floor(Math.random() * validStatuses.length)],
        services: [{
          category: 'motor',
          description: `Revisión de ${templateType.toLowerCase()}`,
          estimatedHours: Math.floor(Math.random() * 8) + 1,
          completed: Math.random() > 0.5
        }],
        createdBy: randomUser._id,
        createdAt: maintenanceDate,
        updatedAt: maintenanceDate
      });
    }
  });
  
  const createdMaintenances = options.useBatches 
    ? await createInBatches(Maintenance, maintenances)
    : await Maintenance.insertMany(maintenances);
    
  log(`✅ ${createdMaintenances.length} registros de mantenimiento creados`, 'green');
  return createdMaintenances;
}

// Función principal para cargar datos
async function loadData(type = 'sample', options = {}) {
  const {
    clearExisting = true,
    useBatches = false,
    skipUsers = false,
    skipVehicles = false,
    skipMaintenance = false
  } = options;
  
  try {
    log(`🚀 Iniciando carga de datos tipo: ${type}`, 'cyan');
    
    // Conectar a MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando';
    await mongoose.connect(mongoUri, mongoOptions);
    log('✅ Conectado a MongoDB', 'green');
    
    // Obtener plantilla
    const template = dataTemplates[type];
    if (!template) {
      throw new Error(`Tipo de datos '${type}' no válido. Tipos disponibles: ${Object.keys(dataTemplates).join(', ')}`);
    }
    
    // Limpiar datos existentes si se solicita
    if (clearExisting) {
      log('🧹 Limpiando datos existentes...', 'yellow');
      await Maintenance.deleteMany({});
      await Vehicle.deleteMany({});
      if (!skipUsers) await User.deleteMany({});
      await Branch.deleteMany({});
      await Company.deleteMany({});
      log('✅ Datos anteriores eliminados', 'green');
    }
    
    // Crear datos
    const companies = await createCompanies(template, { useBatches });
    
    // Crear un usuario administrador temporal para las sucursales
    const tempAdmin = await User.create({
      firstName: 'Admin',
      lastName: 'Temporal',
      email: 'temp@admin.com',
      password: await bcrypt.hash('temp123', 10),
      role: 'super_admin',
      company: companies[0]._id,
      isActive: true
    });
    
    const branches = await createBranches(companies, template, { useBatches, tempAdminId: tempAdmin._id });
    
    let users = [];
    if (!skipUsers) {
      users = await createUsers(companies, branches, template, { useBatches });
      // Eliminar el usuario temporal
      await User.findByIdAndDelete(tempAdmin._id);
    }
    
    let vehicles = [];
    if (!skipVehicles) {
      vehicles = await createVehicles(companies, branches, users, template, { useBatches });
    }
    
    let maintenances = [];
    if (!skipMaintenance && vehicles.length > 0 && users.length > 0) {
      maintenances = await createMaintenance(vehicles, users, template, { useBatches });
    }
    
    // Resumen
    log('\n📊 RESUMEN DE DATOS CREADOS:', 'cyan');
    log(`  • Empresas: ${companies.length}`, 'blue');
    log(`  • Sucursales: ${branches.length}`, 'blue');
    log(`  • Usuarios: ${users.length}`, 'blue');
    log(`  • Vehículos: ${vehicles.length}`, 'blue');
    log(`  • Mantenimientos: ${maintenances.length}`, 'blue');
    
    await mongoose.disconnect();
    log('✅ Carga de datos completada exitosamente', 'green');
    
    return {
      success: true,
      data: {
        companies: companies.length,
        branches: branches.length,
        users: users.length,
        vehicles: vehicles.length,
        maintenances: maintenances.length
      }
    };
    
  } catch (error) {
    log(`❌ Error durante la carga de datos: ${error.message}`, 'red');
    await mongoose.disconnect();
    return { success: false, error: error.message };
  }
}

// Función para mostrar ayuda
function showHelp() {
  console.log(`\n${colors.cyan}Sistema de Carga de Datos Unificado${colors.reset}`);
  console.log(`\nUso: node data-loader.js [tipo] [opciones]\n`);
  console.log(`Tipos de datos disponibles:`);
  console.log(`  spanish     Datos de ejemplo para España`);
  console.log(`  production  Datos mínimos para producción`);
  console.log(`  sample      Datos de ejemplo completos (por defecto)`);
  console.log(`\nOpciones:`);
  console.log(`  --no-clear        No limpiar datos existentes`);
  console.log(`  --use-batches     Usar inserción por lotes (recomendado para producción)`);
  console.log(`  --skip-users      No crear usuarios`);
  console.log(`  --skip-vehicles   No crear vehículos`);
  console.log(`  --skip-maintenance No crear mantenimientos`);
  console.log(`  --help            Mostrar esta ayuda`);
  console.log(`\nEjemplos:`);
  console.log(`  node data-loader.js                           # Datos de ejemplo completos`);
  console.log(`  node data-loader.js spanish                   # Datos para España`);
  console.log(`  node data-loader.js production --use-batches  # Datos de producción con lotes`);
}

// Ejecución desde línea de comandos
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showHelp();
    process.exit(0);
  }
  
  const type = args.find(arg => !arg.startsWith('--')) || 'sample';
  const options = {
    clearExisting: !args.includes('--no-clear'),
    useBatches: args.includes('--use-batches'),
    skipUsers: args.includes('--skip-users'),
    skipVehicles: args.includes('--skip-vehicles'),
    skipMaintenance: args.includes('--skip-maintenance')
  };
  
  loadData(type, options)
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      log(`Error fatal: ${error.message}`, 'red');
      process.exit(1);
    });
}

// Exportar funciones para uso como módulo
module.exports = {
  loadData,
  createCompanies,
  createBranches,
  createUsers,
  createVehicles,
  createMaintenance,
  dataTemplates
};