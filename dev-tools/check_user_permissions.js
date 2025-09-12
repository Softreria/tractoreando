const API_BASE = 'http://localhost:3001/api';

async function checkUserPermissions() {
  try {
    console.log('🔐 Logging in as admin...');
    
    // Login
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@tractoreando.com',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginData.token) {
      console.error('❌ Login failed:', loginData);
      return;
    }
    
    console.log('✅ Login successful');
    const token = loginData.token;
    
    // Get user profile
    console.log('👤 Getting user profile...');
    const profileResponse = await fetch(`${API_BASE}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const profileData = await profileResponse.json();
    console.log('📋 User profile:', JSON.stringify(profileData, null, 2));
    
    // Check specific permissions using same logic as frontend
    console.log('\n🔍 Checking permissions...');
    
    // Access user data from the correct structure
    const userData = profileData.user || profileData;
    const role = userData.role;
    const userPermissions = userData.permissions || {};
    
    console.log(`Role: ${role}`);
    console.log('User permissions object:', JSON.stringify(userPermissions, null, 2));
    
    // Function to check permissions (same logic as frontend AuthContext)
    function hasPermission(module, action) {
      // Super admin tiene todos los permisos
      if (role === 'super_admin') return true;
      
      // Verificar permisos específicos
      const modulePermissions = userPermissions[module] || {};
      return modulePermissions[action] === true;
    }
    
    // Check if user has read, update, delete permissions for companies
    const hasRead = hasPermission('companies', 'read');
    const hasUpdate = hasPermission('companies', 'update');
    const hasDelete = hasPermission('companies', 'delete');
    
    console.log('\n📊 Permission Summary:');
    console.log(`  Read companies: ${hasRead ? '✅' : '❌'}`);
    console.log(`  Update companies: ${hasUpdate ? '✅' : '❌'}`);
    console.log(`  Delete companies: ${hasDelete ? '✅' : '❌'}`);
    
    // Test companies endpoint
    console.log('\n🏢 Testing companies endpoint...');
    const companiesResponse = await fetch(`${API_BASE}/companies`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (companiesResponse.ok) {
      const companiesData = await companiesResponse.json();
      console.log(`✅ Companies loaded: ${companiesData.companies?.length || 0} companies`);
      
      if (companiesData.companies && companiesData.companies.length > 0) {
        const firstCompany = companiesData.companies[0];
        console.log(`\n🔍 Testing with first company: ${firstCompany.name} (${firstCompany.id})`);
        
        // Test get company details
        if (hasRead) {
          console.log('\n👁️ Testing view details...');
          const detailsResponse = await fetch(`${API_BASE}/companies/${firstCompany.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            console.log('✅ Company details retrieved successfully');
            console.log(`   Name: ${detailsData.name}`);
            console.log(`   CIF: ${detailsData.cif}`);
            console.log(`   Active: ${detailsData.isActive}`);
          } else {
            const errorData = await detailsResponse.json();
            console.error('❌ Failed to get company details:', errorData);
          }
        } else {
          console.log('⚠️ User does not have read permission for companies');
        }
        
        // Test delete (but don't actually delete)
        if (hasDelete) {
          console.log('\n🗑️ Testing delete permission (dry run)...');
          console.log('✅ User has delete permission (not actually deleting)');
        } else {
          console.log('⚠️ User does not have delete permission for companies');
        }
      }
    } else {
      const errorData = await companiesResponse.json();
      console.error('❌ Failed to load companies:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUserPermissions();