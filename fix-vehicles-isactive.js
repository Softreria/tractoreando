const { sequelize } = require('./config/database');

async function fixVehiclesIsActive() {
  try {
    console.log('Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida');

    // Actualizar solo columna isActive en Vehicles
    console.log('Actualizando columna isActive en Vehicles...');
    await sequelize.query('ALTER TABLE "Vehicles" ALTER COLUMN "isActive" DROP DEFAULT;');
    await sequelize.query(`
      ALTER TABLE "Vehicles" 
      ALTER COLUMN "isActive" TYPE BOOLEAN 
      USING CASE 
        WHEN "isActive" = 1 THEN true 
        WHEN "isActive" = 0 THEN false 
        ELSE "isActive"::boolean 
      END;
    `);
    await sequelize.query('ALTER TABLE "Vehicles" ALTER COLUMN "isActive" SET DEFAULT true;');
    console.log('✅ Columna isActive en Vehicles actualizada');

    console.log('✅ Migración de Vehicles completada exitosamente');
  } catch (error) {
    console.error('❌ Error en la migración:', error);
  } finally {
    await sequelize.close();
  }
}

fixVehiclesIsActive();