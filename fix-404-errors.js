const axios = require('axios');

// Lista de endpoints para probar
const endpoints = [
  // Health checks
  { method: 'GET', path: '/health-check', auth: false },
  { method: 'GET', path: '/api/health', auth: false },
  
  // Auth endpoints
  { method: 'POST', path: '/api/auth/login', auth: false },
  { method: 'GET', path: '/api/auth/me', auth: true },
  
  // Companies
  { method: 'GET', path: '/api/companies', auth: true },
  
  // Branches
  { method: 'GET', path: '/api/branches', auth: true },
  
  // Vehicles
  { method: 'GET', path: '/api/vehicles', auth: true },
  
  // Maintenance
  { method: 'GET', path: '/api/maintenance', auth: true },
  
  // Users
  { method: 'GET', path: '/api/users', auth: true },
  
  // Reports
  { method: 'GET', path: '/api/reports/dashboard', auth: true },
  
  // Settings
  { method: 'GET', path: '/api/settings', auth: true }
];

async function testEndpoints() {
  const baseURL = 'http://localhost:3000';
  let token = null;
  
  console.log('🔍 Probando endpoints de la API...\n');
  
  // Primero intentar hacer login para obtener token
  try {
    console.log('🔐 Intentando hacer login...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'admin@tractoreando.com',
      password: 'Admin123!'
    });
    
    if (loginResponse.data.token) {
      token = loginResponse.data.token;
      console.log('✅ Login exitoso, token obtenido\n');
    }
  } catch (error) {
    console.log('❌ Error en login, continuando sin token\n');
  }
  
  const results = {
    working: [],
    notFound: [],
    errors: [],
    unauthorized: []
  };
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${baseURL}${endpoint.path}`,
        timeout: 5000
      };
      
      if (endpoint.auth && token) {
        config.headers = {
          'Authorization': `Bearer ${token}`
        };
      }
      
      const response = await axios(config);
      
      if (response.status === 200 || response.status === 201) {
        console.log(`✅ ${endpoint.method} ${endpoint.path} - OK (${response.status})`);
        results.working.push(endpoint.path);
      } else {
        console.log(`⚠️  ${endpoint.method} ${endpoint.path} - ${response.status}`);
        results.errors.push({ path: endpoint.path, status: response.status });
      }
      
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        if (status === 404) {
          console.log(`❌ ${endpoint.method} ${endpoint.path} - 404 NOT FOUND`);
          results.notFound.push(endpoint.path);
        } else if (status === 401 || status === 403) {
          console.log(`🔒 ${endpoint.method} ${endpoint.path} - ${status} UNAUTHORIZED`);
          results.unauthorized.push(endpoint.path);
        } else {
          console.log(`💥 ${endpoint.method} ${endpoint.path} - ${status} ERROR`);
          results.errors.push({ path: endpoint.path, status, error: error.response.data?.message });
        }
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`🔌 ${endpoint.method} ${endpoint.path} - SERVIDOR NO DISPONIBLE`);
        results.errors.push({ path: endpoint.path, error: 'Servidor no disponible' });
      } else {
        console.log(`💥 ${endpoint.method} ${endpoint.path} - ERROR: ${error.message}`);
        results.errors.push({ path: endpoint.path, error: error.message });
      }
    }
  }
  
  // Resumen
  console.log('\n📊 RESUMEN:');
  console.log(`✅ Funcionando: ${results.working.length}`);
  console.log(`❌ 404 Not Found: ${results.notFound.length}`);
  console.log(`🔒 Sin autorización: ${results.unauthorized.length}`);
  console.log(`💥 Otros errores: ${results.errors.length}`);
  
  if (results.notFound.length > 0) {
    console.log('\n❌ Endpoints con error 404:');
    results.notFound.forEach(path => console.log(`   - ${path}`));
  }
  
  if (results.errors.length > 0) {
    console.log('\n💥 Endpoints con errores:');
    results.errors.forEach(item => {
      console.log(`   - ${item.path}: ${item.error || item.status}`);
    });
  }
  
  return results;
}

// Ejecutar pruebas
testEndpoints().catch(error => {
  console.error('💥 Error ejecutando pruebas:', error.message);
  process.exit(1);
});