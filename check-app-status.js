const axios = require('axios');
const { sequelize } = require('./models');

async function checkAppStatus() {
  console.log('🔍 Verificando estado de la aplicación...\n');
  
  const results = {
    database: false,
    server: false,
    api: false
  };

  // 1. Verificar conexión a la base de datos
  try {
    await sequelize.authenticate();
    console.log('✅ Base de datos: Conectada correctamente');
    results.database = true;
  } catch (error) {
    console.log('❌ Base de datos: Error de conexión');
    console.log(`   Error: ${error.message}`);
  }

  // 2. Verificar que el servidor responde
  try {
    const response = await axios.get('http://localhost:3000/health-check', {
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log('✅ Servidor: Respondiendo correctamente');
      console.log(`   Puerto: ${response.data.port}`);
      console.log(`   Entorno: ${response.data.environment}`);
      results.server = true;
    }
  } catch (error) {
    console.log('❌ Servidor: No responde');
    if (error.code === 'ECONNREFUSED') {
      console.log('   El servidor no está ejecutándose');
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }

  // 3. Verificar API de salud
  try {
    const response = await axios.get('http://localhost:3000/api/health', {
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log('✅ API: Funcionando correctamente');
      console.log(`   Mensaje: ${response.data.message}`);
      results.api = true;
    }
  } catch (error) {
    console.log('❌ API: No responde');
    console.log(`   Error: ${error.message}`);
  }

  // 4. Resumen final
  console.log('\n📊 Resumen del estado:');
  console.log(`   Base de datos: ${results.database ? '✅' : '❌'}`);
  console.log(`   Servidor: ${results.server ? '✅' : '❌'}`);
  console.log(`   API: ${results.api ? '✅' : '❌'}`);

  const allOk = results.database && results.server && results.api;
  
  if (allOk) {
    console.log('\n🎉 ¡La aplicación está funcionando correctamente!');
  } else {
    console.log('\n⚠️  La aplicación tiene problemas que necesitan ser resueltos.');
  }

  process.exit(allOk ? 0 : 1);
}

// Ejecutar verificación
checkAppStatus().catch(error => {
  console.error('💥 Error durante la verificación:', error.message);
  process.exit(1);
});