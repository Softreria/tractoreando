/**
 * SCRIPT TEMPORAL DE DIAGNÓSTICO
 * Archivo: temp-diagnostic.js
 * Propósito: Diagnosticar problemas en producción
 * ELIMINAR DESPUÉS DE SOLUCIONAR EL PROBLEMA
 */

const mongoose = require('mongoose');
const User = require('./models/User');
const Company = require('./models/Company');
const bcrypt = require('bcryptjs');

async function fullDiagnostic() {
  console.log('🔍 === DIAGNÓSTICO COMPLETO TRACTOREANDO ===');
  console.log('⏰ Fecha:', new Date().toISOString());
  console.log('');

  try {
    // 1. Verificar variables de entorno
    console.log('📋 1. VARIABLES DE ENTORNO:');
    console.log('   NODE_ENV:', process.env.NODE_ENV || '❌ NO DEFINIDO');
    console.log('   PORT:', process.env.PORT || '❌ NO DEFINIDO');
    console.log('   MONGODB_URI:', process.env.MONGODB_URI ? '✅ Configurado' : '❌ NO CONFIGURADO');
    console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ Configurado' : '❌ NO CONFIGURADO');
    console.log('   DEFAULT_ADMIN_EMAIL:', process.env.DEFAULT_ADMIN_EMAIL || '❌ NO DEFINIDO');
    console.log('   DEFAULT_ADMIN_PASSWORD:', process.env.DEFAULT_ADMIN_PASSWORD ? '✅ Configurado' : '❌ NO CONFIGURADO');
    console.log('   FRONTEND_URL:', process.env.FRONTEND_URL || '❌ NO DEFINIDO');
    console.log('   BACKEND_URL:', process.env.BACKEND_URL || '❌ NO DEFINIDO');
    console.log('   CORS_ORIGIN:', process.env.CORS_ORIGIN || '❌ NO DEFINIDO');
    console.log('');

    // 2. Conectar a MongoDB
    console.log('🔌 2. CONEXIÓN A MONGODB:');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando');
    console.log('   ✅ Conexión exitosa a MongoDB');
    console.log('');

    // 3. Verificar usuarios
    console.log('👥 3. USUARIOS EN BASE DE DATOS:');
    const users = await User.find();
    console.log(`   📊 Total usuarios: ${users.length}`);
    
    if (users.length > 0) {
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. Email: ${user.email}, Rol: ${user.role}, Activo: ${user.isActive}`);
      });
    } else {
      console.log('   ⚠️  No hay usuarios en la base de datos');
    }
    console.log('');

    // 4. Verificar admin específico
    console.log('👤 4. USUARIO ADMINISTRADOR:');
    const admin = await User.findOne({ email: 'admin@tractoreando.com' });
    if (admin) {
      console.log('   ✅ Admin encontrado');
      console.log('   📧 Email:', admin.email);
      console.log('   🔑 Rol:', admin.role);
      console.log('   ✅ Activo:', admin.isActive);
      console.log('   🏢 Empresa ID:', admin.company);
      console.log('   📅 Creado:', admin.createdAt);
      
      // Verificar contraseña
      try {
        const passwordMatch = await bcrypt.compare('admin123!', admin.password);
        console.log('   🔐 Contraseña válida:', passwordMatch ? '✅ Sí' : '❌ No');
      } catch (error) {
        console.log('   🔐 Error verificando contraseña:', error.message);
      }
    } else {
      console.log('   ❌ Admin NO encontrado');
    }
    console.log('');

    // 5. Verificar empresas
    console.log('🏢 5. EMPRESAS EN BASE DE DATOS:');
    const companies = await Company.find();
    console.log(`   📊 Total empresas: ${companies.length}`);
    
    if (companies.length > 0) {
      companies.forEach((company, index) => {
        console.log(`   ${index + 1}. Nombre: ${company.name}, CIF: ${company.cif}`);
      });
    } else {
      console.log('   ⚠️  No hay empresas en la base de datos');
    }
    console.log('');

    // 6. Verificar índices de base de datos
    console.log('📇 6. ÍNDICES DE BASE DE DATOS:');
    const userIndexes = await User.collection.getIndexes();
    console.log('   Índices de usuarios:', Object.keys(userIndexes).join(', '));
    console.log('');

    console.log('✅ === DIAGNÓSTICO COMPLETADO ===');
    
  } catch (error) {
    console.error('❌ ERROR EN DIAGNÓSTICO:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar diagnóstico
if (require.main === module) {
  fullDiagnostic()
    .then(() => {
      console.log('\n🎯 Diagnóstico finalizado. Revisa los resultados arriba.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { fullDiagnostic };