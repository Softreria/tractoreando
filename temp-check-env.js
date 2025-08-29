/**
 * SCRIPT TEMPORAL DE VERIFICACIÓN DE ENTORNO
 * Archivo: temp-check-env.js
 * Propósito: Verificar configuración de variables de entorno
 * ELIMINAR DESPUÉS DE SOLUCIONAR EL PROBLEMA
 */

const fs = require('fs');
const path = require('path');

function checkEnvironment() {
  console.log('🔍 === VERIFICACIÓN DE ENTORNO ===');
  console.log('⏰ Fecha:', new Date().toISOString());
  console.log('');

  // 1. Información del sistema
  console.log('💻 1. INFORMACIÓN DEL SISTEMA:');
  console.log('   Node.js versión:', process.version);
  console.log('   Plataforma:', process.platform);
  console.log('   Arquitectura:', process.arch);
  console.log('   Directorio actual:', process.cwd());
  console.log('   PID del proceso:', process.pid);
  console.log('');

  // 2. Variables de entorno críticas
  console.log('🔧 2. VARIABLES DE ENTORNO CRÍTICAS:');
  const criticalVars = [
    'NODE_ENV',
    'PORT',
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_EXPIRE',
    'BCRYPT_ROUNDS',
    'SESSION_SECRET',
    'SESSION_MAX_AGE',
    'DEFAULT_ADMIN_EMAIL',
    'DEFAULT_ADMIN_PASSWORD',
    'FRONTEND_URL',
    'BACKEND_URL',
    'CORS_ORIGIN'
  ];

  criticalVars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✅' : '❌';
    const displayValue = varName.includes('PASSWORD') || varName.includes('SECRET') 
      ? (value ? '[CONFIGURADO]' : '[NO CONFIGURADO]')
      : (value || '[NO DEFINIDO]');
    
    console.log(`   ${status} ${varName}: ${displayValue}`);
  });
  console.log('');

  // 3. Verificar archivos de configuración
  console.log('📁 3. ARCHIVOS DE CONFIGURACIÓN:');
  const configFiles = [
    '.env',
    '.env.production',
    'package.json',
    'server.js',
    'ecosystem.config.js'
  ];

  configFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    const exists = fs.existsSync(filePath);
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${file}`);
    
    if (exists) {
      try {
        const stats = fs.statSync(filePath);
        console.log(`      📅 Modificado: ${stats.mtime.toISOString()}`);
        console.log(`      📏 Tamaño: ${stats.size} bytes`);
      } catch (error) {
        console.log(`      ⚠️  Error leyendo stats: ${error.message}`);
      }
    }
  });
  console.log('');

  // 4. Verificar dependencias críticas
  console.log('📦 4. DEPENDENCIAS CRÍTICAS:');
  const criticalDeps = [
    'express',
    'mongoose',
    'bcryptjs',
    'jsonwebtoken',
    'cors',
    'dotenv'
  ];

  criticalDeps.forEach(dep => {
    try {
      const version = require(`${dep}/package.json`).version;
      console.log(`   ✅ ${dep}: v${version}`);
    } catch (error) {
      console.log(`   ❌ ${dep}: NO INSTALADO`);
    }
  });
  console.log('');

  // 5. Verificar estructura de directorios
  console.log('📂 5. ESTRUCTURA DE DIRECTORIOS:');
  const requiredDirs = [
    'models',
    'routes',
    'middleware',
    'frontend',
    'frontend/src',
    'frontend/public'
  ];

  requiredDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    const exists = fs.existsSync(dirPath);
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${dir}/`);
  });
  console.log('');

  // 6. Verificar puertos en uso
  console.log('🔌 6. CONFIGURACIÓN DE PUERTOS:');
  console.log('   Puerto configurado (PORT):', process.env.PORT || 'NO DEFINIDO');
  console.log('   Puerto por defecto backend:', '8000');
  console.log('   Puerto producción backend:', '3002');
  console.log('   Puerto frontend desarrollo:', '3000');
  console.log('   Puerto nginx proxy manager:', '3001');
  console.log('');

  // 7. Recomendaciones
  console.log('💡 7. RECOMENDACIONES:');
  
  if (!process.env.NODE_ENV) {
    console.log('   ⚠️  Definir NODE_ENV (development/production)');
  }
  
  if (!process.env.MONGODB_URI) {
    console.log('   ⚠️  Configurar MONGODB_URI');
  }
  
  if (!process.env.JWT_SECRET) {
    console.log('   ⚠️  Configurar JWT_SECRET para seguridad');
  }
  
  if (!process.env.DEFAULT_ADMIN_EMAIL || !process.env.DEFAULT_ADMIN_PASSWORD) {
    console.log('   ⚠️  Configurar credenciales de admin por defecto');
  }
  
  if (process.env.NODE_ENV === 'production' && process.env.PORT !== '3002') {
    console.log('   ⚠️  En producción, PORT debería ser 3002');
  }
  
  console.log('');
  console.log('✅ === VERIFICACIÓN COMPLETADA ===');
}

// Función para generar configuración de ejemplo
function generateExampleEnv() {
  console.log('\n📝 === CONFIGURACIÓN .env DE EJEMPLO ===');
  console.log('');
  
  const exampleEnv = `# Configuración de Entorno - Tractoreando
# ELIMINAR COMENTARIOS EN PRODUCCIÓN

# Entorno
NODE_ENV=production
PORT=3002
HOST=0.0.0.0

# Base de Datos
MONGODB_URI=mongodb://localhost:27017/tractoreando_prod

# Seguridad
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui_cambiar
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12
SESSION_SECRET=tu_session_secret_muy_seguro_aqui_cambiar
SESSION_MAX_AGE=86400000

# URLs
FRONTEND_URL=http://tractoreando.softreria.com
BACKEND_URL=http://tractoreando.softreria.com/api
CORS_ORIGIN=http://tractoreando.softreria.com

# Admin por defecto
DEFAULT_ADMIN_EMAIL=admin@tractoreando.com
DEFAULT_ADMIN_PASSWORD=admin123!

# Opcional: Configuración de archivos
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf

# Opcional: Logs
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Opcional: Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100`;

  console.log(exampleEnv);
  console.log('');
  console.log('💾 Copia esta configuración a tu archivo .env en producción');
}

// Ejecutar verificación
if (require.main === module) {
  checkEnvironment();
  generateExampleEnv();
}

module.exports = { checkEnvironment, generateExampleEnv };