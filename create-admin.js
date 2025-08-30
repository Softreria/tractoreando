// Cargar variables de entorno de desarrollo
require('dotenv').config({ path: './.env.development' });

const bcrypt = require('bcryptjs');
const { sequelize, connectDB } = require('./config/database');

console.log('🔧 Configuración de base de datos:', {
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  nodeEnv: process.env.NODE_ENV
});

// Función para crear usuario administrador directamente con SQL
const createAdminUser = async () => {
  try {
    // Conectar a la base de datos
    await connectDB();
    
    console.log('🔄 Creando usuario administrador...');
    
    // Datos del usuario administrador
    const adminEmail = 'admin@tractoreando.com';
    const adminPassword = 'admin123456';
    
    // Crear las tablas primero si no existen
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "Users" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "firstName" VARCHAR(255) NOT NULL,
        "lastName" VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(255),
        avatar VARCHAR(255),
        "companyId" UUID,
        "branchId" UUID,
        "vehicleTypeAccess" JSONB DEFAULT '[]',
        role VARCHAR(255) NOT NULL,
        permissions JSONB DEFAULT '{}',
        preferences JSONB DEFAULT '{}',
        "lastLogin" TIMESTAMP,
        "loginAttempts" INTEGER DEFAULT 0,
        "lockUntil" TIMESTAMP,
        "isActive" BOOLEAN DEFAULT true,
        "createdById" UUID,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Verificar si ya existe un usuario con este email
    const [existingUsers] = await sequelize.query(
      'SELECT email FROM "Users" WHERE email = $1',
      { bind: [adminEmail] }
    );
    
    if (existingUsers.length > 0) {
      console.log('⚠️  El usuario administrador ya existe.');
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Para cambiar la contraseña, elimina el usuario existente primero.');
      return;
    }
    
    // Generar UUID para PostgreSQL
    const { v4: uuidv4 } = require('uuid');
    const userId = uuidv4();
    const now = new Date();
    
    // Importar el modelo User existente
    const User = require('./models/User');

    // Crear el usuario administrador usando el modelo existente
    // La contraseña se hasheará automáticamente en el hook beforeSave
    await User.create({
      id: userId,
      firstName: 'Admin',
      lastName: 'Sistema',
      email: adminEmail,
      password: adminPassword, // Pasar la contraseña sin hashear
      role: 'super_admin',
      vehicleTypeAccess: ['Tractor', 'Camión', 'Furgoneta', 'Coche', 'Motocicleta', 'Remolque', 'Maquinaria', 'Otro'],
      permissions: {
        companies: { create: true, read: true, update: true, delete: true },
        branches: { create: true, read: true, update: true, delete: true },
        vehicles: { create: true, read: true, update: true, delete: true },
        maintenance: { create: true, read: true, update: true, delete: true },
        users: { create: true, read: true, update: true, delete: true },
        reports: { read: true, export: true }
      },
      preferences: {
        language: 'es',
        timezone: 'Europe/Madrid',
        notifications: { email: true, push: true, sms: false },
        dashboard: { defaultView: 'overview', itemsPerPage: 10 }
      },
      isActive: 1, // Usar 1 en lugar de true para INTEGER
      loginAttempts: 0
    });
    
    console.log('✅ Usuario administrador creado exitosamente!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Contraseña:', adminPassword);
    console.log('👤 Rol: super_admin');
    console.log('🆔 ID:', userId);
    console.log('');
    console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login por seguridad.');
    
  } catch (error) {
    console.error('❌ Error al crear usuario administrador:', error.message);
    
    // Si las tablas no existen, intentar crearlas
    if (error.message.includes('no such table')) {
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

// Función para eliminar usuario administrador
const deleteAdminUser = async () => {
  try {
    await connectDB();
    
    const adminEmail = 'admin@tractoreando.com';
    const [result] = await sequelize.query(
      'DELETE FROM "Users" WHERE email = $1',
      { bind: [adminEmail] }
    );
    
    console.log('🗑️  Usuario administrador eliminado exitosamente.');
    
  } catch (error) {
    console.error('❌ Error al eliminar usuario administrador:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

// Verificar argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.includes('--delete')) {
  deleteAdminUser();
} else if (args.includes('--help')) {
  console.log('📖 Uso del script:');
  console.log('   node create-admin.js          - Crear usuario administrador');
  console.log('   node create-admin.js --delete - Eliminar usuario administrador');
  console.log('   node create-admin.js --help   - Mostrar esta ayuda');
  process.exit(0);
} else {
  createAdminUser();
}