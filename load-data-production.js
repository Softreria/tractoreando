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
  bufferMaxEntries: 0,
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 30000
};

// Función para crear datos en lotes pequeños
async function createInBatches(Model, data, batchSize = 10) {
  const results = [];
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    console.log(`  📦 Procesando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)} (${batch.length} elementos)`);
    
    try {
      const batchResults = await Model.insertMany(batch, { 
        ordered: false,
        timeout: 30000
      });
      results.push(...batchResults);
      
      // Pequeña pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Error en lote:`, error.message);
      // Intentar insertar uno por uno en caso de error
      for (const item of batch) {
        try {
          const result = await Model.create(item);
          results.push(result);
        } catch (itemError) {
          console.error(`❌ Error insertando elemento:`, itemError.message);
        }
      }
    }
  }
  
  return results;
}

// Función principal mejorada
async function loadProductionData() {
  let connection = null;
  
  try {
    console.log('🚀 Cargando datos para producción...');
    
    // Conectar con configuración optimizada
    console.log('🔌 Conectando a MongoDB...');
    connection = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando',
      mongoOptions
    );
    console.log('✅ Conectado a MongoDB');
    
    // Verificar si ya existen datos
    const existingCompanies = await Company.countDocuments();
    const existingUsers = await User.countDocuments();
    
    if (existingCompanies > 0 || existingUsers > 0) {
      console.log('⚠️ Ya existen datos en la base de datos');
      console.log(`  - Empresas: ${existingCompanies}`);
      console.log(`  - Usuarios: ${existingUsers}`);
      
      console.log('\n🤔 ¿Deseas continuar? Esto agregará más datos.');
      console.log('💡 Para limpiar primero, ejecuta: node fix-mongodb-timeout.js');
    }
    
    // 1. Crear usuario super admin si no existe
    console.log('\n👤 Verificando usuario administrador...');
    let adminUser = await User.findOne({ role: 'super_admin' });
    
    if (!adminUser) {
      console.log('📝 Creando usuario super administrador...');
      const hashedPassword = await bcrypt.hash('Admin2024!', 12);
      
      adminUser = await User.create({
        firstName: 'Super',
        lastName: 'Administrador',
        email: 'admin@tractoreando.es',
        password: hashedPassword,
        role: 'super_admin',
        isActive: true,
        permissions: {
          companies: { create: true, read: true, update: true, delete: true },
          branches: { create: true, read: true, update: true, delete: true },
          users: { create: true, read: true, update: true, delete: true },
          vehicles: { create: true, read: true, update: true, delete: true },
          maintenance: { create: true, read: true, update: true, delete: true },
          reports: { create: true, read: true, update: true, delete: true }
        }
      });
      
      console.log('✅ Usuario super administrador creado');
      console.log('📧 Email: admin@tractoreando.es');
      console.log('🔑 Contraseña: Admin2024!');
    } else {
      console.log('✅ Usuario super administrador ya existe');
    }
    
    // 2. Crear empresa de ejemplo
    console.log('\n🏢 Creando empresa de ejemplo...');
    
    const companyData = {
      name: 'Transportes Demo S.L.',
      rfc: 'B12345678',
      address: {
        street: 'Calle Ejemplo, 123',
        city: 'Madrid',
        state: 'Madrid',
        zipCode: '28001',
        country: 'España'
      },
      contact: {
        phone: '+34 91 123 4567',
        email: 'info@transportesdemo.es',
        website: 'www.transportesdemo.es'
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
        maxUsers: 20,
        features: ['maintenance', 'reports', 'notifications', 'api']
      },
      isActive: true,
      createdBy: adminUser._id
    };
    
    let company = await Company.findOne({ rfc: companyData.rfc });
    if (!company) {
      company = await Company.create(companyData);
      console.log('✅ Empresa creada:', company.name);
    } else {
      console.log('✅ Empresa ya existe:', company.name);
    }
    
    // 3. Crear sucursal principal
    console.log('\n🏪 Creando sucursal principal...');
    
    const branchData = {
      name: 'Sede Central',
      code: 'CENTRAL',
      type: 'oficina',
      company: company._id,
      address: {
        street: 'Calle Ejemplo, 123',
        city: 'Madrid',
        state: 'Madrid',
        zipCode: '28001',
        country: 'España'
      },
      contact: {
        phone: '+34 91 123 4567',
        email: 'central@transportesdemo.es'
      },
      operatingHours: {
        monday: { open: '08:00', close: '17:00', closed: false },
        tuesday: { open: '08:00', close: '17:00', closed: false },
        wednesday: { open: '08:00', close: '17:00', closed: false },
        thursday: { open: '08:00', close: '17:00', closed: false },
        friday: { open: '08:00', close: '17:00', closed: false },
        saturday: { open: '08:00', close: '12:00', closed: false },
        sunday: { open: '08:00', close: '12:00', closed: true }
      },
      isActive: true,
      createdBy: adminUser._id
    };
    
    let branch = await Branch.findOne({ code: branchData.code, company: company._id });
    if (!branch) {
      branch = await Branch.create(branchData);
      console.log('✅ Sucursal creada:', branch.name);
    } else {
      console.log('✅ Sucursal ya existe:', branch.name);
    }
    
    // 4. Crear usuario administrador de empresa
    console.log('\n👥 Creando usuario administrador de empresa...');
    
    const companyAdminData = {
      firstName: 'Admin',
      lastName: 'Empresa',
      email: 'admin.empresa@transportesdemo.es',
      password: await bcrypt.hash('Admin2024!', 12),
      role: 'company_admin',
      company: company._id,
      branches: [branch._id],
      isActive: true,
      permissions: {
        branches: { create: true, read: true, update: true, delete: true },
        users: { create: true, read: true, update: true, delete: true },
        vehicles: { create: true, read: true, update: true, delete: true },
        maintenance: { create: true, read: true, update: true, delete: true },
        reports: { create: true, read: true, update: true, delete: true }
      },
      createdBy: adminUser._id
    };
    
    let companyAdmin = await User.findOne({ email: companyAdminData.email });
    if (!companyAdmin) {
      companyAdmin = await User.create(companyAdminData);
      console.log('✅ Administrador de empresa creado');
      console.log('📧 Email:', companyAdminData.email);
      console.log('🔑 Contraseña: Admin2024!');
    } else {
      console.log('✅ Administrador de empresa ya existe');
    }
    
    console.log('\n🎉 ¡Datos básicos cargados exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`✅ Empresa: ${company.name}`);
    console.log(`✅ Sucursal: ${branch.name}`);
    console.log(`✅ Usuarios creados: 2`);
    
    console.log('\n🔑 Credenciales de acceso:');
    console.log('\n👑 Super Administrador:');
    console.log('   Email: admin@tractoreando.es');
    console.log('   Contraseña: Admin2024!');
    console.log('\n🏢 Administrador de Empresa:');
    console.log('   Email: admin.empresa@transportesdemo.es');
    console.log('   Contraseña: Admin2024!');
    
    console.log('\n💡 Próximos pasos:');
    console.log('1. Acceder a la aplicación web');
    console.log('2. Cambiar las contraseñas por defecto');
    console.log('3. Configurar los datos de tu empresa real');
    console.log('4. Crear usuarios adicionales según necesites');
    
  } catch (error) {
    console.error('\n❌ Error cargando datos:', error.message);
    console.error('\n🔧 Posibles soluciones:');
    console.error('1. Ejecutar primero: node fix-mongodb-timeout.js');
    console.error('2. Verificar conexión a MongoDB');
    console.error('3. Verificar variables de entorno (.env)');
    
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.connection.close();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  loadProductionData();
}

module.exports = { loadProductionData };