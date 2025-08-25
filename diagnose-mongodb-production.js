const mongoose = require('mongoose');
const { execSync } = require('child_process');
require('dotenv').config();

// Configuración de conexión
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 20000,
  bufferMaxEntries: 0
};

// Función para ejecutar comandos del sistema
function runCommand(command) {
  try {
    const output = execSync(command, { encoding: 'utf8', timeout: 10000 });
    return { success: true, output: output.trim() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Función para verificar el estado de MongoDB
async function checkMongoDBStatus() {
  console.log('\n🔍 === DIAGNÓSTICO DE MONGODB ===\n');
  
  // 1. Verificar si MongoDB está ejecutándose
  console.log('1️⃣ Verificando estado del servicio MongoDB...');
  const mongoStatus = runCommand('systemctl is-active mongodb || systemctl is-active mongod');
  
  if (mongoStatus.success && mongoStatus.output === 'active') {
    console.log('✅ MongoDB está ejecutándose');
  } else {
    console.log('❌ MongoDB no está ejecutándose');
    console.log('🔧 Solución: sudo systemctl start mongodb');
    return false;
  }
  
  // 2. Verificar puerto
  console.log('\n2️⃣ Verificando puerto 27017...');
  const portCheck = runCommand('netstat -tlnp | grep :27017 || ss -tlnp | grep :27017');
  
  if (portCheck.success && portCheck.output.includes('27017')) {
    console.log('✅ Puerto 27017 está abierto');
  } else {
    console.log('❌ Puerto 27017 no está disponible');
    console.log('🔧 Verificar configuración de MongoDB');
  }
  
  // 3. Verificar espacio en disco
  console.log('\n3️⃣ Verificando espacio en disco...');
  const diskSpace = runCommand('df -h /');
  
  if (diskSpace.success) {
    console.log('💾 Espacio en disco:');
    console.log(diskSpace.output);
    
    // Verificar si hay menos del 10% de espacio libre
    const lines = diskSpace.output.split('\n');
    const rootLine = lines.find(line => line.includes('/') && !line.includes('/dev'));
    if (rootLine) {
      const usage = rootLine.match(/(\d+)%/);
      if (usage && parseInt(usage[1]) > 90) {
        console.log('⚠️ Poco espacio en disco disponible');
      }
    }
  }
  
  // 4. Verificar memoria
  console.log('\n4️⃣ Verificando memoria disponible...');
  const memInfo = runCommand('free -h');
  
  if (memInfo.success) {
    console.log('🧠 Memoria del sistema:');
    console.log(memInfo.output);
  }
  
  // 5. Verificar logs de MongoDB
  console.log('\n5️⃣ Verificando logs recientes de MongoDB...');
  const mongoLogs = runCommand('journalctl -u mongodb -n 10 --no-pager || journalctl -u mongod -n 10 --no-pager');
  
  if (mongoLogs.success) {
    console.log('📋 Últimos logs de MongoDB:');
    console.log(mongoLogs.output);
  } else {
    console.log('⚠️ No se pudieron obtener los logs de MongoDB');
  }
  
  return true;
}

// Función para probar la conexión a MongoDB
async function testMongoConnection() {
  console.log('\n🔗 === PRUEBA DE CONEXIÓN ===\n');
  
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando';
  console.log(`🎯 URI de conexión: ${mongoUri}`);
  
  try {
    console.log('🔌 Intentando conectar...');
    
    const connection = await mongoose.connect(mongoUri, mongoOptions);
    console.log('✅ Conexión establecida exitosamente');
    
    // Probar operaciones básicas
    console.log('\n📊 Probando operaciones básicas...');
    
    // Ping
    await mongoose.connection.db.admin().ping();
    console.log('✅ Ping exitoso');
    
    // Listar colecciones
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`✅ Colecciones encontradas: ${collections.length}`);
    
    if (collections.length > 0) {
      console.log('📋 Colecciones:');
      collections.forEach(col => {
        console.log(`  - ${col.name}`);
      });
    }
    
    // Probar operación de escritura simple
    console.log('\n✍️ Probando operación de escritura...');
    const testCollection = mongoose.connection.db.collection('test_connection');
    
    const testDoc = { 
      test: true, 
      timestamp: new Date(),
      message: 'Prueba de conexión exitosa'
    };
    
    await testCollection.insertOne(testDoc);
    console.log('✅ Escritura exitosa');
    
    // Probar operación de lectura
    console.log('📖 Probando operación de lectura...');
    const readResult = await testCollection.findOne({ test: true });
    
    if (readResult) {
      console.log('✅ Lectura exitosa');
    }
    
    // Limpiar documento de prueba
    await testCollection.deleteOne({ test: true });
    console.log('🧹 Documento de prueba eliminado');
    
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada correctamente');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    
    // Diagnóstico específico del error
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🔧 SOLUCIÓN: MongoDB no está ejecutándose');
      console.log('   sudo systemctl start mongodb');
      console.log('   sudo systemctl enable mongodb');
    } else if (error.message.includes('authentication failed')) {
      console.log('\n🔧 SOLUCIÓN: Error de autenticación');
      console.log('   Verificar credenciales en MONGODB_URI');
    } else if (error.message.includes('timeout')) {
      console.log('\n🔧 SOLUCIÓN: Timeout de conexión');
      console.log('   1. Verificar que MongoDB esté ejecutándose');
      console.log('   2. Verificar firewall y puertos');
      console.log('   3. Verificar configuración de red');
    }
    
    return false;
  }
}

// Función para verificar configuración del sistema
async function checkSystemConfiguration() {
  console.log('\n⚙️ === CONFIGURACIÓN DEL SISTEMA ===\n');
  
  // 1. Verificar variables de entorno
  console.log('1️⃣ Variables de entorno:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'no definido'}`);
  console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? 'definido' : 'no definido'}`);
  
  if (process.env.MONGODB_URI) {
    // Ocultar credenciales en la salida
    const safeUri = process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`   URI (segura): ${safeUri}`);
  }
  
  // 2. Verificar archivo .env
  console.log('\n2️⃣ Verificando archivo .env...');
  const envCheck = runCommand('ls -la .env');
  
  if (envCheck.success) {
    console.log('✅ Archivo .env encontrado');
    console.log(envCheck.output);
  } else {
    console.log('❌ Archivo .env no encontrado');
    console.log('🔧 Crear archivo .env con MONGODB_URI');
  }
  
  // 3. Verificar versión de Node.js
  console.log('\n3️⃣ Versión de Node.js:');
  console.log(`   ${process.version}`);
  
  // 4. Verificar dependencias críticas
  console.log('\n4️⃣ Verificando dependencias...');
  try {
    const mongoose = require('mongoose');
    console.log(`✅ Mongoose: ${mongoose.version}`);
  } catch (error) {
    console.log('❌ Mongoose no encontrado');
  }
}

// Función para generar reporte de soluciones
function generateSolutionReport() {
  console.log('\n🛠️ === SOLUCIONES RECOMENDADAS ===\n');
  
  console.log('🚀 Para resolver timeouts de MongoDB:');
  console.log('\n1️⃣ Ejecutar script de corrección:');
  console.log('   node fix-mongodb-timeout.js');
  
  console.log('\n2️⃣ Reiniciar MongoDB:');
  console.log('   sudo systemctl restart mongodb');
  console.log('   sudo systemctl status mongodb');
  
  console.log('\n3️⃣ Verificar configuración de MongoDB:');
  console.log('   sudo nano /etc/mongod.conf');
  console.log('   # Verificar bindIp y puerto');
  
  console.log('\n4️⃣ Aumentar timeouts en la aplicación:');
  console.log('   # Ya implementado en fix-mongodb-timeout.js');
  
  console.log('\n5️⃣ Cargar datos con script optimizado:');
  console.log('   node load-data-production.js');
  
  console.log('\n6️⃣ Monitorear logs en tiempo real:');
  console.log('   sudo journalctl -u mongodb -f');
  
  console.log('\n📞 Si persisten los problemas:');
  console.log('   - Verificar recursos del servidor (CPU, RAM, disco)');
  console.log('   - Considerar optimización de MongoDB');
  console.log('   - Revisar configuración de red y firewall');
}

// Función principal
async function diagnoseProduction() {
  console.log('🏥 DIAGNÓSTICO DE MONGODB EN PRODUCCIÓN');
  console.log('=' .repeat(50));
  
  try {
    // 1. Verificar estado del sistema
    await checkSystemConfiguration();
    
    // 2. Verificar MongoDB
    const mongoOk = await checkMongoDBStatus();
    
    // 3. Probar conexión
    if (mongoOk) {
      await testMongoConnection();
    }
    
    // 4. Generar reporte de soluciones
    generateSolutionReport();
    
    console.log('\n✅ Diagnóstico completado');
    
  } catch (error) {
    console.error('\n❌ Error durante el diagnóstico:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  diagnoseProduction();
}

module.exports = { 
  diagnoseProduction, 
  checkMongoDBStatus, 
  testMongoConnection,
  checkSystemConfiguration 
};