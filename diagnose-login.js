#!/usr/bin/env node

// Script de diagnóstico para problemas de login en Tractoreando
// Ejecutar con: node diagnose-login.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Company = require('./models/Company');
const Branch = require('./models/Branch');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`)
};

async function diagnoseLogin() {
  try {
    log.info('🔍 Iniciando diagnóstico de login...');
    
    // 1. Verificar variables de entorno
    log.info('\n1. Verificando variables de entorno...');
    
    if (!process.env.JWT_SECRET) {
      log.error('JWT_SECRET no está definido');
    } else {
      log.success(`JWT_SECRET está definido (${process.env.JWT_SECRET.length} caracteres)`);
    }
    
    if (!process.env.MONGODB_URI) {
      log.warning('MONGODB_URI no está definido, usando valor por defecto');
    } else {
      log.success(`MONGODB_URI: ${process.env.MONGODB_URI}`);
    }
    
    // 2. Conectar a la base de datos
    log.info('\n2. Conectando a la base de datos...');
    
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    log.success('Conexión a MongoDB exitosa');
    
    // 3. Verificar usuarios existentes
    log.info('\n3. Verificando usuarios en la base de datos...');
    
    const userCount = await User.countDocuments();
    log.info(`Total de usuarios: ${userCount}`);
    
    if (userCount === 0) {
      log.warning('No hay usuarios en la base de datos');
      log.info('Creando usuario de prueba...');
      await createTestUser();
    } else {
      const users = await User.find({}, 'email role isActive').limit(10);
      log.info('Usuarios encontrados:');
      users.forEach(user => {
        const status = user.isActive ? '✅ Activo' : '❌ Inactivo';
        log.info(`  - ${user.email} (${user.role}) ${status}`);
      });
    }
    
    // 4. Probar autenticación con el primer usuario
    log.info('\n4. Probando autenticación...');
    
    const testUser = await User.findOne({ isActive: true }).populate('company');
    if (!testUser) {
      log.error('No se encontró ningún usuario activo para probar');
      return;
    }
    
    log.info(`Probando con usuario: ${testUser.email}`);
    
    // Verificar si la empresa está activa
    if (testUser.company && !testUser.company.isActive) {
      log.warning(`La empresa del usuario está inactiva: ${testUser.company.name}`);
    }
    
    // Verificar si el usuario está bloqueado
    if (testUser.isLocked) {
      log.warning('El usuario está bloqueado temporalmente');
      log.info('Desbloqueando usuario...');
      await testUser.resetLoginAttempts();
      log.success('Usuario desbloqueado');
    }
    
    // 5. Probar generación de JWT
    log.info('\n5. Probando generación de JWT...');
    
    try {
      const token = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
      log.success('Token JWT generado correctamente');
      
      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      log.success(`Token verificado correctamente. User ID: ${decoded.id}`);
    } catch (jwtError) {
      log.error(`Error con JWT: ${jwtError.message}`);
    }
    
    // 6. Verificar hash de contraseña
    log.info('\n6. Verificando hash de contraseña...');
    
    if (testUser.password) {
      log.success('Usuario tiene contraseña hasheada');
      
      // Probar con contraseña común
      const commonPasswords = ['admin', 'password', '123456', 'admin123', 'tractoreando'];
      
      for (const pwd of commonPasswords) {
        const isMatch = await bcrypt.compare(pwd, testUser.password);
        if (isMatch) {
          log.success(`✅ Contraseña encontrada: "${pwd}"`);
          break;
        }
      }
    } else {
      log.error('Usuario no tiene contraseña');
    }
    
    // 7. Verificar estructura de la base de datos
    log.info('\n7. Verificando estructura de la base de datos...');
    
    const companyCount = await Company.countDocuments();
    const branchCount = await Branch.countDocuments();
    
    log.info(`Empresas: ${companyCount}`);
    log.info(`Sucursales: ${branchCount}`);
    
    if (companyCount === 0) {
      log.warning('No hay empresas en la base de datos');
    }
    
    if (branchCount === 0) {
      log.warning('No hay sucursales en la base de datos');
    }
    
    log.info('\n✅ Diagnóstico completado');
    
  } catch (error) {
    log.error(`Error durante el diagnóstico: ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    log.info('Desconectado de la base de datos');
  }
}

async function createTestUser() {
  try {
    // Crear empresa de prueba
    const company = new Company({
      name: 'Empresa de Prueba',
      rfc: 'TEST123456789',
      address: {
        street: 'Calle de Prueba 123',
        city: 'Madrid',
        state: 'Madrid',
        zipCode: '28001',
        country: 'España'
      },
      contact: {
        phone: '+34 900 000 000',
        email: 'test@empresa.com'
      },
      isActive: true
    });
    await company.save();
    
    // Crear sucursal de prueba
    const branch = new Branch({
      name: 'Sucursal Principal',
      company: company._id,
      address: 'Calle de Prueba 123, Madrid',
      phone: '+34 900 000 000',
      isActive: true
    });
    await branch.save();
    
    // Crear usuario de prueba
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const user = new User({
      firstName: 'Admin',
      lastName: 'Test',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'super_admin',
      company: company._id,
      branches: [branch._id],
      isActive: true
    });
    
    await user.save();
    
    log.success('Usuario de prueba creado:');
    log.info('  Email: admin@test.com');
    log.info('  Contraseña: admin123');
    log.info('  Rol: super_admin');
    
  } catch (error) {
    log.error(`Error creando usuario de prueba: ${error.message}`);
  }
}

// Ejecutar diagnóstico
if (require.main === module) {
  diagnoseLogin();
}

module.exports = { diagnoseLogin };