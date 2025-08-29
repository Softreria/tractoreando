const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Importar modelos
const User = require('./models/User');
const Company = require('./models/Company');

async function finalFix() {
  try {
    console.log('🔧 REPARACIÓN FINAL DEL LOGIN');
    console.log('================================');
    
    // Conectar a MongoDB
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Verificar variables de entorno críticas
    console.log('\n🔍 VERIFICANDO VARIABLES DE ENTORNO:');
    const requiredVars = {
      'NODE_ENV': process.env.NODE_ENV,
      'JWT_SECRET': process.env.JWT_SECRET,
      'MONGODB_URI': process.env.MONGODB_URI,
      'DEFAULT_ADMIN_EMAIL': process.env.DEFAULT_ADMIN_EMAIL,
      'DEFAULT_ADMIN_PASSWORD': process.env.DEFAULT_ADMIN_PASSWORD
    };
    
    let allVarsOk = true;
    for (const [key, value] of Object.entries(requiredVars)) {
      if (value) {
        console.log(`   ${key}: ✅ Configurado`);
      } else {
        console.log(`   ${key}: ❌ NO CONFIGURADO`);
        allVarsOk = false;
      }
    }
    
    if (!allVarsOk) {
      console.log('\n❌ Faltan variables de entorno críticas');
      return;
    }
    
    // Buscar empresa admin
    console.log('\n🏢 VERIFICANDO EMPRESA ADMIN...');
    let adminCompany = await Company.findOne({ name: 'Tractoreando Admin' });
    
    if (!adminCompany) {
      console.log('   📝 Creando empresa admin...');
      adminCompany = new Company({
        name: 'Tractoreando Admin',
        email: 'admin@tractoreando.com',
        phone: '+34000000000',
        address: 'Oficina Central',
        isActive: true
      });
      await adminCompany.save();
      console.log('   ✅ Empresa admin creada');
    } else {
      console.log('   ✅ Empresa admin encontrada');
    }
    
    // Eliminar usuario admin existente
    console.log('\n👤 REGENERANDO USUARIO ADMIN...');
    await User.deleteOne({ email: process.env.DEFAULT_ADMIN_EMAIL });
    console.log('   🗑️  Usuario admin anterior eliminado');
    
    // Generar hash de contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD, saltRounds);
    console.log('   🔐 Nueva contraseña hasheada generada');
    
    // Crear nuevo usuario admin
    const newAdmin = new User({
      name: 'Administrador',
      lastName: 'Sistema',
      email: process.env.DEFAULT_ADMIN_EMAIL,
      password: hashedPassword,
      phone: '+34000000000',
      company: adminCompany._id,
      role: 'super_admin',
      isActive: true,
      permissions: {
        users: { create: true, read: true, update: true, delete: true },
        companies: { create: true, read: true, update: true, delete: true },
        vehicles: { create: true, read: true, update: true, delete: true },
        maintenance: { create: true, read: true, update: true, delete: true },
        reports: { create: true, read: true, update: true, delete: true },
        branches: { create: true, read: true, update: true, delete: true }
      }
    });
    
    await newAdmin.save();
    console.log('   ✅ Nuevo usuario admin creado');
    
    // Verificar usuario creado
    const verifyUser = await User.findOne({ email: process.env.DEFAULT_ADMIN_EMAIL }).populate('company');
    console.log('\n🔍 VERIFICACIÓN DEL USUARIO:');
    console.log(`   📧 Email: ${verifyUser.email}`);
    console.log(`   🔑 Rol: ${verifyUser.role}`);
    console.log(`   ✅ Activo: ${verifyUser.isActive}`);
    console.log(`   🏢 Empresa: ${verifyUser.company.name}`);
    console.log(`   🔒 Bloqueado: ${verifyUser.isLocked}`);
    
    // Probar comparación de contraseña
    console.log('\n🔐 PROBANDO CONTRASEÑA...');
    const passwordMatch1 = await bcrypt.compare(process.env.DEFAULT_ADMIN_PASSWORD, verifyUser.password);
    const passwordMatch2 = await verifyUser.comparePassword(process.env.DEFAULT_ADMIN_PASSWORD);
    
    console.log(`   🔍 Comparación directa bcrypt: ${passwordMatch1 ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    console.log(`   🔍 Método del modelo: ${passwordMatch2 ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    
    // Probar generación de JWT
    console.log('\n🎫 PROBANDO GENERACIÓN DE JWT...');
    try {
      const testPayload = {
        userId: verifyUser._id,
        email: verifyUser.email,
        role: verifyUser.role,
        company: verifyUser.company._id
      };
      
      const token = jwt.sign(testPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
      console.log('   ✅ JWT generado correctamente');
      
      // Verificar JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('   ✅ JWT verificado correctamente');
      console.log(`   👤 Usuario en token: ${decoded.email}`);
      
    } catch (jwtError) {
      console.log('   ❌ Error con JWT:', jwtError.message);
    }
    
    // Simular proceso completo de login
    console.log('\n🚀 SIMULANDO PROCESO DE LOGIN...');
    try {
      // 1. Buscar usuario
      const loginUser = await User.findOne({ email: process.env.DEFAULT_ADMIN_EMAIL }).populate('company');
      if (!loginUser) {
        console.log('   ❌ Usuario no encontrado');
        return;
      }
      
      // 2. Verificar si está activo
      if (!loginUser.isActive) {
        console.log('   ❌ Usuario inactivo');
        return;
      }
      
      // 3. Verificar si está bloqueado
      if (loginUser.isLocked) {
        console.log('   ❌ Usuario bloqueado');
        return;
      }
      
      // 4. Verificar empresa activa
      if (!loginUser.company.isActive) {
        console.log('   ❌ Empresa inactiva');
        return;
      }
      
      // 5. Comparar contraseña
      const isPasswordValid = await loginUser.comparePassword(process.env.DEFAULT_ADMIN_PASSWORD);
      if (!isPasswordValid) {
        console.log('   ❌ Contraseña inválida');
        return;
      }
      
      // 6. Generar token
      const tokenPayload = {
        userId: loginUser._id,
        email: loginUser.email,
        role: loginUser.role,
        company: loginUser.company._id,
        permissions: loginUser.permissions
      };
      
      const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
      
      console.log('   ✅ PROCESO DE LOGIN EXITOSO');
      console.log('   🎫 Token generado correctamente');
      
    } catch (loginError) {
      console.log('   ❌ Error en simulación de login:', loginError.message);
    }
    
    console.log('\n🎉 REPARACIÓN COMPLETADA');
    console.log('================================');
    console.log('📋 CREDENCIALES DE LOGIN:');
    console.log(`   📧 Email: ${process.env.DEFAULT_ADMIN_EMAIL}`);
    console.log(`   🔑 Contraseña: ${process.env.DEFAULT_ADMIN_PASSWORD}`);
    console.log('\n⚠️  IMPORTANTE:');
    console.log('   1. Reinicia el servidor para cargar las nuevas variables de entorno');
    console.log('   2. Asegúrate de que el archivo .env.production esté en la raíz del proyecto');
    console.log('   3. Verifica que el servidor esté leyendo el archivo .env.production');
    
  } catch (error) {
    console.error('❌ Error en reparación final:', error);
  } finally {
    // Desconectar de MongoDB
    console.log('\n🔌 Desconectando de MongoDB...');
    await mongoose.disconnect();
    console.log('✅ Desconectado');
  }
}

// Ejecutar reparación
finalFix();