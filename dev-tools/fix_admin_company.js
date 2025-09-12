const { sequelize } = require('./models');
const User = require('./models/User');
const Company = require('./models/Company');

async function fixAdminCompany() {
  try {
    console.log('🔧 Asignando usuario admin a la empresa...');
    
    // Buscar el usuario admin
    const adminUser = await User.findOne({
      where: { email: 'admin@tractoreando.com' }
    });
    
    if (!adminUser) {
      console.log('❌ Usuario admin no encontrado');
      return;
    }
    
    console.log(`✅ Usuario admin encontrado: ${adminUser.firstName} ${adminUser.lastName}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   CompanyId actual: ${adminUser.companyId || 'null'}`);
    
    // Buscar la empresa SOFTRERIA SL
    const company = await Company.findOne({
      where: { name: 'SOFTRERIA SL' }
    });
    
    if (!company) {
      console.log('❌ Empresa SOFTRERIA SL no encontrada');
      return;
    }
    
    console.log(`✅ Empresa encontrada: ${company.name}`);
    console.log(`   ID: ${company.id}`);
    console.log(`   Activa: ${company.isActive}`);
    
    // Asignar la empresa al usuario admin
    await adminUser.update({
      companyId: company.id
    });
    
    console.log('\n🎉 ¡Usuario admin asignado exitosamente a la empresa!');
    console.log(`   ${adminUser.firstName} ${adminUser.lastName} ahora pertenece a ${company.name}`);
    
    // Verificar la asignación
    const updatedUser = await User.findOne({
      where: { email: 'admin@tractoreando.com' },
      include: [{
        model: Company,
        as: 'company',
        attributes: ['name', 'isActive']
      }]
    });
    
    if (updatedUser && updatedUser.company) {
      console.log('\n✅ Verificación exitosa:');
      console.log(`   Usuario: ${updatedUser.firstName} ${updatedUser.lastName}`);
      console.log(`   Empresa: ${updatedUser.company.name}`);
      console.log(`   Empresa activa: ${updatedUser.company.isActive}`);
      console.log('\n🔧 Ahora debería ser posible crear mantenimientos.');
    } else {
      console.log('❌ Error en la verificación');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar la corrección
fixAdminCompany();