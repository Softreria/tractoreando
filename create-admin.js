// Cargar variables de entorno de desarrollo
require('dotenv').config({ path: './.env.development' });

const bcrypt = require('bcryptjs');
const { sequelize, connectDB } = require('./config/database');

console.log('🔧 Configuración de base de datos:', {
  type: process.env.DB_TYPE,
  storage: process.env.DB_STORAGE,
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
      CREATE TABLE IF NOT EXISTS Users (
        id TEXT PRIMARY KEY,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        phone TEXT,
        avatar TEXT,
        companyId TEXT,
        branchId TEXT,
        vehicleTypeAccess TEXT DEFAULT '[]',
        role TEXT NOT NULL,
        permissions TEXT DEFAULT '{}',
        preferences TEXT DEFAULT '{}',
        lastLogin TEXT,
        loginAttempts INTEGER DEFAULT 0,
        lockUntil TEXT,
        isActive INTEGER DEFAULT 1,
        createdById TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);
    
    // Verificar si ya existe un usuario con este email
    const [existingUsers] = await sequelize.query(
      'SELECT email FROM Users WHERE email = ?',
      { replacements: [adminEmail] }
    );
    
    if (existingUsers.length > 0) {
      console.log('⚠️  El usuario administrador ya existe.');
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Para cambiar la contraseña, elimina el usuario existente primero.');
      return;
    }
    
    // Hashear la contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
    
    // Generar UUID simple para SQLite
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const userId = generateUUID();
    const now = new Date().toISOString();
    
    // Crear el usuario administrador con SQL directo
    await sequelize.query(`
      INSERT INTO Users (
        id, firstName, lastName, email, password, role, 
        vehicleTypeAccess, permissions, preferences, 
        isActive, loginAttempts, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?
      )
    `, {
      replacements: [
        userId,
        'Admin',
        'Sistema', 
        adminEmail,
        hashedPassword,
        'super_admin',
        JSON.stringify(['Tractor', 'Camión', 'Furgoneta', 'Coche', 'Motocicleta', 'Remolque', 'Maquinaria', 'Otro']),
        JSON.stringify({
          companies: { create: true, read: true, update: true, delete: true },
          branches: { create: true, read: true, update: true, delete: true },
          vehicles: { create: true, read: true, update: true, delete: true },
          maintenance: { create: true, read: true, update: true, delete: true },
          users: { create: true, read: true, update: true, delete: true },
          reports: { read: true, export: true }
        }),
        JSON.stringify({
          language: 'es',
          timezone: 'Europe/Madrid',
          notifications: { email: true, push: true, sms: false },
          dashboard: { defaultView: 'overview', itemsPerPage: 10 }
        }),
        1, // isActive
        0, // loginAttempts
        now,
        now
      ]
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
      'DELETE FROM Users WHERE email = ?',
      { replacements: [adminEmail] }
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