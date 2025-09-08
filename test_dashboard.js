const axios = require('axios');

async function testDashboard() {
  try {
    console.log('Probando endpoint del dashboard...');
    
    // Credenciales del administrador según README.md
    const credentials = [
      { email: 'admin@tractoreando.com', password: 'Admin123!' },
      { email: 'admin@tractoreando.com', password: 'admin123456' }, // Del script create-admin.js
      { email: 'admin@tractoreando.com', password: 'admin123' }
    ];
    
    let token = null;
    
    // Intentar login con diferentes credenciales
    for (const cred of credentials) {
      try {
        console.log(`Intentando login con ${cred.email}...`);
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', cred);
        token = loginResponse.data.token;
        console.log(`✅ Login exitoso con ${cred.email}`);
        break;
      } catch (loginError) {
        console.log(`❌ Falló login con ${cred.email}`);
      }
    }
    
    // Si no se pudo hacer login, intentar registrar un nuevo usuario
    if (!token) {
      console.log('\nIntentando registrar nuevo usuario...');
      try {
        const registerResponse = await axios.post('http://localhost:3001/api/auth/register', {
          name: 'Test',
          lastName: 'User',
          email: 'testuser@example.com',
          password: 'test123456',
          companyName: 'Test Company',
          branchName: 'Test Branch',
          companyCif: 'TEST789',
          companyAddress: 'Test Address 123',
          companyPhone: '987654321',
          companyEmail: 'testcompany@example.com'
        });
        
        token = registerResponse.data.token;
        console.log('✅ Usuario registrado exitosamente');
        
      } catch (registerError) {
        console.error('❌ Error en registro:', registerError.response?.data || registerError.message);
        return;
      }
    }
    
    // Ahora probar el dashboard con el token válido
    console.log('\nProbando endpoint del dashboard...');
    const response = await axios.get('http://localhost:3001/api/reports/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Dashboard endpoint funcionando');
    console.log('\n=== DATOS DEL DASHBOARD ===');
    
    const data = response.data;
    
    // Mostrar estadísticas principales
    console.log('\n📊 Estadísticas:');
    console.log(`- Vehículos: ${data.vehicleStats?.total || 0}`);
    console.log(`- Mantenimientos: ${data.maintenanceStats?.total || 0}`);
    console.log(`- Usuarios: ${data.userStats?.total || 0}`);
    console.log(`- Empresas: ${data.companyStats?.total || 0}`);
    console.log(`- Sucursales: ${data.branchStats?.total || 0}`);
    
    // Mostrar alertas de mantenimiento
    if (data.maintenanceAlerts) {
      console.log('\n🚨 Alertas de Mantenimiento:');
      console.log(`- Vencidos: ${data.maintenanceAlerts.overdue || 0}`);
      console.log(`- Hoy: ${data.maintenanceAlerts.dueToday || 0}`);
      console.log(`- Mañana: ${data.maintenanceAlerts.dueTomorrow || 0}`);
    }
    
    // Mostrar distribución de vehículos
    if (data.vehicleDistribution) {
      console.log('\n🚗 Distribución de Vehículos:');
      console.log(`- Activos: ${data.vehicleDistribution.active || 0}`);
      console.log(`- En mantenimiento: ${data.vehicleDistribution.inMaintenance || 0}`);
      console.log(`- Fuera de servicio: ${data.vehicleDistribution.outOfService || 0}`);
    }
    
    // Mostrar mantenimientos recientes
    if (data.recentMaintenances && data.recentMaintenances.length > 0) {
      console.log('\n🔧 Mantenimientos Recientes:');
      data.recentMaintenances.slice(0, 3).forEach((maintenance, index) => {
        console.log(`${index + 1}. ${maintenance.type} - ${maintenance.Vehicle?.licensePlate || 'N/A'} (${maintenance.status})`);
      });
    }
    
    console.log('\n=== DATOS COMPLETOS ===');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error en dashboard endpoint:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Ejecutar la prueba
testDashboard();