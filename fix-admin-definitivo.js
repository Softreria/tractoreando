#!/usr/bin/env node

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Company = require('./models/Company');

async function fixAdminDefinitivo() {
  try {
    console.log('🚀 SOLUCIÓN DEFINITIVA - USUARIO ADMIN');
    console.log('=====================================');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Variables de entorno
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@tractoreando.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123!';
    
    console.log(`📧 Email admin: ${adminEmail}`);
    console.log(`🔑 Password admin: ${adminPassword}`);
    
    // PASO 1: Limpiar todo lo existente
    console.log('\n🧹 LIMPIANDO DATOS EXISTENTES...');
    await User.deleteMany({ email: adminEmail });
    await Company.deleteMany({ name: 'Tractoreando Admin' });
    console.log('✅ Datos anteriores eliminados');
    
    // PASO 2: Crear empresa admin con estructura correcta
    console.log('\n🏢 CREANDO EMPRESA ADMIN...');
    const adminCompany = new Company({
      name: 'Tractoreando Admin',
      cif: 'A12345678', // Usando CIF, no RFC
      contact: {
        email: adminEmail,
        phone: '+34000000000'
      },
      address: {
        street: 'Calle Principal 1',
        city: 'Madrid',
        state: 'Madrid',
        zipCode: '28001',
        country: 'España'
      },
      isActive: true
    });
    
    await adminCompany.save();
    console.log('✅ Empresa admin creada con CIF correcto');
    
    // PASO 3: Crear usuario admin
    console.log('\n👤 CREANDO USUARIO ADMIN...');
    
    const adminUser = new User({
      firstName: 'Administrador', // Usando firstName, no name
      lastName: 'Sistema',
      email: adminEmail,
      password: adminPassword, // Sin hashear, el middleware lo hará
      phone: '+34000000000',
      company: adminCompany._id,
      role: 'super_admin',
      isActive: true,
      permissions: {
        users: { create: true, read: true, update: true, delete: true },
        companies: { create: true, read: true, update: true, delete: true },
        vehicles: { create: true, read: true, update: true, delete: true },
        maintenance: { create: true, read: true, update: true, delete: true },
        reports: { create: true, read: true, update: true, delete: true }
      }
    });
    
    await adminUser.save();
    console.log('✅ Usuario admin creado');
    
    // PASO 4: Verificar que todo funciona
    console.log('\n🔍 VERIFICANDO FUNCIONAMIENTO...');
    
    const createdUser = await User.findOne({ email: adminEmail })
      .populate('company', 'name cif isActive'); // Usando populate correcto
    
    if (!createdUser) {
      throw new Error('Usuario no encontrado después de creación');
    }
    
    console.log(`📍 Usuario encontrado: ${createdUser.email}`);
    console.log(`🏢 Empresa: ${createdUser.company.name} (CIF: ${createdUser.company.cif})`);
    console.log(`🔐 Hash en BD: ${createdUser.password}`);
    
    // Probar comparación de contraseña
    const passwordMatch = await createdUser.comparePassword(adminPassword);
    console.log(`🔍 Contraseña válida: ${passwordMatch ? '✅ SÍ' : '❌ NO'}`);
    
    // Verificar estado del usuario
    console.log(`👤 Usuario activo: ${createdUser.isActive ? '✅ SÍ' : '❌ NO'}`);
    console.log(`🏢 Empresa activa: ${createdUser.company.isActive ? '✅ SÍ' : '❌ NO'}`);
    console.log(`🔒 Usuario bloqueado: ${createdUser.isLocked ? '❌ SÍ' : '✅ NO'}`);
    
    if (passwordMatch && createdUser.isActive && createdUser.company.isActive && !createdUser.isLocked) {
      console.log('\n🎉 ¡ÉXITO TOTAL!');
      console.log('✅ Usuario admin creado correctamente');
      console.log('✅ Contraseña funciona');
      console.log('✅ Usuario y empresa activos');
      console.log('✅ Login debería funcionar ahora');
      console.log('\n📋 CREDENCIALES FINALES:');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log('\n🔧 PRÓXIMOS PASOS:');
      console.log('   1. Reinicia PM2: pm2 restart all');
      console.log('   2. Prueba el login en la aplicación');
    } else {
      throw new Error('Verificación falló - revisar configuración');
    }
    
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixAdminDefinitivo();