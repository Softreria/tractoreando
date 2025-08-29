/**
 * SCRIPT TEMPORAL DE LIMPIEZA
 * Archivo: temp-cleanup.js
 * Propósito: Eliminar todos los archivos temporales después de solucionar el problema
 * EJECUTAR ESTE SCRIPT AL FINAL PARA LIMPIAR
 */

const fs = require('fs');
const path = require('path');

function cleanupTempFiles() {
  console.log('🧹 === LIMPIEZA DE ARCHIVOS TEMPORALES ===');
  console.log('⏰ Fecha:', new Date().toISOString());
  console.log('');

  // Lista de archivos temporales a eliminar
  const tempFiles = [
    'temp-diagnostic.js',
    'temp-fix-admin.js',
    'temp-check-env.js',
    'temp-cleanup.js' // Este mismo archivo
  ];

  let deletedCount = 0;
  let errorCount = 0;

  console.log('📁 Archivos temporales a eliminar:');
  
  tempFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    
    try {
      if (fs.existsSync(filePath)) {
        // Mostrar información del archivo antes de eliminar
        const stats = fs.statSync(filePath);
        console.log(`   📄 ${file}:`);
        console.log(`      📅 Creado: ${stats.birthtime.toISOString()}`);
        console.log(`      📏 Tamaño: ${stats.size} bytes`);
        
        // Eliminar archivo
        fs.unlinkSync(filePath);
        console.log(`      ✅ Eliminado exitosamente`);
        deletedCount++;
      } else {
        console.log(`   ⚠️  ${file}: No encontrado`);
      }
    } catch (error) {
      console.log(`   ❌ Error eliminando ${file}: ${error.message}`);
      errorCount++;
    }
    console.log('');
  });

  // Resumen de limpieza
  console.log('📊 === RESUMEN DE LIMPIEZA ===');
  console.log(`✅ Archivos eliminados: ${deletedCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  console.log(`📁 Total archivos procesados: ${tempFiles.length}`);
  console.log('');

  if (deletedCount > 0) {
    console.log('🎉 Limpieza completada exitosamente!');
    console.log('💡 Los archivos temporales han sido eliminados del proyecto.');
  } else {
    console.log('ℹ️  No se encontraron archivos temporales para eliminar.');
  }

  if (errorCount > 0) {
    console.log('⚠️  Algunos archivos no pudieron ser eliminados. Revisa los permisos.');
  }

  console.log('');
  console.log('✨ === LIMPIEZA FINALIZADA ===');
}

// Función para confirmar limpieza
function confirmCleanup() {
  console.log('⚠️  === CONFIRMACIÓN DE LIMPIEZA ===');
  console.log('');
  console.log('Este script eliminará los siguientes archivos temporales:');
  console.log('   • temp-diagnostic.js');
  console.log('   • temp-fix-admin.js');
  console.log('   • temp-check-env.js');
  console.log('   • temp-cleanup.js (este archivo)');
  console.log('');
  console.log('🚨 IMPORTANTE: Solo ejecuta este script DESPUÉS de:');
  console.log('   1. Haber solucionado el problema de login');
  console.log('   2. Verificar que la aplicación funciona correctamente');
  console.log('   3. Confirmar que ya no necesitas los scripts de diagnóstico');
  console.log('');
  console.log('💡 Para ejecutar la limpieza, usa: node temp-cleanup.js --confirm');
  console.log('');
}

// Verificar argumentos de línea de comandos
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--confirm') || args.includes('-y')) {
    cleanupTempFiles();
  } else {
    confirmCleanup();
  }
}

module.exports = { cleanupTempFiles, confirmCleanup };