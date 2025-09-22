require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
});

const { sequelize, User } = require('./models');

const createAdmin = async () => {
  try {
    console.log('🔄 Conectando a la base de datos...');
    
    // Autenticar conexión
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida correctamente.');
    
    // Verificar si ya existe un usuario administrador
    const existingAdmin = await User.findOne({
      where: { email: 'admin@tractoreando.com' }
    });
    
    if (existingAdmin) {
      console.log('⚠️  El usuario administrador ya existe.');
      console.log('📧 Email: admin@tractoreando.com');
      console.log('🔑 Contraseña: admin123');
      return;
    }
    
    // Crear usuario administrador
    const adminUser = await User.create({
      firstName: 'Administrador',
      lastName: 'Sistema',
      email: 'admin@tractoreando.com',
      password: 'admin123',
      phone: '+34 000 000 000',
      role: 'super_admin',
      companyId: null,
      branchId: null,
      isActive: true,
      vehicleTypeAccess: [
        'Tractor', 'Camión', 'Furgoneta', 'Coche', 'Motocicleta', 'Remolque', 'Maquinaria', 'Otro'
      ]
    });
    
    console.log('🎉 Usuario administrador creado exitosamente!');
    console.log('📧 Email: admin@tractoreando.com');
    console.log('🔑 Contraseña: admin123');
    console.log('⚠️  IMPORTANTE: Cambiar la contraseña después del primer acceso');
    
  } catch (error) {
    console.error('❌ Error creando usuario administrador:', error);
    console.error('💥 Stack trace:', error.stack);
  } finally {
    await sequelize.close();
    console.log('🔒 Conexión cerrada.');
    process.exit(0);
  }
};

// Ejecutar creación
createAdmin();