/**
 * SCRIPT TEMPORAL DE CORRECCIÓN DE ADMIN
 * Archivo: temp-fix-admin.js
 * Propósito: Recrear usuario administrador en producción
 * ELIMINAR DESPUÉS DE SOLUCIONAR EL PROBLEMA
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Company = require('./models/Company');

async function fixAdminUser() {
  console.log('🔧 === CORRECCIÓN DE USUARIO ADMIN ===');
  console.log('⏰ Fecha:', new Date().toISOString());
  console.log('');

  try {
    // 1. Conectar a MongoDB
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando');
    console.log('✅ Conectado a MongoDB');
    console.log('');

    // 2. Verificar si existe admin actual
    console.log('🔍 Verificando admin existente...');
    const existingAdmin = await User.findOne({ email: 'admin@tractoreando.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin existente encontrado. Eliminando...');
      await User.deleteOne({ email: 'admin@tractoreando.com' });
      console.log('✅ Admin anterior eliminado');
    } else {
      console.log('ℹ️  No se encontró admin existente');
    }
    console.log('');

    // 3. Crear o verificar empresa admin
    console.log('🏢 Configurando empresa admin...');
    let adminCompany = await Company.findOne({ cif: 'B12345678' });
    
    if (!adminCompany) {
      console.log('📝 Creando nueva empresa admin...');
      adminCompany = new Company({
        name: 'Tractoreando Admin',
        cif: 'B12345678',
        address: 'Madrid, España',
        phone: '+34 900 000 000',
        email: 'admin@tractoreando.com',
        delegation: 'Madrid Centro',
        isActive: true
      });
      await adminCompany.save();
      console.log('✅ Empresa admin creada:', adminCompany._id);
    } else {
      console.log('✅ Empresa admin existente:', adminCompany._id);
    }
    console.log('');

    // 4. Crear nuevo usuario admin
    console.log('👤 Creando nuevo usuario admin...');
    
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@tractoreando.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123!';
    
    console.log('📧 Email admin:', adminEmail);
    console.log('🔐 Contraseña configurada:', adminPassword ? 'Sí' : 'No');
    
    // Hashear contraseña
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    console.log('🧂 Salt rounds:', saltRounds);
    
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
    console.log('✅ Contraseña hasheada');
    
    // Crear usuario
    const newAdmin = new User({
      name: 'Administrador Sistema',
      email: adminEmail,
      password: hashedPassword,
      role: 'super_admin',
      company: adminCompany._id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newAdmin.save();
    console.log('✅ Nuevo admin creado:', newAdmin._id);
    console.log('');

    // 5. Verificar creación
    console.log('🔍 Verificando nuevo admin...');
    const verifyAdmin = await User.findOne({ email: adminEmail }).populate('company');
    
    if (verifyAdmin) {
      console.log('✅ Verificación exitosa:');
      console.log('   📧 Email:', verifyAdmin.email);
      console.log('   🔑 Rol:', verifyAdmin.role);
      console.log('   ✅ Activo:', verifyAdmin.isActive);
      console.log('   🏢 Empresa:', verifyAdmin.company?.name);
      
      // Verificar contraseña
      const passwordTest = await bcrypt.compare(adminPassword, verifyAdmin.password);
      console.log('   🔐 Contraseña funcional:', passwordTest ? '✅ Sí' : '❌ No');
    } else {
      console.log('❌ Error: No se pudo verificar el admin creado');
    }
    console.log('');

    // 6. Mostrar resumen
    console.log('📊 === RESUMEN DE CORRECCIÓN ===');
    const totalUsers = await User.countDocuments();
    const totalCompanies = await Company.countDocuments();
    console.log(`👥 Total usuarios: ${totalUsers}`);
    console.log(`🏢 Total empresas: ${totalCompanies}`);
    console.log('');
    
    console.log('✅ === CORRECCIÓN COMPLETADA ===');
    console.log('🎯 Ahora puedes intentar hacer login con:');
    console.log(`   📧 Email: ${adminEmail}`);
    console.log(`   🔐 Contraseña: ${adminPassword}`);
    
  } catch (error) {
    console.error('❌ ERROR EN CORRECCIÓN:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar corrección
if (require.main === module) {
  fixAdminUser()
    .then(() => {
      console.log('\n🎉 Corrección finalizada exitosamente!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal en corrección:', error);
      process.exit(1);
    });
}

module.exports = { fixAdminUser };