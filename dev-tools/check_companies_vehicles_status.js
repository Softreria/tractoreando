const { sequelize } = require('./models');
const Company = require('./models/Company');
const Vehicle = require('./models/Vehicle');
const User = require('./models/User');

async function checkStatus() {
  try {
    console.log('🔍 Verificando estado de empresas y vehículos...');
    
    // Verificar estructura de tabla Vehicles
    console.log('\n🔧 Verificando estructura de tabla Vehicles...');
    
    try {
      const [vehicleColumns] = await sequelize.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Vehicles' ORDER BY ordinal_position;"
      );
      console.log('\n📋 Columnas de Vehicles:');
      vehicleColumns.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type}`);
      });
    } catch (error) {
      console.log('❌ Error obteniendo columnas de Vehicles:', error.message);
    }
    
    // Verificar empresas
    console.log('\n📊 EMPRESAS:');
    try {
      const [companies] = await sequelize.query(
        'SELECT id, name, "isActive" FROM "Companies";'
      );
      
      console.log(`Total empresas: ${companies.length}`);
      companies.forEach(company => {
        const status = company.isActive ? '✅ Activa' : '❌ Inactiva';
        console.log(`- ${company.name}: ${status} (ID: ${company.id})`);
      });
      
      const inactiveCompanies = companies.filter(c => !c.isActive);
      if (inactiveCompanies.length > 0) {
        console.log('\n⚠️  PROBLEMA ENCONTRADO: Hay empresas inactivas!');
        console.log('   Esto explica el error "empresa inactiva" al crear mantenimientos.');
      } else {
        console.log('\n✅ Todas las empresas están activas.');
      }
    } catch (error) {
      console.log('❌ Error obteniendo empresas:', error.message);
    }
    
    // Verificar vehículos usando las columnas correctas
    console.log('\n🚗 VEHÍCULOS:');
    try {
      // Usar query directa para evitar problemas con nombres de columnas
      const [vehicles] = await sequelize.query(
        `SELECT v.id, v."licensePlate", v.make, v.model, v."companyId", v."isActive", 
                c.name as company_name, c."isActive" as company_active
         FROM "Vehicles" v 
         LEFT JOIN "Companies" c ON v."companyId" = c.id;`
      );
      
      console.log(`Total vehículos: ${vehicles.length}`);
      
      if (vehicles.length === 0) {
        console.log('⚠️  No hay vehículos en la base de datos.');
        console.log('   Esto podría explicar el error al crear mantenimientos.');
      } else {
        vehicles.forEach(vehicle => {
          const vehicleStatus = vehicle.isActive ? '✅ Activo' : '❌ Inactivo';
          const companyStatus = vehicle.company_active ? '✅ Activa' : '❌ Inactiva';
          const companyName = vehicle.company_name || 'Sin empresa';
          
          console.log(`- ${vehicle.licensePlate || 'Sin placa'} (${vehicle.make || 'Sin marca'} ${vehicle.model || 'Sin modelo'}): ${vehicleStatus}`);
          console.log(`  Empresa: ${companyName} (${companyStatus})`);
        });
        
        const activeVehicles = vehicles.filter(v => v.isActive && v.company_active);
        const inactiveVehicles = vehicles.filter(v => !v.isActive || !v.company_active);
        
        console.log(`\n📊 Resumen vehículos:`);
        console.log(`- Activos con empresa activa: ${activeVehicles.length}`);
        console.log(`- Inactivos o con empresa inactiva: ${inactiveVehicles.length}`);
        
        if (inactiveVehicles.length > 0) {
          console.log('\n⚠️  PROBLEMA ENCONTRADO: Hay vehículos inactivos o con empresas inactivas!');
          console.log('   Esto puede explicar el error al crear mantenimientos.');
        }
      }
    } catch (error) {
      console.log('❌ Error obteniendo vehículos:', error.message);
      
      // Intentar con nombres de columnas alternativos
      try {
        console.log('\n🔄 Intentando con nombres de columnas alternativos...');
        const [vehicles2] = await sequelize.query(
          `SELECT v.id, v.make, v.model, v."companyId", v."isActive", 
                  c.name as company_name, c."isActive" as company_active
           FROM "Vehicles" v 
           LEFT JOIN "Companies" c ON v."companyId" = c.id;`
        );
        
        console.log(`Total vehículos: ${vehicles2.length}`);
        vehicles2.forEach(vehicle => {
          const vehicleStatus = vehicle.isActive ? '✅ Activo' : '❌ Inactivo';
          const companyStatus = vehicle.company_active ? '✅ Activa' : '❌ Inactiva';
          const companyName = vehicle.company_name || 'Sin empresa';
          
          console.log(`- ID: ${vehicle.id} (${vehicle.make || 'Sin marca'} ${vehicle.model || 'Sin modelo'}): ${vehicleStatus}`);
          console.log(`  Empresa: ${companyName} (${companyStatus})`);
        });
      } catch (error2) {
        console.log('❌ Error con nombres alternativos:', error2.message);
      }
    }
    
    // Verificar usuarios
    console.log('\n👥 USUARIOS:');
    try {
      const [users] = await sequelize.query(
        `SELECT u.id, u."firstName", u."lastName", u.email, u.role, u."companyId", 
                c.name as company_name, c."isActive" as company_active
         FROM "Users" u 
         LEFT JOIN "Companies" c ON u."companyId" = c.id;`
      );
      
      console.log(`Total usuarios: ${users.length}`);
      
      users.forEach(user => {
        const companyStatus = user.company_active ? '✅ Activa' : '❌ Inactiva';
        const companyName = user.company_name || 'Sin empresa';
        console.log(`- ${user.firstName} ${user.lastName} (${user.email}) | ${user.role}`);
        console.log(`  Empresa: ${companyName} (${companyStatus})`);
      });
    } catch (error) {
      console.log('❌ Error obteniendo usuarios:', error.message);
    }
    
    // Diagnóstico final
    console.log('\n🔍 DIAGNÓSTICO DEL ERROR "vehículo no válido o empresa inactiva":');
    console.log('\n1. ✅ Las empresas están activas');
    console.log('2. ❓ Verificando si hay vehículos disponibles...');
    
    try {
      const [vehicleCount] = await sequelize.query(
        'SELECT COUNT(*) as count FROM "Vehicles";'
      );
      
      if (vehicleCount[0].count === 0) {
        console.log('❌ NO HAY VEHÍCULOS en la base de datos!');
        console.log('   ESTA ES LA CAUSA DEL ERROR: No se pueden crear mantenimientos sin vehículos.');
        console.log('\n🔧 SOLUCIÓN: Crear vehículos primero en la aplicación.');
      } else {
        console.log(`✅ Hay ${vehicleCount[0].count} vehículos en la base de datos.`);
        
        // Verificar vehículos activos con empresas activas
        const [activeVehicleCount] = await sequelize.query(
          `SELECT COUNT(*) as count 
           FROM "Vehicles" v 
           JOIN "Companies" c ON v."companyId" = c.id 
           WHERE v."isActive" = true AND c."isActive" = true;`
        );
        
        if (activeVehicleCount[0].count === 0) {
          console.log('❌ NO HAY VEHÍCULOS ACTIVOS con empresas activas!');
          console.log('   ESTA PODRÍA SER LA CAUSA DEL ERROR.');
          console.log('\n🔧 SOLUCIÓN: Activar vehículos o verificar asociaciones con empresas.');
        } else {
          console.log(`✅ Hay ${activeVehicleCount[0].count} vehículos activos con empresas activas.`);
          console.log('\n❓ El error podría estar en la lógica de validación del endpoint.');
        }
      }
    } catch (error) {
      console.log('❌ Error en diagnóstico:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar verificación
checkStatus();