#!/usr/bin/env node

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Company = require('./models/Company');

async function fixAdminFinalDefinitivo() {
  try {
    console.log('🚀 SOLUCIÓN FINAL DEFINITIVA - USUARIO ADMIN');
    console.log('==========================================');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@tractoreando.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123!';
    
    console.log(`📧 Email admin: ${adminEmail}`);
    console.log(`🔑 Password admin: ${adminPassword}`);
    
    // PASO 1: Eliminar TODOS los datos de companies y users
    console.log('\n🧹 LIMPIEZA TOTAL DE BASE DE DATOS...');
    await User.deleteMany({});
    await Company.deleteMany({});
    console.log('✅ Todos los usuarios y empresas eliminados');
    
    // PASO 2: Eliminar índices conflictivos
    console.log('\n🗂️ ELIMINANDO ÍNDICES CONFLICTIVOS...');
    try {
      await Company.collection.dropIndex('cif_1');
      console.log('✅ Índice cif_1 eliminado');
    } catch (e) {
      console.log('ℹ️ Índice cif_1 no existía');
    }
    
    try {
      await Company.collection.dropIndex('rfc_1');
      console.log('✅ Índice rfc_1 eliminado');
    } catch (e) {
      console.log('ℹ️ Índice rfc_1 no existía');
    }
    
    // PASO 3: Insertar directamente en la base de datos sin usar el modelo
    console.log('\n🏢 CREANDO EMPRESA ADMIN DIRECTAMENTE...');
    
    const companyId = new mongoose.Types.ObjectId();
    const companyDoc = {
      _id: companyId,
      name: 'Tractoreando Admin',
      rfc: 'A12345678',
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
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await mongoose.connection.db.collection('companies').insertOne(companyDoc);
    console.log('✅ Empresa admin creada directamente en BD');
    
    // PASO 4: Crear usuario admin directamente
    console.log('\n👤 CREANDO USUARIO ADMIN DIRECTAMENTE...');
    
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const userId = new mongoose.Types.ObjectId();
    
    const userDoc = {
      _id: userId,
      firstName: 'Administrador',
      lastName: 'Sistema',
      email: adminEmail,
      password: hashedPassword,
      phone: '+34000000000',
      company: companyId,
      role: 'super_admin',
      isActive: true,
      isLocked: false,
      permissions: {
        users: { create: true, read: true, update: true, delete: true },
        companies: { create: true, read: true, update: true, delete: true },
        vehicles: { create: true, read: true, update: true, delete: true },
        maintenance: { create: true, read: true, update: true, delete: true },
        reports: { create: true, read: true, update: true, delete: true }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await mongoose.connection.db.collection('users').insertOne(userDoc);
    console.log('✅ Usuario admin creado directamente en BD');
    
    // PASO 5: Verificar con bcrypt directo
    console.log('\n🔍 VERIFICANDO FUNCIONAMIENTO...');
    
    const createdUser = await mongoose.connection.db.collection('users').findOne({ email: adminEmail });
    const createdCompany = await mongoose.connection.db.collection('companies').findOne({ _id: companyId });
    
    if (!createdUser || !createdCompany) {
      throw new Error('Usuario o empresa no encontrados después de creación');
    }
    
    console.log(`📍 Usuario encontrado: ${createdUser.email}`);
    console.log(`🏢 Empresa: ${createdCompany.name} (RFC: ${createdCompany.rfc})`);
    console.log(`🔐 Hash en BD: ${createdUser.password}`);
    
    // Verificar contraseña con bcrypt directo
    const passwordMatch = await bcrypt.compare(adminPassword, createdUser.password);
    console.log(`🔍 Contraseña válida: ${passwordMatch ? '✅ SÍ' : '❌ NO'}`);
    
    console.log(`👤 Usuario activo: ${createdUser.isActive ? '✅ SÍ' : '❌ NO'}`);
    console.log(`🏢 Empresa activa: ${createdCompany.isActive ? '✅ SÍ' : '❌ NO'}`);
    console.log(`🔒 Usuario bloqueado: ${createdUser.isLocked ? '❌ SÍ' : '✅ NO'}`);
    
    if (passwordMatch && createdUser.isActive && createdCompany.isActive && !createdUser.isLocked) {
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

fixAdminFinalDefinitivo();