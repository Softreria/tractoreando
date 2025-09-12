// Using fetch directly instead of api module

// Función para hacer login y obtener token
async function login() {
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@tractoreando.com',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    if (data.token) {
      console.log('✅ Login successful');
      return data.token;
    } else {
      console.error('❌ Login failed:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return null;
  }
}

// Función para verificar permisos del usuario
async function checkUserPermissions(token) {
  try {
    const response = await fetch('http://localhost:3001/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const userData = await response.json();
    console.log('\n📋 User Data:');
    console.log('- ID:', userData.id);
    console.log('- Email:', userData.email);
    console.log('- Role:', userData.role);
    console.log('- Company ID:', userData.companyId);
    console.log('- Branch ID:', userData.branchId);
    console.log('- Permissions:', userData.permissions || 'Not specified');
    
    return userData;
  } catch (error) {
    console.error('❌ Error checking user permissions:', error.message);
    return null;
  }
}

// Función para probar endpoints de empresas
async function testCompanyEndpoints(token) {
  console.log('\n🧪 Testing Company Endpoints...');
  
  try {
    // Test GET /companies
    console.log('\n1. Testing GET /companies');
    const getResponse = await fetch('http://localhost:3001/api/companies', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (getResponse.ok) {
      const companiesData = await getResponse.json();
      console.log('✅ GET /companies successful');
      console.log('- Total companies:', companiesData.total);
      console.log('- Companies count:', companiesData.companies?.length || 0);
      
      if (companiesData.companies && companiesData.companies.length > 0) {
        const testCompany = companiesData.companies[0];
        console.log('- Test company ID:', testCompany.id);
        console.log('- Test company name:', testCompany.name);
        
        // Test GET /companies/:id (details)
        console.log('\n2. Testing GET /companies/:id (details)');
        const detailsResponse = await fetch(`http://localhost:3001/api/companies/${testCompany.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (detailsResponse.ok) {
          const companyDetails = await detailsResponse.json();
          console.log('✅ GET /companies/:id successful');
          console.log('- Company details retrieved for:', companyDetails.name);
        } else {
          const errorData = await detailsResponse.json();
          console.log('❌ GET /companies/:id failed:', detailsResponse.status, errorData.message);
        }
        
        // Test DELETE /companies/:id
        console.log('\n3. Testing DELETE /companies/:id');
        const deleteResponse = await fetch(`http://localhost:3001/api/companies/${testCompany.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (deleteResponse.ok) {
          const deleteData = await deleteResponse.json();
          console.log('✅ DELETE /companies/:id successful:', deleteData.message);
        } else {
          const errorData = await deleteResponse.json();
          console.log('❌ DELETE /companies/:id failed:', deleteResponse.status, errorData.message);
        }
      } else {
        console.log('⚠️ No companies found to test with');
      }
    } else {
      const errorData = await getResponse.json();
      console.log('❌ GET /companies failed:', getResponse.status, errorData.message);
    }
  } catch (error) {
    console.error('❌ Error testing company endpoints:', error.message);
  }
}

// Función principal
async function main() {
  console.log('🔍 Debugging Company Buttons Functionality\n');
  
  // 1. Login
  const token = await login();
  if (!token) {
    console.log('❌ Cannot proceed without valid token');
    return;
  }
  
  // 2. Check user permissions
  const userData = await checkUserPermissions(token);
  if (!userData) {
    console.log('❌ Cannot proceed without user data');
    return;
  }
  
  // 3. Test company endpoints
  await testCompanyEndpoints(token);
  
  console.log('\n✅ Debug completed');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };