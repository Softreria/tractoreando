const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Company = require('./models/Company');
require('dotenv').config();

async function testLogin() {
  console.log('🔧 === TEST DE LOGIN DIRECTO ===');
  console.log('⏰ Fecha:', new Date().toISOString());
  
  try {
    // 1. Conectar a MongoDB
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando');
    console.log('✅ Conectado a MongoDB');
    
    // 2. Verificar variables de entorno críticas
    console.log('\n🔍 VERIFICANDO VARIABLES DE ENTORNO:');
    console.log('NODE_ENV:', process.env.NODE_ENV || '❌ NO DEFINIDO');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Configurado' : '❌ NO CONFIGURADO');
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Configurado' : '❌ NO CONFIGURADO');
    
    // 3. Buscar usuario admin
    console.log('\n👤 BUSCANDO USUARIO ADMIN...');
    const adminEmail = 'admin@tractoreando.com';
    const adminPassword = 'admin123!';
    
    const user = await User.findOne({ email: adminEmail })
      .populate('company', 'name rfc isActive');
    
    if (!user) {
      console.log('❌ Usuario admin no encontrado');
      return;
    }
    
    console.log('✅ Usuario encontrado:');
    console.log('   📧 Email:', user.email);
    console.log('   🔑 Rol:', user.role);
    console.log('   ✅ Activo:', user.isActive);
    console.log('   🏢 Empresa:', user.company ? user.company.name : 'Sin empresa');
    console.log('   🔒 Bloqueado:', user.isLocked);
    console.log('   🔢 Intentos login:', user.loginAttempts || 0);
    
    // 4. Verificar si está bloqueado
    if (user.isLocked) {
      console.log('❌ USUARIO BLOQUEADO');
      console.log('   🕐 Bloqueado hasta:', user.lockUntil);
      return;
    }
    
    // 5. Verificar si está activo
    if (!user.isActive) {
      console.log('❌ USUARIO INACTIVO');
      return;
    }
    
    // 6. Verificar empresa (solo para no super_admin)
    if (user.role !== 'super_admin' && (!user.company || !user.company.isActive)) {
      console.log('❌ EMPRESA INACTIVA O NO ASIGNADA');
      return;
    }
    
    // 7. Test de contraseña
    console.log('\n🔐 PROBANDO CONTRASEÑA...');
    console.log('   🔑 Contraseña a probar:', adminPassword);
    console.log('   🗝️  Hash almacenado:', user.password.substring(0, 20) + '...');
    
    // Probar con bcrypt directamente
    const isMatchDirect = await bcrypt.compare(adminPassword, user.password);
    console.log('   🔍 Comparación directa bcrypt:', isMatchDirect ? '✅ VÁLIDA' : '❌ INVÁLIDA');
    
    // Probar con método del modelo
    const isMatchModel = await user.comparePassword(adminPassword);
    console.log('   🔍 Método del modelo:', isMatchModel ? '✅ VÁLIDA' : '❌ INVÁLIDA');
    
    // 8. Test de JWT
    console.log('\n🎫 PROBANDO GENERACIÓN DE JWT...');
    if (!process.env.JWT_SECRET) {
      console.log('❌ JWT_SECRET no configurado');
      return;
    }
    
    try {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
      console.log('✅ JWT generado correctamente');
      console.log('   🎫 Token:', token.substring(0, 50) + '...');
      
      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ JWT verificado correctamente');
      console.log('   🆔 User ID:', decoded.id);
    } catch (jwtError) {
      console.log('❌ Error con JWT:', jwtError.message);
    }
    
    // 9. Simular login completo
    console.log('\n🚀 SIMULANDO LOGIN COMPLETO...');
    
    if (isMatchModel) {
      console.log('✅ LOGIN EXITOSO - Todos los checks pasaron');
      console.log('\n📋 RESUMEN:');
      console.log('   ✅ Usuario existe');
      console.log('   ✅ Usuario activo');
      console.log('   ✅ No bloqueado');
      console.log('   ✅ Contraseña válida');
      console.log('   ✅ JWT funcional');
      console.log('   ✅ Empresa válida (si aplica)');
    } else {
      console.log('❌ LOGIN FALLIDO - Contraseña incorrecta');
      
      // Intentar con contraseñas alternativas
      console.log('\n🔄 PROBANDO CONTRASEÑAS ALTERNATIVAS...');
      const altPasswords = ['admin123', 'admin', 'password', '123456'];
      
      for (const altPass of altPasswords) {
        const altMatch = await bcrypt.compare(altPass, user.password);
        console.log(`   🔑 "${altPass}":`, altMatch ? '✅ VÁLIDA' : '❌ INVÁLIDA');
        if (altMatch) break;
      }
    }
    
  } catch (error) {
    console.error('💥 Error en test de login:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    console.log('\n🔌 Desconectando de MongoDB...');
    await mongoose.disconnect();
    console.log('✅ Desconectado');
  }
}

// Ejecutar test
testLogin().then(() => {
  console.log('\n🎉 Test de login completado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});