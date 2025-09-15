// Cargar variables de entorno de producción
require('dotenv').config({ path: './.env' });

const bcrypt = require('bcryptjs');
const { sequelize, connectDB } = require('./config/database');

console.log('🔧 Configuración de base de datos:', {
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  nodeEnv: process.env.NODE_ENV
});

const createAdmin = async () => {
  try {
    console.log('🔌 Conectando a la base de datos...');
    await connectDB();
    
    console.log('🔄 Sincronizando modelos con la base de datos...');
    // Sincronizar todos los modelos para crear las tablas
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ Base de datos sincronizada correctamente.');
    
    // Importar modelos después de la sincronización
    const User = require('./models/User');
    const Company = require('./models/Company');
    const Branch = require('./models/Branch');
    
    console.log('👤 Creando usuario administrador...');
    
    const adminEmail = 'admin@tractoreando.com';
    const adminPassword = 'admin123';
    
    // Verificar si ya existe
    const existingUser = await User.findOne({ where: { email: adminEmail } });
    if (existingUser) {
      console.log('⚠️  El usuario administrador ya existe.');
      return;
    }
    
    // Crear empresa por defecto
    let company = await Company.findOne({ where: { name: 'Tractoreando Admin' } });
    if (!company) {
      company = await Company.create({
        name: 'Tractoreando Admin',
        cif: 'B12345678',
        isActive: true
      });
      console.log('🏢 Empresa creada:', company.name);
    }
    
    // Crear sucursal por defecto
    let branch = await Branch.findOne({ where: { companyId: company.id, code: 'MAIN' } });
    if (!branch) {
      branch = await Branch.create({
        name: 'Sede Principal',
        code: 'MAIN',
        companyId: company.id,
        isActive: true
      });
      console.log('🏪 Sucursal creada:', branch.name);
    }
    
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    // Crear usuario administrador
    const userId = await User.create({
      firstName: 'Admin',
      lastName: 'Sistema',
      email: adminEmail,
      password: hashedPassword,
      role: 'super_admin',
      companyId: company.id,
      branchId: branch.id,
      permissions: {
        users: { read: true, create: true, update: true, delete: true },
        companies: { read: true, create: true, update: true, delete: true },
        branches: { read: true, create: true, update: true, delete: true },
        vehicles: { read: true, create: true, update: true, delete: true },
        maintenance: { read: true, create: true, update: true, delete: true },
        reports: { read: true, create: true, update: true, delete: true, export: true },
        settings: { read: true, create: true, update: true, delete: true }
      },
      preferences: {
        notifications: { email: true, push: true, sms: false },
        dashboard: { defaultView: 'overview', itemsPerPage: 10 }
      },
      isActive: true,
      loginAttempts: 0
    });
    
    console.log('✅ Usuario administrador creado exitosamente!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Contraseña:', adminPassword);
    console.log('👤 Rol: super_admin');
    console.log('🆔 ID:', userId.id);
    console.log('');
    console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login por seguridad.');
    
  } catch (error) {
    console.error('❌ Error al crear usuario administrador:', error.message);
    
    // Si las tablas no existen, intentar crearlas
    if (error.message.includes('no such table') || error.message.includes('does not exist')) {
      console.log('🔄 Las tablas no existen. Intentando sincronizar la base de datos...');
      try {
        await sequelize.sync({ force: false, alter: true });
        console.log('✅ Base de datos sincronizada. Intenta ejecutar el script nuevamente.');
      } catch (syncError) {
        console.error('❌ Error al sincronizar la base de datos:', syncError.message);
      }
    }
  } finally {
    // Cerrar conexión
    await sequelize.close();
    console.log('🔌 Conexión a la base de datos cerrada.');
    process.exit(0);
  }
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  createAdmin();
}

module.exports = createAdmin;