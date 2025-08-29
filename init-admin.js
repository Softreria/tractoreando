const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Importar modelos
const User = require('./models/User');
const Company = require('./models/Company');
const Branch = require('./models/Branch');

const initializeAdmin = async () => {
  try {
    // Conectar a MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe un usuario administrador
    const existingAdmin = await User.findOne({ role: 'super_admin' });
    if (existingAdmin) {
      console.log('⚠️  Ya existe un usuario administrador');
      console.log(`📧 Email: ${existingAdmin.email}`);
      process.exit(0);
    }

    // Crear empresa administradora
    const adminCompany = new Company({
      name: process.env.DEFAULT_COMPANY_NAME || 'Tractoreando Admin',
      cif: process.env.DEFAULT_COMPANY_CIF || 'B12345678',
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@tractoreando.com',
      phone: '900000000',
      address: {
        street: 'Calle Principal 1',
        city: 'Madrid',
        state: 'Madrid',
        zipCode: '28001',
        country: 'España'
      },
      isActive: true,
      admin: null // Se asignará después de crear el usuario
    });

    await adminCompany.save();
    console.log('✅ Empresa administradora creada');

    // Crear delegación principal
    const mainBranch = new Branch({
      name: 'Sede Principal',
      company: adminCompany._id,
      address: {
        street: 'Calle Principal 1',
        city: 'Madrid',
        state: 'Madrid',
        zipCode: '28001',
        country: 'España'
      },
      phone: '900000000',
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@tractoreando.com',
      isActive: true
    });

    await mainBranch.save();
    console.log('✅ Delegación principal creada');

    // Crear usuario administrador
    const hashedPassword = await bcrypt.hash(
      process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!', 
      12
    );

    const adminUser = new User({
      name: 'Administrador',
      lastName: 'Sistema',
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@tractoreando.com',
      password: hashedPassword,
      role: 'super_admin',
      company: adminCompany._id,
      branch: mainBranch._id,
      isActive: true,
      permissions: {
        users: { create: true, read: true, update: true, delete: true },
        vehicles: { create: true, read: true, update: true, delete: true },
        maintenance: { create: true, read: true, update: true, delete: true },
        reports: { create: true, read: true, update: true, delete: true },
        companies: { create: true, read: true, update: true, delete: true }
      },
      vehicleTypeAccess: [
        'Tractor',
        'Camión',
        'Furgoneta',
        'Coche',
        'Motocicleta',
        'Remolque',
        'Maquinaria',
        'Otro'
      ]
    });

    await adminUser.save();
    console.log('✅ Usuario administrador creado');

    // Actualizar empresa con el administrador
    adminCompany.admin = adminUser._id;
    await adminCompany.save();
    console.log('✅ Empresa actualizada con administrador');

    console.log('\n🎉 Inicialización completada exitosamente!');
    console.log('\n📋 Credenciales de acceso:');
    console.log(`📧 Email: ${adminUser.email}`);
    console.log(`🔑 Contraseña: ${process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!'}`);
    console.log(`🏢 Empresa: ${adminCompany.name}`);
    console.log(`🏪 Delegación: ${mainBranch.name}`);
    console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer acceso');

  } catch (error) {
    console.error('❌ Error durante la inicialización:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión a MongoDB cerrada');
    process.exit(0);
  }
};

// Ejecutar inicialización
initializeAdmin();