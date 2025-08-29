#!/usr/bin/env node

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Company = require('./models/Company');

async function fixAdminComplete() {
  try {
    console.log('🔧 REPARACIÓN COMPLETA DEL ADMIN');
    console.log('=================================');
    
    // Conectar a MongoDB
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Verificar variables de entorno
    console.log('\n🔍 VERIFICANDO VARIABLES:');
    if (!process.env.DEFAULT_ADMIN_EMAIL || !process.env.DEFAULT_ADMIN_PASSWORD) {
      throw new Error('Variables de entorno faltantes');
    }
    console.log(`   ✅ Email: ${process.env.DEFAULT_ADMIN_EMAIL}`);
    console.log(`   ✅ Password configurado (${process.env.DEFAULT_ADMIN_PASSWORD.length} caracteres)`);
    
    // PASO 1: Limpiar completamente
    console.log('\n🧹 LIMPIEZA COMPLETA:');
    
    // Eliminar TODOS los usuarios admin existentes
    const deletedUsers = await User.deleteMany({ 
      $or: [
        { email: process.env.DEFAULT_ADMIN_EMAIL },
        { role: 'super_admin' }
      ]
    });
    console.log(`   🗑️  Usuarios eliminados: ${deletedUsers.deletedCount}`);
    
    // Eliminar empresa admin si existe
    const deletedCompanies = await Company.deleteMany({ 
      $or: [
        { name: 'Tractoreando Admin' },
        { email: 'admin@tractoreando.com' }
      ]
    });
    console.log(`   🗑️  Empresas eliminadas: ${deletedCompanies.deletedCount}`);
    
    // PASO 2: Crear empresa admin
    console.log('\n🏢 CREANDO EMPRESA ADMIN:');
    const adminCompany = new Company({
      name: 'Tractoreando Admin',
      email: 'admin@tractoreando.com',
      phone: '+34000000000',
      address: 'Oficina Central',
      isActive: true
    });
    await adminCompany.save();
    console.log('   ✅ Empresa admin creada');
    
    // PASO 3: Crear usuario admin (método 1 - con middleware)
    console.log('\n👤 MÉTODO 1 - CON MIDDLEWARE:');
    try {
      const adminUser1 = new User({
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
          reports: { read: true, export: true },
          branches: { create: true, read: true, update: true, delete: true }
        }
      });
      
      await adminUser1.save();
      console.log('   ✅ Usuario creado con middleware');
      
      // Verificar inmediatamente
      const savedUser1 = await User.findOne({ email: process.env.DEFAULT_ADMIN_EMAIL });
      const passwordCheck1 = await savedUser1.comparePassword(process.env.DEFAULT_ADMIN_PASSWORD);
      console.log(`   🔐 Verificación: ${passwordCheck1 ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
      
      if (passwordCheck1) {
        console.log('   🎉 ¡MÉTODO 1 EXITOSO!');
      } else {
        console.log('   ❌ Método 1 falló, probando método 2...');
        
        // Eliminar y probar método 2
        await User.deleteOne({ email: process.env.DEFAULT_ADMIN_EMAIL });
        
        // PASO 4: Crear usuario admin (método 2 - hash manual)
        console.log('\n👤 MÉTODO 2 - HASH MANUAL:');
        const manualHash = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD, 10);
        console.log(`   🔐 Hash manual creado: ${manualHash.substring(0, 20)}...`);
        
        const adminUser2 = new User({
          firstName: 'Administrador',
          lastName: 'Sistema',
          email: process.env.DEFAULT_ADMIN_EMAIL,
          password: manualHash, // Hash manual
          phone: '+34000000000',
          company: adminCompany._id,
          role: 'super_admin',
          isActive: true,
          permissions: {
            users: { create: true, read: true, update: true, delete: true },
            companies: { create: true, read: true, update: true, delete: true },
            vehicles: { create: true, read: true, update: true, delete: true },
            maintenance: { create: true, read: true, update: true, delete: true },
            reports: { read: true, export: true },
            branches: { create: true, read: true, update: true, delete: true }
          }
        });
        
        // Desactivar middleware temporalmente
        adminUser2.isModified = () => false;
        await adminUser2.save();
        console.log('   ✅ Usuario creado con hash manual');
        
        // Verificar
        const savedUser2 = await User.findOne({ email: process.env.DEFAULT_ADMIN_EMAIL });
        const passwordCheck2 = await savedUser2.comparePassword(process.env.DEFAULT_ADMIN_PASSWORD);
        console.log(`   🔐 Verificación: ${passwordCheck2 ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
        
        if (!passwordCheck2) {
          throw new Error('Ambos métodos fallaron');
        }
      }
      
    } catch (error) {
      console.error('   ❌ Error en creación:', error.message);
      throw error;
    }
    
    // PASO 5: Verificación final completa
    console.log('\n🔍 VERIFICACIÓN FINAL:');
    const finalUser = await User.findOne({ email: process.env.DEFAULT_ADMIN_EMAIL }).populate('company');
    
    if (!finalUser) {
      throw new Error('Usuario no encontrado después de la creación');
    }
    
    console.log(`   📧 Email: ${finalUser.email}`);
    console.log(`   👤 Nombre: ${finalUser.firstName} ${finalUser.lastName}`);
    console.log(`   🔑 Rol: ${finalUser.role}`);
    console.log(`   ✅ Activo: ${finalUser.isActive}`);
    console.log(`   🏢 Empresa: ${finalUser.company.name}`);
    console.log(`   🔒 Bloqueado: ${finalUser.isLocked}`);
    
    // Pruebas finales de contraseña
    console.log('\n🔐 PRUEBAS FINALES:');
    const finalPasswordCheck = await finalUser.comparePassword(process.env.DEFAULT_ADMIN_PASSWORD);
    const directBcryptCheck = await bcrypt.compare(process.env.DEFAULT_ADMIN_PASSWORD, finalUser.password);
    
    console.log(`   🔍 Método del modelo: ${finalPasswordCheck ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    console.log(`   🔍 bcrypt directo: ${directBcryptCheck ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    
    if (finalPasswordCheck && directBcryptCheck) {
      console.log('\n🎉 ¡REPARACIÓN EXITOSA!');
      console.log('   ✅ Usuario admin completamente funcional');
      console.log('   ✅ Contraseñas validando correctamente');
      console.log('   ✅ Listo para login');
    } else {
      throw new Error('Verificación final falló');
    }
    
    console.log('\n🔌 Desconectando de MongoDB...');
    await mongoose.disconnect();
    console.log('✅ Desconectado');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixAdminComplete();