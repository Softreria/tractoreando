const { sequelize } = require('./models');
const User = require('./models/User');
const Company = require('./models/Company');
const Branch = require('./models/Branch');
// No necesitamos bcrypt aquí porque el modelo User lo maneja automáticamente

async function createMissingAdmin() {
  try {
    console.log('🔧 Creando usuarios administradores faltantes...');
    
    // Buscar empresas que tienen datos de administrador pero no tienen usuario creado
    const companies = await Company.findAll({
      where: {
        isActive: true
      }
    });
    
    console.log(`📊 Verificando ${companies.length} empresas...`);
    
    let createdCount = 0;
    
    for (const company of companies) {
      const administrator = company.administrator;
      
      if (!administrator || !administrator.email) {
        console.log(`⚠️  ${company.name} - No tiene datos de administrador`);
        continue;
      }
      
      // Verificar si ya existe el usuario
      const existingUser = await User.findOne({
        where: {
          companyId: company.id,
          email: administrator.email
        }
      });
      
      if (existingUser) {
        console.log(`✅ ${company.name} - Usuario administrador ya existe: ${existingUser.email}`);
        
        // Actualizar el campo administrator con el userId si no lo tiene
        if (!administrator.userId) {
          await company.update({
            administrator: {
              ...administrator,
              userId: existingUser.id
            }
          });
          console.log(`🔗 ${company.name} - Vinculado userId al campo administrator`);
        }
        continue;
      }
      
      // Buscar o crear la sucursal principal de la empresa
      let mainBranch = await Branch.findOne({
        where: {
          companyId: company.id,
          code: 'MAIN'
        }
      });
      
      // Crear el usuario administrador primero como super_admin temporalmente para evitar validación de branchId
      // La contraseña se hasheará automáticamente en el hook beforeSave del modelo
      const adminUser = await User.create({
        firstName: administrator.firstName,
        lastName: administrator.lastName,
        email: administrator.email,
        password: 'admin123', // Contraseña temporal que se hasheará automáticamente
        phone: administrator.phone || null,
        companyId: company.id,
        role: 'super_admin', // Rol temporal para evitar validación de branchId
        permissions: {
          canManageUsers: administrator.canManageUsers !== false,
          canManageVehicles: true,
          canManageMaintenance: true,
          canViewReports: true
        },
        isActive: true
      });
      
      if (!mainBranch) {
        console.log(`🏢 ${company.name} - Creando sucursal principal...`);
        
        // Crear sucursal principal usando el ID del usuario recién creado
        mainBranch = await Branch.create({
          name: 'Sucursal Principal',
          code: 'MAIN',
          companyId: company.id,
          address: {
            street: 'Por definir',
            city: 'Por definir',
            state: 'Por definir',
            zipCode: '00000',
            country: 'España'
          },
          contact: {
            phone: administrator.phone || '',
            email: administrator.email
          },
          isActive: true,
          createdById: adminUser.id
        });
        
        console.log(`✅ ${company.name} - Sucursal principal creada`);
      }
      
      // Actualizar el usuario con el branchId y el rol correcto
      await adminUser.update({ 
        branchId: mainBranch.id,
        role: 'company_admin' // Ahora establecer el rol correcto
      });
      
      // Actualizar el campo administrator con el userId
      await company.update({
        administrator: {
          ...administrator,
          userId: adminUser.id
        }
      });
      
      console.log(`🎉 ${company.name} - Usuario administrador creado: ${adminUser.email} (contraseña temporal: admin123)`);
      createdCount++;
    }
    
    console.log('\n📈 Resumen:');
    console.log(`   🎉 Usuarios administradores creados: ${createdCount}`);
    
    if (createdCount > 0) {
      console.log('\n⚠️  IMPORTANTE: Los usuarios creados tienen contraseña temporal "admin123"');
      console.log('   Se recomienda que cambien su contraseña en el primer login.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar la creación
createMissingAdmin();