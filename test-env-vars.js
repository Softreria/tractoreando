#!/usr/bin/env node

// Script simple para verificar variables de entorno
require('dotenv').config();

console.log('🔍 VERIFICANDO VARIABLES DE ENTORNO:');
console.log('================================');

const requiredVars = [
  'NODE_ENV',
  'JWT_SECRET',
  'MONGODB_URI',
  'DEFAULT_ADMIN_EMAIL',
  'DEFAULT_ADMIN_PASSWORD'
];

let allConfigured = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅ Configurado' : '❌ NO CONFIGURADO';
  console.log(`   ${varName}: ${status}`);
  if (!value) {
    allConfigured = false;
    console.log(`      Valor actual: '${value}'`);
  }
});

console.log('\n================================');
if (allConfigured) {
  console.log('✅ Todas las variables están configuradas correctamente');
} else {
  console.log('❌ Faltan variables de entorno críticas');
}

console.log('\n🔍 CONTENIDO DEL ARCHIVO .env:');
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('================================');
  console.log(envContent);
  console.log('================================');
} catch (error) {
  console.log('❌ No se pudo leer el archivo .env:', error.message);
}

process.exit(0);