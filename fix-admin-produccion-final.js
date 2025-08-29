#!/usr/bin/env node

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Company = require('./models/Company');
const Branch = require('./models/Branch');

// Configuración de la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando';

async function fixAdminUserProduction() {
  try {
    console.log('🔄 Conectando a MongoDB en PRODUCCIÓN...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // 1. Eliminar índices conflictivos
    console.log('🗑️ Eliminando índices conflictivos...');
    try {
      await mongoose.connection.db.collection('companies').dropIndex('rfc_1');
      console.log('✅ Índice rfc_1 eliminado');
    } catch (error) {
      console.log('ℹ️ Índice rfc_1 no existía o ya fue eliminado');
    }
    
    try {
      await mongoose.connection.db.collection('companies').dropIndex('cif_1');
      console.log('✅ Índice cif_1 eliminado');
    } catch (error) {
      console.log('ℹ️ Índice cif_1 no existía o ya fue eliminado');
    }

    // 2. Limpiar datos existentes completamente
    console.log('🧹 Limpiando TODOS los datos existentes...');
    await User.deleteMany({});
    await Company.deleteMany({});
    await Branch.deleteMany({});
    console.log('✅ Base de datos limpiada completamente');

    // 3. Insertar empresa directamente en MongoDB (bypass Mongoose)
    console.log('🏢 Insertando empresa directamente en MongoDB...');
    const companyData = {
      name: 'Tractoreando Admin',
      cif: 'A12345678',
      address: {
        street: 'Calle Principal 123',
        city: 'Madrid',
        state: 'Madrid',
        zipCode: '28001',
        country: 'España'
      },
      contact: {
        phone: '+34 900 000 000',
        email: 'admin@tractoreando.com',
        website: 'https://tractoreando.com'
      },
      settings: {
        currency: 'EUR',
        timezone: 'Europe/Madrid',
        maintenanceReminders: true,
        emailNotifications: true
      },
      administrator: {
        firstName: 'Admin',
        lastName: 'Tractoreando',
        email: 'admin@tractoreando.com',
        phone: '+34 900 000 000',
        canManageUsers: true
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const companyResult = await mongoose.connection.db.collection('companies').insertOne(companyData);
    const companyId = companyResult.insertedId;
    console.log('✅ Empresa insertada con ID:', companyId);

    // 4. Insertar sucursal directamente
    console.log('🏪 Insertando sucursal directamente...');
    const branchData = {
      name: 'Sede Principal',
      company: companyId,
      address: 'Calle Principal 123, Madrid',
      phone: '+34 900 000 000',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const branchResult = await mongoose.connection.db.collection('branches').insertOne(branchData);
    const branchId = branchResult.insertedId;
    console.log('✅ Sucursal insertada con ID:', branchId);

    // 5. Insertar usuario directamente SIN HASHEAR (se hasheará después)
    console.log('👤 Insertando usuario directamente...');
    const userData = {
      firstName: 'Admin',
      lastName: 'Tractoreando',
      email: 'admin@tractoreando.com',
      password: 'admin123!', // PASSWORD SIN HASHEAR - se hasheará manualmente después
      role: 'super_admin',
      company: companyId,
      branches: [branchId],
      isActive: true,
      isEmailVerified: true,
      permissions: {
        users: { read: true, create: true, update: true, delete: true },
        companies: { read: true, create: true, update: true, delete: true },
        vehicles: { read: true, create: true, update: true, delete: true },
        maintenance: { read: true, create: true, update: true, delete: true },
        reports: { read: true, create: true, update: true, delete: true },
        branches: { read: true, create: true, update: true, delete: true }
      },
      loginAttempts: 0,
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const userResult = await mongoose.connection.db.collection('users').insertOne(userData);
    const userId = userResult.insertedId;
    console.log('✅ Usuario insertado con ID:', userId);

    // 6. Hashear la contraseña manualmente en la base de datos
    console.log('🔐 Hasheando contraseña en base de datos...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123!', salt);
    await mongoose.connection.db.collection('users').updateOne(
      { _id: userId },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    );
    console.log('✅ Contraseña hasheada correctamente');

    // 7. Actualizar empresa con referencia al usuario
    await mongoose.connection.db.collection('companies').updateOne(
      { _id: companyId },
      { $set: { 'administrator.userId': userId, updatedAt: new Date() } }
    );
    console.log('✅ Referencia de usuario actualizada en empresa');

    // 8. Crear índices necesarios para CIF
    console.log('📊 Creando índices necesarios...');
    await mongoose.connection.db.collection('companies').createIndex({ cif: 1 }, { unique: true });
    await mongoose.connection.db.collection('companies').createIndex({ name: 1 });
    await mongoose.connection.db.collection('companies').createIndex({ isActive: 1 });
    console.log('✅ Índices creados');

    // 9. Verificación final
    console.log('🔍 Verificando configuración final...');
    
    const verifyUser = await mongoose.connection.db.collection('users').findOne({ email: 'admin@tractoreando.com' });
    const verifyCompany = await mongoose.connection.db.collection('companies').findOne({ _id: companyId });
    const verifyBranch = await mongoose.connection.db.collection('branches').findOne({ _id: branchId });
    
    if (!verifyUser || !verifyCompany || !verifyBranch) {
      throw new Error('Verificación fallida: datos no encontrados');
    }
    
    console.log('✅ Datos verificados:', {
      user: {
        email: verifyUser.email,
        firstName: verifyUser.firstName,
        lastName: verifyUser.lastName,
        role: verifyUser.role,
        isActive: verifyUser.isActive
      },
      company: {
        name: verifyCompany.name,
        cif: verifyCompany.cif,
        isActive: verifyCompany.isActive
      },
      branch: {
        name: verifyBranch.name,
        isActive: verifyBranch.isActive
      }
    });
    
    // 10. Verificar password
    const passwordMatch = await bcrypt.compare('admin123!', verifyUser.password);
    console.log('✅ Password verificado:', passwordMatch ? 'CORRECTO' : 'INCORRECTO');
    
    if (!passwordMatch) {
      throw new Error('Password no coincide');
    }
    
    console.log('\n🎉 CONFIGURACIÓN DE PRODUCCIÓN COMPLETADA EXITOSAMENTE');
    console.log('📧 Email: admin@tractoreando.com');
    console.log('🔑 Password: admin123!');
    console.log('🏢 Empresa: Tractoreando Admin (CIF: A12345678)');
    console.log('\n✅ El login en PRODUCCIÓN debería funcionar ahora correctamente');
    console.log('\n🚀 Ejecuta: pm2 restart all');
    
  } catch (error) {
    console.error('❌ Error en PRODUCCIÓN:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
fixAdminUserProduction();