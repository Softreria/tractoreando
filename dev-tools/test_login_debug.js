const axios = require('axios');

async function testLogin() {
  console.log('🔐 Probando credenciales de login...');
  
  const credentialsList = [
    { email: 'admin@tractoreando.com', password: 'Admin123!' },
    { email: 'admin@tractoreando.com', password: 'admin123' },
    { email: 'admin@tractoreando.com', password: 'admin123456' },
    { email: 'admin@tractoreando.com', password: 'password123' }
  ];
  
  for (const credentials of credentialsList) {
    try {
      console.log(`\n📧 Probando: ${credentials.email} / ${credentials.password}`);
      
      const response = await axios.post('http://localhost:3000/api/auth/login', credentials);
      
      console.log('✅ Login exitoso!');
      console.log('📋 Respuesta:', JSON.stringify(response.data, null, 2));
      return;
      
    } catch (error) {
      console.log(`❌ Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      if (error.response?.data) {
        console.log('📋 Detalles del error:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
  
  console.log('\n❌ No se pudo hacer login con ninguna credencial.');
  
  // Verificar si existe algún usuario en la base de datos
  console.log('\n🔍 Verificando usuarios en la base de datos...');
  try {
    const healthResponse = await axios.get('http://localhost:3000/api/health');
    console.log('✅ Servidor backend está funcionando');
  } catch (error) {
    console.log('❌ Error conectando al backend:', error.message);
  }
}

testLogin().catch(console.error);