const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testFrontendMaintenanceCreation() {
  try {
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@tractoreando.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    console.log('🚗 Getting vehicles...');
    const vehiclesResponse = await axios.get(`${BASE_URL}/api/vehicles`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const vehicles = vehiclesResponse.data.vehicles;
    if (vehicles.length === 0) {
      console.log('❌ No vehicles found');
      return;
    }
    
    const vehicle = vehicles[0];
    console.log(`✅ Found vehicle: ${vehicle.plateNumber} (ID: ${vehicle.id})`);
    
    console.log('🔧 Creating maintenance with frontend-like data...');
    
    // Simulate frontend data structure
    const maintenanceData = {
      vehicleId: vehicle.id,
      type: 'preventivo',
      priority: 'media',
      scheduledDate: '2024-02-01T00:00:00.000Z',
      description: 'Test maintenance from frontend simulation',
      estimatedDuration: 2,
      services: [
        {
          category: 'motor',
          description: 'Oil change service',
          estimatedCost: 50
        }
      ],
      parts: [
        {
          name: 'Oil filter',
          quantity: 1,
          unitPrice: 15
        }
      ],
      notes: 'Test maintenance notes from frontend'
    };
    
    console.log('Sending data:', JSON.stringify(maintenanceData, null, 2));
    
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
    if (error.response?.status === 500) {
      console.log('\n🔍 This is a 500 error - check server logs for details');
    }
  }
}

testFrontendMaintenanceCreation();