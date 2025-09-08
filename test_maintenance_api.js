const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testMaintenanceCreation() {
  try {
    console.log('🔐 Logging in...');
    
    // First, login to get a token
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@tractoreando.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Get vehicles to use a valid vehicleId
    console.log('🚗 Getting vehicles...');
    const vehiclesResponse = await axios.get(`${BASE_URL}/api/vehicles`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const vehicles = vehiclesResponse.data.vehicles;
    if (!vehicles || vehicles.length === 0) {
      console.log('❌ No vehicles found');
      return;
    }
    
    const vehicleId = vehicles[0].id;
    console.log(`✅ Found vehicle: ${vehicles[0].plateNumber} (ID: ${vehicleId})`);
    
    // Test maintenance creation
    console.log('🔧 Creating maintenance...');
    const maintenanceData = {
      vehicleId: vehicleId,
      type: 'preventivo',
      priority: 'media',
      scheduledDate: '2024-02-01',
      description: 'Test maintenance creation',
      estimatedDuration: 2,
      services: [{
        category: 'motor',
        description: 'Change engine oil',
        estimatedCost: 50
      }],
      parts: [{
        name: 'Oil filter',
        partNumber: 'OF-001',
        quantity: 1,
        unitPrice: 15
      }],
      notes: 'Test maintenance notes'
    };
    
    const maintenanceResponse = await axios.post(`${BASE_URL}/api/maintenance`, maintenanceData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Maintenance created successfully!');
    console.log('Response:', maintenanceResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testMaintenanceCreation();