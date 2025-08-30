const { sequelize } = require('./config/database');

async function fixMaintenancesIsActive() {
  try {
    console.log('Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida');

    // Actualizar columna isActive en Maintenances
    console.log('Actualizando columna isActive en Maintenances...');
    await sequelize.query('ALTER TABLE "Maintenances" ALTER COLUMN "isActive" DROP DEFAULT;');
    await sequelize.query(`
      ALTER TABLE "Maintenances" 
      ALTER COLUMN "isActive" TYPE BOOLEAN 
      USING CASE 
        WHEN "isActive" = 1 THEN true 
        WHEN "isActive" = 0 THEN false 
        ELSE "isActive"::boolean 
      END;
    `);
    await sequelize.query('ALTER TABLE "Maintenances" ALTER COLUMN "isActive" SET DEFAULT true;');
    console.log('✅ Columna isActive en Maintenances actualizada');

    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en la migración:', error);
  } finally {
    await sequelize.close();
  }
}

fixMaintenancesIsActive();