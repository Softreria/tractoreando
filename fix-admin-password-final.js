#!/usr/bin/env node

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Company = require('./models/Company');

async function fixAdminPasswordFinal() {
  try {
    console.log('🔧 REPARACIÓN FINAL DEL USUARIO ADMIN');
    console.log('====================================');
    
    // Conectar a MongoDB
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Verificar variables de entorno
    console.log('\n📋 VARIABLES DE ENTORNO:');
    console.log(`   DEFAULT_ADMIN_EMAIL: ${process.env.DEFAULT_ADMIN_EMAIL}`);
    console.log(`   DEFAULT_ADMIN_PASSWORD: ${process.env.DEFAULT_ADMIN_PASSWORD}`);
    
    if (!process.env.DEFAULT_ADMIN_EMAIL || !process.env.DEFAULT_ADMIN_PASSWORD) {
      throw new Error('Variables de entorno faltantes');
    }
    
    // Buscar empresa admin
    console.log('\n🏢 BUSCANDO EMPRESA ADMIN...');
    let adminCompany = await Company.findOne({ name: 'Tractoreando Admin' });
    
    if (!adminCompany) {
      console.log('   ⚠️  Empresa admin no encontrada, creando...');
      adminCompany = new Company({
        name: 'Tractoreando Admin',
        cif: 'A12345678',
        contact: {
          email: process.env.DEFAULT_ADMIN_EMAIL,
          phone: '+34000000000'
        },
        address: {
          street: 'Calle Admin 1',
          city: 'Madrid',
          country: 'España'
        },
        isActive: true
      });
      await adminCompany.save();
      console.log('   ✅ Empresa admin creada');
    } else {
      console.log('   ✅ Empresa admin encontrada');
    }
    
    // Buscar usuario admin existente
    console.log('\n👤 PROCESANDO USUARIO ADMIN...');
    const existingAdmin = await User.findOne({ email: process.env.DEFAULT_ADMIN_EMAIL });
    
    if (existingAdmin) {
      console.log('   📍 Usuario admin existente encontrado');
      console.log(`   ID: ${existingAdmin._id}`);
      console.log(`   Hash actual: ${existingAdmin.password}`);
      
      // Probar contraseña actual
      const currentPasswordWorks = await existingAdmin.comparePassword(process.env.DEFAULT_ADMIN_PASSWORD);
      console.log(`   Contraseña actual funciona: ${currentPasswordWorks ? '✅ SÍ' : '❌ NO'}`);
      
      if (!currentPasswordWorks) {
        console.log('   🔧 Regenerando hash de contraseña...');
        
        // Generar nuevo hash manualmente
        const saltRounds = 10;
        const newHash = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD, saltRounds);
        console.log(`   Nuevo hash: ${newHash}`);
        
        // Actualizar directamente en la base de datos (evitando middleware)
        await User.updateOne(
          { _id: existingAdmin._id },
          { $set: { password: newHash } }
        );
        
        console.log('   ✅ Hash actualizado directamente en BD');
        
        // Verificar la actualización
        const updatedUser = await User.findById(existingAdmin._id);
        const newPasswordWorks = await updatedUser.comparePassword(process.env.DEFAULT_ADMIN_PASSWORD);
        console.log(`   Nueva contraseña funciona: ${newPasswordWorks ? '✅ SÍ' : '❌ NO'}`);
        
        if (newPasswordWorks) {
          console.log('   🎉 ¡Contraseña reparada exitosamente!');
        } else {
          throw new Error('La reparación de contraseña falló');
        }
      } else {
        console.log('   ✅ La contraseña ya funciona correctamente');
      }
    } else {
      console.log('   ⚠️  Usuario admin no encontrado, creando nuevo...');
      
      // Crear nuevo usuario admin
      const newAdmin = new User({
        firstName: 'Administrador',
        lastName: 'Sistema',
        email: process.env.DEFAULT_ADMIN_EMAIL,
        password: process.env.DEFAULT_ADMIN_PASSWORD, // El middleware lo hasheará
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
      
      await newAdmin.save();
      console.log('   ✅ Nuevo usuario admin creado');
      
      // Verificar el nuevo usuario
      const savedAdmin = await User.findOne({ email: process.env.DEFAULT_ADMIN_EMAIL });
      const passwordWorks = await savedAdmin.comparePassword(process.env.DEFAULT_ADMIN_PASSWORD);
      console.log(`   Contraseña del nuevo usuario funciona: ${passwordWorks ? '✅ SÍ' : '❌ NO'}`);
    }
    
    // Prueba final de login
    console.log('\n🔐 PRUEBA FINAL DE LOGIN:');
    const finalUser = await User.findOne({ email: process.env.DEFAULT_ADMIN_EMAIL });
    
    if (finalUser) {
      const loginSuccess = await finalUser.comparePassword(process.env.DEFAULT_ADMIN_PASSWORD);
      console.log(`   Email: ${finalUser.email}`);
      console.log(`   Login exitoso: ${loginSuccess ? '✅ SÍ' : '❌ NO'}`);
      
      if (loginSuccess) {
        console.log('\n🎉 ¡REPARACIÓN COMPLETADA EXITOSAMENTE!');
        console.log('   El usuario admin ahora puede hacer login correctamente.');
        console.log(`   Email: ${process.env.DEFAULT_ADMIN_EMAIL}`);
        console.log(`   Password: ${process.env.DEFAULT_ADMIN_PASSWORD}`);
      } else {
        throw new Error('La prueba final de login falló');
      }
    } else {
      throw new Error('No se pudo encontrar el usuario admin después de la reparación');
    }
    
    console.log('\n🔌 Desconectando de MongoDB...');
    await mongoose.disconnect();
    console.log('✅ Desconectado');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAdminPasswordFinal();