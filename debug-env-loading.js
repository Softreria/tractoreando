#!/usr/bin/env node

// Script para debuggear la carga de variables de entorno
console.log('🔍 DEBUG: CARGA DE VARIABLES DE ENTORNO');
console.log('==========================================');

// 1. Verificar si existe el archivo .env
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
console.log('📁 Directorio actual:', process.cwd());
console.log('📄 Ruta del archivo .env:', envPath);
console.log('📄 ¿Existe .env?:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  console.log('\n📖 CONTENIDO DEL ARCHIVO .env:');
  console.log('================================');
  const content = fs.readFileSync(envPath, 'utf8');
  console.log(content);
  console.log('================================');
  
  // Contar líneas
  const lines = content.split('\n');
  console.log(`📊 Total de líneas: ${lines.length}`);
  
  // Buscar las variables específicas
  const adminEmail = lines.find(line => line.startsWith('DEFAULT_ADMIN_EMAIL'));
  const adminPassword = lines.find(line => line.startsWith('DEFAULT_ADMIN_PASSWORD'));
  
  console.log('\n🔍 BÚSQUEDA DE VARIABLES ESPECÍFICAS:');
  console.log('DEFAULT_ADMIN_EMAIL línea:', adminEmail || 'NO ENCONTRADA');
  console.log('DEFAULT_ADMIN_PASSWORD línea:', adminPassword || 'NO ENCONTRADA');
}

// 2. Cargar dotenv y verificar
console.log('\n🔧 CARGANDO DOTENV...');
try {
  const result = require('dotenv').config();
  console.log('✅ Dotenv cargado exitosamente');
  console.log('📊 Variables cargadas:', Object.keys(result.parsed || {}).length);
  
  if (result.parsed) {
    console.log('\n📋 VARIABLES CARGADAS POR DOTENV:');
    Object.keys(result.parsed).forEach(key => {
      console.log(`   ${key}: ${result.parsed[key] ? '✅' : '❌'}`);
    });
  }
  
  if (result.error) {
    console.log('❌ Error en dotenv:', result.error.message);
  }
} catch (error) {
  console.log('❌ Error cargando dotenv:', error.message);
}

// 3. Verificar process.env
console.log('\n🌍 VERIFICANDO PROCESS.ENV:');
const criticalVars = [
  'NODE_ENV',
  'JWT_SECRET', 
  'MONGODB_URI',
  'DEFAULT_ADMIN_EMAIL',
  'DEFAULT_ADMIN_PASSWORD'
];

criticalVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅ Configurado' : '❌ NO CONFIGURADO';
  console.log(`   ${varName}: ${status}`);
  if (value) {
    console.log(`      Valor: '${value.substring(0, 20)}${value.length > 20 ? '...' : ''}'`);
  }
});

// 4. Verificar todas las variables que empiecen con DEFAULT_
console.log('\n🔍 TODAS LAS VARIABLES DEFAULT_*:');
Object.keys(process.env)
  .filter(key => key.startsWith('DEFAULT_'))
  .forEach(key => {
    console.log(`   ${key}: '${process.env[key]}'`);
  });

console.log('\n✅ Debug completado');
process.exit(0);