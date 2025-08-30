const { sequelize } = require('./config/database');

async function fixCompaniesIsActive() {
  try {
    console.log('Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida');

    // Actualizar columna isActive en Companies
    console.log('Actualizando columna isActive en Companies...');
    await sequelize.query('ALTER TABLE "Companies" ALTER COLUMN "isActive" DROP DEFAULT;');
    await sequelize.query(`
      ALTER TABLE "Companies" 
      ALTER COLUMN "isActive" TYPE BOOLEAN 
      USING CASE 
        WHEN "isActive" = 1 THEN true 
        WHEN "isActive" = 0 THEN false 
        ELSE "isActive"::boolean 
      END;
    `);
    await sequelize.query('ALTER TABLE "Companies" ALTER COLUMN "isActive" SET DEFAULT true;');
    console.log('✅ Columna isActive en Companies actualizada');

    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en la migración:', error);
  } finally {
    await sequelize.close();
  }
}

fixCompaniesIsActive();