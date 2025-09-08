const { sequelize } = require('./models');
const User = require('./models/User');
const Company = require('./models/Company');

async function fixCompanyAdministrators() {
  try {
    console.log('🔧 Corrigiendo vinculación de administradores en empresas...');
    
    // Buscar todas las empresas
    const companies = await Company.findAll({
      where: {
        isActive: true
      }
    });
    
    console.log(`📊 Encontradas ${companies.length} empresas activas`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const company of companies) {
      const administrator = company.administrator;
      
      // Verificar si ya tiene userId vinculado
      if (administrator && administrator.userId) {
        console.log(`✅ ${company.name} - Ya tiene administrador vinculado (${administrator.firstName} ${administrator.lastName})`);
        skippedCount++;
        continue;
      }
      
      // Buscar el usuario administrador de esta empresa
      const adminUser = await User.findOne({
        where: {
          companyId: company.id,
          role: 'company_admin',
          isActive: true
        }
      });
      
      if (!adminUser) {
        console.log(`⚠️  ${company.name} - No se encontró usuario administrador`);
        continue;
      }
      
      // Actualizar el campo administrator con el userId
      const updatedAdministrator = {
        firstName: administrator?.firstName || adminUser.firstName,
        lastName: administrator?.lastName || adminUser.lastName,
        email: administrator?.email || adminUser.email,
        phone: administrator?.phone || adminUser.phone,
        canManageUsers: administrator?.canManageUsers !== false,
        userId: adminUser.id
      };
      
      await company.update({
        administrator: updatedAdministrator
      });
      
      console.log(`🔧 ${company.name} - Vinculado administrador: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.email})`);
      fixedCount++;
    }
    
    console.log('\n📈 Resumen:');
    console.log(`   ✅ Empresas ya correctas: ${skippedCount}`);
    console.log(`   🔧 Empresas corregidas: ${fixedCount}`);
    console.log(`   📊 Total procesadas: ${companies.length}`);
    
    if (fixedCount > 0) {
      console.log('\n🎉 ¡Corrección completada! Ahora los administradores de empresa deberían poder gestionar usuarios correctamente.');
    } else {
      console.log('\n✅ No se requirieron correcciones.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar la corrección
fixCompanyAdministrators();