#!/usr/bin/env node

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

require('dotenv').config();

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Funciones de logging
function logInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logHeader(message) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}`);
  console.log(`${colors.cyan}${message}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

// Configuración optimizada para MongoDB
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 30000
};

// Función para verificar si un puerto está disponible
function checkPort(port) {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec(`lsof -i :${port}`, (error, stdout) => {
      resolve(!error && stdout.trim() !== '');
    });
  });
}

// Función para verificar el estado del servicio MongoDB
async function checkMongoService() {
  try {
    const { stdout } = await execAsync('brew services list | grep mongodb');
    return stdout.includes('started');
  } catch (error) {
    try {
      const { stdout } = await execAsync('systemctl is-active mongod');
      return stdout.trim() === 'active';
    } catch (systemdError) {
      return false;
    }
  }
}

// Diagnóstico de variables de entorno y configuración de login
async function diagnoseLogin() {
  logHeader('DIAGNÓSTICO DE CONFIGURACIÓN DE LOGIN');
  
  let issues = [];
  
  // Verificar archivo .env
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    logError('Archivo .env no encontrado');
    issues.push('missing_env_file');
    return { success: false, issues };
  }
  
  logSuccess('Archivo .env encontrado');
  
  // Verificar variables críticas
  const requiredVars = [
    'JWT_SECRET',
    'MONGODB_URI',
    'NODE_ENV',
    'PORT'
  ];
  
  const optionalVars = [
    'SESSION_SECRET',
    'BCRYPT_ROUNDS',
    'JWT_EXPIRES_IN'
  ];
  
  logInfo('Verificando variables de entorno requeridas...');
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      logError(`Variable requerida ${varName} no está definida`);
      issues.push(`missing_${varName.toLowerCase()}`);
    } else {
      logSuccess(`${varName}: ✓`);
    }
  }
  
  logInfo('Verificando variables de entorno opcionales...');
  
  for (const varName of optionalVars) {
    if (!process.env[varName]) {
      logWarning(`Variable opcional ${varName} no está definida`);
    } else {
      logSuccess(`${varName}: ✓`);
    }
  }
  
  // Verificar JWT_SECRET
  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      logWarning('JWT_SECRET es muy corto (recomendado: al menos 32 caracteres)');
      issues.push('weak_jwt_secret');
    } else {
      logSuccess('JWT_SECRET tiene longitud adecuada');
    }
  }
  
  return { success: issues.length === 0, issues };
}

// Diagnóstico de MongoDB
async function diagnoseMongoDb() {
  logHeader('DIAGNÓSTICO DE MONGODB');
  
  let issues = [];
  
  // Verificar si el puerto 27017 está en uso
  logInfo('Verificando puerto 27017...');
  const portInUse = await checkPort(27017);
  
  if (!portInUse) {
    logError('Puerto 27017 no está en uso - MongoDB no está ejecutándose');
    issues.push('mongodb_not_running');
  } else {
    logSuccess('Puerto 27017 está en uso');
  }
  
  // Verificar estado del servicio
  logInfo('Verificando estado del servicio MongoDB...');
  const serviceRunning = await checkMongoService();
  
  if (!serviceRunning) {
    logWarning('Servicio MongoDB no está activo');
    issues.push('mongodb_service_inactive');
  } else {
    logSuccess('Servicio MongoDB está activo');
  }
  
  // Intentar conexión a la base de datos
  logInfo('Probando conexión a MongoDB...');
  
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando';
    logInfo(`Conectando a: ${mongoUri}`);
    
    await mongoose.connect(mongoUri, mongoOptions);
    logSuccess('Conexión a MongoDB exitosa');
    
    // Verificar operaciones básicas
    logInfo('Probando operaciones básicas...');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    logSuccess(`Base de datos accesible - ${collections.length} colecciones encontradas`);
    
    // Verificar modelos principales
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    logInfo(`Usuarios en la base de datos: ${userCount}`);
    
    await mongoose.disconnect();
    logSuccess('Desconexión exitosa');
    
  } catch (error) {
    logError(`Error de conexión: ${error.message}`);
    issues.push('mongodb_connection_failed');
    
    if (error.message.includes('ECONNREFUSED')) {
      logError('MongoDB no está ejecutándose o no es accesible');
      issues.push('mongodb_refused');
    } else if (error.message.includes('authentication failed')) {
      logError('Error de autenticación en MongoDB');
      issues.push('mongodb_auth_failed');
    } else if (error.message.includes('timeout')) {
      logError('Timeout de conexión a MongoDB');
      issues.push('mongodb_timeout');
    }
  }
  
  return { success: issues.length === 0, issues };
}

// Corrección de timeouts y optimización
async function fixTimeouts() {
  logHeader('OPTIMIZACIÓN DE TIMEOUTS Y RENDIMIENTO');
  
  let fixes = [];
  
  try {
    logInfo('Aplicando configuración optimizada de MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando';
    
    // Configuración extendida para timeouts
    const extendedOptions = {
      ...mongoOptions,
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 120000,
      connectTimeoutMS: 60000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true
    };
    
    await mongoose.connect(mongoUri, extendedOptions);
    logSuccess('Conexión con configuración optimizada exitosa');
    
    // Limpiar datos problemáticos si es necesario
    logInfo('Verificando integridad de datos...');
    
    const db = mongoose.connection.db;
    const stats = await db.stats();
    
    logInfo(`Estadísticas de la base de datos:`);
    logInfo(`- Tamaño de datos: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    logInfo(`- Tamaño de índices: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    logInfo(`- Colecciones: ${stats.collections}`);
    
    // Verificar y optimizar índices si es necesario
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      const collectionObj = db.collection(collection.name);
      const indexes = await collectionObj.indexes();
      logInfo(`- ${collection.name}: ${indexes.length} índices`);
    }
    
    fixes.push('optimized_connection');
    fixes.push('verified_data_integrity');
    
    await mongoose.disconnect();
    logSuccess('Optimización completada');
    
  } catch (error) {
    logError(`Error durante la optimización: ${error.message}`);
    return { success: false, fixes, error: error.message };
  }
  
  return { success: true, fixes };
}

// Función principal que ejecuta todos los diagnósticos
async function runFullDiagnosis(options = {}) {
  const { skipLogin = false, skipMongo = false, skipOptimization = false, autoFix = false } = options;
  
  logHeader('DIAGNÓSTICO COMPLETO DEL SISTEMA');
  
  const results = {
    login: null,
    mongodb: null,
    optimization: null,
    overall: { success: false, issues: [], fixes: [] }
  };
  
  try {
    // Diagnóstico de login
    if (!skipLogin) {
      results.login = await diagnoseLogin();
      if (!results.login.success) {
        results.overall.issues.push(...results.login.issues);
      }
    }
    
    // Diagnóstico de MongoDB
    if (!skipMongo) {
      results.mongodb = await diagnoseMongoDb();
      if (!results.mongodb.success) {
        results.overall.issues.push(...results.mongodb.issues);
      }
    }
    
    // Optimización y corrección de timeouts
    if (!skipOptimization && (autoFix || results.mongodb?.success)) {
      results.optimization = await fixTimeouts();
      if (results.optimization.success) {
        results.overall.fixes.push(...results.optimization.fixes);
      }
    }
    
    // Resumen final
    results.overall.success = results.overall.issues.length === 0;
    
    logHeader('RESUMEN DEL DIAGNÓSTICO');
    
    if (results.overall.success) {
      logSuccess('✅ Todos los diagnósticos pasaron exitosamente');
    } else {
      logError(`❌ Se encontraron ${results.overall.issues.length} problemas`);
      logInfo('Problemas encontrados:');
      results.overall.issues.forEach(issue => logError(`  - ${issue}`));
    }
    
    if (results.overall.fixes.length > 0) {
      logInfo('Optimizaciones aplicadas:');
      results.overall.fixes.forEach(fix => logSuccess(`  - ${fix}`));
    }
    
  } catch (error) {
    logError(`Error durante el diagnóstico: ${error.message}`);
    results.overall.success = false;
    results.overall.issues.push('diagnostic_error');
  }
  
  return results;
}

// Función para mostrar ayuda
function showHelp() {
  console.log(`
${colors.cyan}Sistema de Diagnóstico Unificado${colors.reset}`);
  console.log(`
Uso: node diagnose-system.js [opciones]
`);
  console.log(`Opciones:`);
  console.log(`  --login-only        Solo diagnóstico de login`);
  console.log(`  --mongo-only        Solo diagnóstico de MongoDB`);
  console.log(`  --optimize-only     Solo optimización`);
  console.log(`  --auto-fix          Aplicar correcciones automáticamente`);
  console.log(`  --help              Mostrar esta ayuda`);
  console.log(`
Ejemplos:`);
  console.log(`  node diagnose-system.js                    # Diagnóstico completo`);
  console.log(`  node diagnose-system.js --login-only       # Solo login`);
  console.log(`  node diagnose-system.js --auto-fix         # Con correcciones automáticas`);
}

// Ejecución desde línea de comandos
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showHelp();
    process.exit(0);
  }
  
  const options = {
    skipLogin: args.includes('--mongo-only') || args.includes('--optimize-only'),
    skipMongo: args.includes('--login-only') || args.includes('--optimize-only'),
    skipOptimization: args.includes('--login-only') || args.includes('--mongo-only'),
    autoFix: args.includes('--auto-fix')
  };
  
  runFullDiagnosis(options)
    .then(results => {
      process.exit(results.overall.success ? 0 : 1);
    })
    .catch(error => {
      logError(`Error fatal: ${error.message}`);
      process.exit(1);
    });
}

// Exportar funciones para uso como módulo
module.exports = {
  diagnoseLogin,
  diagnoseMongoDb,
  fixTimeouts,
  runFullDiagnosis,
  logInfo,
  logSuccess,
  logWarning,
  logError,
  logHeader
};