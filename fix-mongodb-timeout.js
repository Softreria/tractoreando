const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos
const Company = require('./models/Company');
const Branch = require('./models/Branch');
const User = require('./models/User');
const Vehicle = require('./models/Vehicle');
const Maintenance = require('./models/Maintenance');

// Configuración de conexión con timeouts más largos
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 segundos
  socketTimeoutMS: 45000, // 45 segundos
  bufferMaxEntries: 0,
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 30000
};

// Función para limpiar datos con reintentos
async function clearDataWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🧹 Intento ${attempt}/${maxRetries} - Limpiando datos existentes...`);
      
      // Limpiar en orden para evitar problemas de referencias
      console.log('  - Eliminando mantenimientos...');
      const maintenanceResult = await Maintenance.deleteMany({}).maxTimeMS(30000);
      console.log(`    ✓ ${maintenanceResult.deletedCount} mantenimientos eliminados`);
      
      console.log('  - Eliminando vehículos...');
      const vehicleResult = await Vehicle.deleteMany({}).maxTimeMS(30000);
      console.log(`    ✓ ${vehicleResult.deletedCount} vehículos eliminados`);
      
      console.log('  - Eliminando usuarios (excepto super_admin)...');
      const userResult = await User.deleteMany({ role: { $ne: 'super_admin' } }).maxTimeMS(30000);
      console.log(`    ✓ ${userResult.deletedCount} usuarios eliminados`);
      
      console.log('  - Eliminando sucursales...');
      const branchResult = await Branch.deleteMany({}).maxTimeMS(30000);
      console.log(`    ✓ ${branchResult.deletedCount} sucursales eliminadas`);
      
      console.log('  - Eliminando empresas...');
      const companyResult = await Company.deleteMany({}).maxTimeMS(30000);
      console.log(`    ✓ ${companyResult.deletedCount} empresas eliminadas`);
      
      console.log('✅ Datos anteriores eliminados exitosamente');
      return true;
      
    } catch (error) {
      console.error(`❌ Error en intento ${attempt}:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`No se pudo limpiar los datos después de ${maxRetries} intentos: ${error.message}`);
      }
      
      // Esperar antes del siguiente intento
      console.log(`⏳ Esperando 5 segundos antes del siguiente intento...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Función para verificar conexión a MongoDB
async function checkMongoConnection() {
  try {
    console.log('🔍 Verificando conexión a MongoDB...');
    
    // Ping a la base de datos
    await mongoose.connection.db.admin().ping();
    console.log('✅ Conexión a MongoDB verificada');
    
    // Verificar índices
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Colecciones encontradas: ${collections.length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error verificando conexión:', error.message);
    return false;
  }
}

// Función para optimizar la base de datos
async function optimizeDatabase() {
  try {
    console.log('⚡ Optimizando base de datos...');
    
    // Compactar colecciones si es posible
    const collections = ['companies', 'branches', 'users', 'vehicles', 'maintenances'];
    
    for (const collectionName of collections) {
      try {
        await mongoose.connection.db.collection(collectionName).createIndex({ createdAt: 1 });
        console.log(`  ✓ Índice creado para ${collectionName}`);
      } catch (error) {
        // Índice ya existe, continuar
      }
    }
    
    console.log('✅ Base de datos optimizada');
  } catch (error) {
    console.warn('⚠️ No se pudo optimizar completamente:', error.message);
  }
}

// Función principal
async function fixMongoTimeouts() {
  let connection = null;
  
  try {
    console.log('🚀 Iniciando corrección de timeouts de MongoDB...');
    
    // Conectar con opciones optimizadas
    console.log('🔌 Conectando a MongoDB con configuración optimizada...');
    connection = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando',
      mongoOptions
    );
    console.log('✅ Conectado a MongoDB');
    
    // Verificar conexión
    const isConnected = await checkMongoConnection();
    if (!isConnected) {
      throw new Error('No se pudo verificar la conexión a MongoDB');
    }
    
    // Optimizar base de datos
    await optimizeDatabase();
    
    // Limpiar datos con reintentos
    await clearDataWithRetry();
    
    console.log('\n🎉 ¡Corrección completada exitosamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Ejecutar: node load-spanish-data.js');
    console.log('2. O ejecutar: node create-sample-data.js');
    console.log('\n💡 Consejos:');
    console.log('- Si persisten los timeouts, verifica la conexión de red');
    console.log('- Considera aumentar la memoria disponible para MongoDB');
    console.log('- Revisa los logs de MongoDB para errores específicos');
    
  } catch (error) {
    console.error('\n❌ Error durante la corrección:', error.message);
    console.error('\n🔧 Posibles soluciones:');
    console.error('1. Verificar que MongoDB esté ejecutándose: sudo systemctl status mongodb');
    console.error('2. Reiniciar MongoDB: sudo systemctl restart mongodb');
    console.error('3. Verificar espacio en disco: df -h');
    console.error('4. Verificar memoria disponible: free -h');
    console.error('5. Revisar logs de MongoDB: sudo journalctl -u mongodb -f');
    
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.connection.close();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixMongoTimeouts();
}

module.exports = { fixMongoTimeouts, clearDataWithRetry, checkMongoConnection };