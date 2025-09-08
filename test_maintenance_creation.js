const axios = require('axios');

async function testMaintenanceCreation() {
  try {
    console.log('🧪 Probando creación de mantenimientos...');
    
    // Paso 1: Probar diferentes credenciales de login
    console.log('\n1. 🔐 Probando credenciales de login...');
    
    const credentialsList = [
      { email: 'admin@tractoreando.com', password: 'Admin123!' },
      { email: 'admin@tractoreando.com', password: 'admin123' },
      { email: 'admin@tractoreando.com', password: 'admin123456' },
      { email: 'admin@tractoreando.com', password: 'password123' }
    ];
    
    let token = null;
    let successCredentials = null;
    
    for (const credentials of credentialsList) {
      try {
        console.log(`   Probando: ${credentials.email} / ${credentials.password}`);
        const loginResponse = await axios.post('http://localhost:3002/api/auth/login', credentials);
        token = loginResponse.data.token;
        successCredentials = credentials;
        console.log('   ✅ Login exitoso!');
        break;
      } catch (error) {
        console.log(`   ❌ Falló: ${error.response?.data?.message || error.message}`);
      }
    }
    
    if (!token) {
      console.log('\n❌ No se pudo hacer login con ninguna credencial.');
      console.log('   Verificando si el servidor está ejecutándose...');
      
      try {
        await axios.get('http://localhost:3002/api/health');
        console.log('   ✅ Servidor está ejecutándose');
      } catch (error) {
        console.log('   ❌ Servidor no responde. Asegúrate de que esté ejecutándose.');
        return;
      }
      
      return;
    }
    
    console.log(`\n✅ Autenticado con: ${successCredentials.email}`);
    
    // Paso 2: Obtener lista de vehículos
    console.log('\n2. 🚗 Obteniendo lista de vehículos...');
    const vehiclesResponse = await axios.get('http://localhost:3002/api/vehicles', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const vehicles = vehiclesResponse.data.vehicles || vehiclesResponse.data;
    console.log(`✅ Encontrados ${vehicles.length} vehículos`);
    
    if (vehicles.length === 0) {
      console.log('❌ No hay vehículos disponibles para crear mantenimientos');
      return;
    }
    
    const vehicle = vehicles[0];
    console.log(`   Usando vehículo: ${vehicle.licensePlate || vehicle.id} (${vehicle.make} ${vehicle.model})`);
    console.log(`   CompanyId del vehículo: ${vehicle.companyId}`);
    
    // Paso 3: Intentar crear un mantenimiento
    console.log('\n3. 🔧 Creando mantenimiento...');
    
    const maintenanceData = {
      vehicleId: vehicle.id,
      type: 'preventivo',
      priority: 'media',
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días desde hoy
      description: 'Mantenimiento de prueba - Cambio de aceite y filtros',
      services: [
        {
          name: 'Cambio de aceite',
          description: 'Cambio de aceite del motor',
          estimatedTime: 60,
          cost: 50
        }
      ],
      parts: [
        {
          name: 'Aceite motor 5W-30',
          quantity: 4,
          unitCost: 12.50
        }
      ],
      estimatedCost: 100
    };
    
    console.log('   Datos del mantenimiento:');
    console.log(`   - Vehículo: ${vehicle.id}`);
    console.log(`   - Tipo: ${maintenanceData.type}`);
    console.log(`   - Prioridad: ${maintenanceData.priority}`);
    console.log(`   - Fecha programada: ${maintenanceData.scheduledDate}`);
    console.log(`   - Descripción: ${maintenanceData.description}`);
    
    const maintenanceResponse = await axios.post('http://localhost:3002/api/maintenance', maintenanceData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n🎉 ¡Mantenimiento creado exitosamente!');
    console.log(`   ID: ${maintenanceResponse.data.id}`);
    console.log(`   Número de orden: ${maintenanceResponse.data.workOrderNumber}`);
    console.log(`   Estado: ${maintenanceResponse.data.status}`);
    
    // Paso 4: Verificar que el mantenimiento se creó correctamente
    console.log('\n4. ✅ Verificando mantenimiento creado...');
    const verifyResponse = await axios.get(`http://localhost:3002/api/maintenance/${maintenanceResponse.data.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Mantenimiento verificado:');
    console.log(`   - Título: ${verifyResponse.data.title}`);
    console.log(`   - Vehículo: ${verifyResponse.data.vehicle?.licensePlate || 'N/A'}`);
    console.log(`   - Empresa: ${verifyResponse.data.company?.name || 'N/A'}`);
    console.log(`   - Estado: ${verifyResponse.data.status}`);
    
    console.log('\n🎊 ¡PROBLEMA RESUELTO! La creación de mantenimientos funciona correctamente.');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Mensaje: ${error.response.data.message || error.response.data}`);
      
      if (error.response.status === 400 && error.response.data.message === 'Vehículo no válido o empresa inactiva') {
        console.error('\n🔍 El error persiste. Posibles causas:');
        console.error('   1. El vehículo no pertenece a la empresa del usuario');
        console.error('   2. La empresa no está activa');
        console.error('   3. Problema en la lógica de validación del endpoint');
        console.error('\n🔧 Verificando datos del usuario y vehículo...');
        
        // Información adicional para debug
        try {
          const userResponse = await axios.get('http://localhost:3002/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.error(`   Usuario companyId: ${userResponse.data.companyId}`);
        } catch (e) {
          console.error('   No se pudo obtener info del usuario');
        }
      }
    } else {
      console.error(`   Error: ${error.message}`);
    }
  }
}

// Ejecutar la prueba
testMaintenanceCreation();