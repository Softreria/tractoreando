const bcrypt = require('bcryptjs');
const { sequelize } = require('./config/database');
require('dotenv').config();

// Importar modelos
const User = require('./models/User');
const Company = require('./models/Company');
const Branch = require('./models/Branch');

const createAdminProduction = async () => {
  try {
    console.log('🚀 Iniciando creación de usuario administrador para PRODUCCIÓN...');
    console.log('📋 Configuración de base de datos:');
    console.log(`   - Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   - Puerto: ${process.env.DB_PORT || 5432}`);
    console.log(`   - Base de datos: ${process.env.DB_NAME || 'tractoreando'}`);
    console.log(`   - Usuario: ${process.env.DB_USER || 'postgres'}`);
    console.log('');
    
    // Conectar a PostgreSQL
    console.log('🔌 Conectando a PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL exitosamente');
    
    // Sincronizar modelos sin forzar
    console.log('🔄 Sincronizando modelos...');
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Modelos sincronizados');

    // Verificar si ya existe un usuario administrador
    console.log('🔍 Verificando usuarios administradores existentes...');
    const existingAdmin = await User.findOne({ where: { role: 'super_admin' } });
    if (existingAdmin) {
      console.log('⚠️  Ya existe un usuario administrador:');
      console.log(`📧 Email: ${existingAdmin.email}`);
      console.log('🔄 Para recrear el administrador, elimina primero el existente.');
      process.exit(0);
    }

    // Crear empresa administradora
    console.log('🏢 Creando empresa administradora...');
    const adminCompany = await Company.create({
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

    console.log('✅ Empresa administradora creada exitosamente');

    // Crear delegación principal
    console.log('🏪 Creando delegación principal...');
    const mainBranch = await Branch.create({
      name: 'Sede Principal',
      companyId: adminCompany.id,
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

    console.log('✅ Delegación principal creada exitosamente');

    // Crear usuario administrador
    console.log('👤 Creando usuario administrador...');
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const adminUser = await User.create({
      name: 'Administrador',
      lastName: 'Sistema',
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@tractoreando.com',
      password: hashedPassword,
      role: 'super_admin',
      companyId: adminCompany.id,
      branchId: mainBranch.id,
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

    console.log('✅ Usuario administrador creado exitosamente');

    // Actualizar empresa con el administrador
    console.log('🔄 Actualizando empresa con administrador...');
    await adminCompany.update({ admin: adminUser.id });
    console.log('✅ Empresa actualizada con administrador');

    // Verificación final
    console.log('🔍 Realizando verificación final...');
    const verifyAdmin = await User.findOne({
      where: { id: adminUser.id },
      include: [
        { model: Company, as: 'company' },
        { model: Branch, as: 'branch' }
      ]
    });

    if (verifyAdmin) {
      console.log('\n🎉 ¡Inicialización completada exitosamente!');
      console.log('\n📋 Credenciales de acceso para PRODUCCIÓN:');
      console.log(`📧 Email: ${verifyAdmin.email}`);
      console.log(`🔑 Contraseña: ${adminPassword}`);
      console.log(`🏢 Empresa: ${verifyAdmin.company.name}`);
      console.log(`🏪 Delegación: ${verifyAdmin.branch.name}`);
      console.log(`🆔 ID Usuario: ${verifyAdmin.id}`);
      console.log('\n⚠️  IMPORTANTE: ');
      console.log('   - Cambia la contraseña después del primer acceso');
      console.log('   - Guarda estas credenciales en un lugar seguro');
      console.log('   - El sistema está listo para producción');
    } else {
      console.log('❌ Error en la verificación final');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error durante la inicialización:', error.message);
    console.error('📋 Detalles del error:', error);
    
    // Información adicional para debugging
    if (error.name === 'SequelizeConnectionError') {
      console.error('\n🔧 Error de conexión a PostgreSQL detectado');
      
      // Verificar si es un error de autenticación específico
      if (error.message.includes('password authentication failed')) {
        console.error('\n🚨 ERROR DE AUTENTICACIÓN:');
        console.error('   El usuario "tractoreando_user" no puede autenticarse');
        console.error('\n💡 Soluciones recomendadas:');
        console.error('   1. Verificar que el usuario existe:');
        console.error('      sudo -u postgres psql -c "\\du"');
        console.error('   2. Recrear el usuario con la contraseña correcta:');
        console.error('      sudo -u postgres psql -c "DROP USER IF EXISTS tractoreando_user;"');
        console.error('      sudo -u postgres psql -c "CREATE USER tractoreando_user WITH PASSWORD \'tractoreando123\';"');
        console.error('   3. Verificar configuración de pg_hba.conf:');
        console.error('      sudo nano /etc/postgresql/*/main/pg_hba.conf');
        console.error('      Debe contener: local   tractoreando    tractoreando_user                     md5');
        console.error('   4. Reiniciar PostgreSQL después de cambios:');
        console.error('      sudo systemctl restart postgresql');
        console.error('   5. Probar conexión manual:');
        console.error('      PGPASSWORD=\'tractoreando123\' psql -h localhost -U tractoreando_user -d tractoreando');
      } else {
        console.error('\n🔧 Posibles soluciones generales:');
        console.error('   1. Verificar que PostgreSQL esté ejecutándose: sudo systemctl status postgresql');
        console.error('   2. Verificar credenciales en el archivo .env');
        console.error('   3. Verificar que la base de datos "tractoreando" exista');
        console.error('   4. Verificar permisos del usuario "tractoreando_user"');
      }
    }
    
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
      console.log('\n🔌 Conexión a PostgreSQL cerrada');
    } catch (closeError) {
      console.error('⚠️  Error al cerrar conexión:', closeError.message);
    }
    process.exit(0);
  }
};

// Ejecutar inicialización
if (require.main === module) {
  createAdminProduction();
}

module.exports = createAdminProduction;