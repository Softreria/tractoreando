#!/usr/bin/env node

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Company = require('./models/Company');

async function debugPasswordIssue() {
  try {
    console.log('🔍 DIAGNÓSTICO PROFUNDO DE CONTRASEÑAS');
    console.log('=====================================');
    
    // Conectar a MongoDB
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Verificar variables de entorno
    console.log('\n📋 VARIABLES DE ENTORNO:');
    console.log(`   DEFAULT_ADMIN_EMAIL: ${process.env.DEFAULT_ADMIN_EMAIL}`);
    console.log(`   DEFAULT_ADMIN_PASSWORD: ${process.env.DEFAULT_ADMIN_PASSWORD}`);
    console.log(`   Longitud de contraseña: ${process.env.DEFAULT_ADMIN_PASSWORD?.length || 0}`);
    
    // Buscar usuario existente
    const existingUser = await User.findOne({ email: process.env.DEFAULT_ADMIN_EMAIL });
    
    if (existingUser) {
      console.log('\n👤 USUARIO EXISTENTE ENCONTRADO:');
      console.log(`   ID: ${existingUser._id}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Password Hash: ${existingUser.password}`);
      console.log(`   Longitud del hash: ${existingUser.password.length}`);
      console.log(`   Empieza con $2: ${existingUser.password.startsWith('$2')}`);
      
      // Probar diferentes métodos de comparación
      console.log('\n🔐 PRUEBAS DE CONTRASEÑA:');
      
      // 1. Comparación directa con bcrypt
      try {
        const directCompare = await bcrypt.compare(process.env.DEFAULT_ADMIN_PASSWORD, existingUser.password);
        console.log(`   1. bcrypt.compare directo: ${directCompare ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
      } catch (error) {
        console.log(`   1. bcrypt.compare directo: ❌ ERROR - ${error.message}`);
      }
      
      // 2. Método del modelo
      try {
        const modelCompare = await existingUser.comparePassword(process.env.DEFAULT_ADMIN_PASSWORD);
        console.log(`   2. Método del modelo: ${modelCompare ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
      } catch (error) {
        console.log(`   2. Método del modelo: ❌ ERROR - ${error.message}`);
      }
      
      // 3. Verificar si el hash es válido
      console.log('\n🔍 ANÁLISIS DEL HASH:');
      const hashParts = existingUser.password.split('$');
      console.log(`   Partes del hash: ${hashParts.length}`);
      if (hashParts.length >= 4) {
        console.log(`   Algoritmo: $${hashParts[1]}$`);
        console.log(`   Rounds: ${hashParts[2]}`);
        console.log(`   Salt: ${hashParts[3].substring(0, 22)}`);
      }
      
      // 4. Crear un nuevo hash para comparar
      console.log('\n🆕 CREANDO NUEVO HASH:');
      const newHash = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD, 10);
      console.log(`   Nuevo hash: ${newHash}`);
      const newHashCompare = await bcrypt.compare(process.env.DEFAULT_ADMIN_PASSWORD, newHash);
      console.log(`   Comparación con nuevo hash: ${newHashCompare ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
      
      // 5. Probar con diferentes rounds
      console.log('\n🔄 PROBANDO DIFERENTES ROUNDS:');
      for (let rounds of [8, 10, 12]) {
        const testHash = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD, rounds);
        const testCompare = await bcrypt.compare(process.env.DEFAULT_ADMIN_PASSWORD, testHash);
        console.log(`   Rounds ${rounds}: ${testCompare ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
      }
      
    } else {
      console.log('\n❌ NO SE ENCONTRÓ USUARIO ADMIN');
    }
    
    // Probar creación de usuario desde cero
    console.log('\n🆕 CREANDO USUARIO DE PRUEBA:');
    
    // Eliminar usuario de prueba si existe
    await User.deleteOne({ email: 'test@tractoreando.com' });
    
    // Buscar o crear empresa
    let testCompany = await Company.findOne({ name: 'Test Company' });
    if (!testCompany) {
      testCompany = new Company({
        name: 'Test Company',
        cif: 'B12345678',
        contact: {
          email: 'test@company.com',
          phone: '+34000000000'
        },
        address: {
          street: 'Test Address',
          city: 'Madrid',
          country: 'España'
        },
        isActive: true
      });
      await testCompany.save();
    }
    
    // Crear usuario de prueba
    const testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@tractoreando.com',
      password: process.env.DEFAULT_ADMIN_PASSWORD, // Sin hashear, el middleware lo hará
      phone: '+34000000000',
      company: testCompany._id,
      role: 'super_admin',
      isActive: true
    });
    
    await testUser.save();
    console.log('   ✅ Usuario de prueba creado');
    
    // Buscar el usuario recién creado
    const savedTestUser = await User.findOne({ email: 'test@tractoreando.com' });
    console.log(`   Hash generado: ${savedTestUser.password}`);
    
    // Probar comparación
    const testCompare = await savedTestUser.comparePassword(process.env.DEFAULT_ADMIN_PASSWORD);
    console.log(`   Comparación: ${testCompare ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    
    // Limpiar usuario de prueba
    await User.deleteOne({ email: 'test@tractoreando.com' });
    await Company.deleteOne({ name: 'Test Company' });
    
    console.log('\n🔌 Desconectando de MongoDB...');
    await mongoose.disconnect();
    console.log('✅ Desconectado');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugPasswordIssue();