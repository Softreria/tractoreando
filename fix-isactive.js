const { sequelize } = require('./config/database');

async function fixIsActiveColumns() {
  try {
    console.log('Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida');

    // Actualizar columna isActive en Users
    console.log('Actualizando columna isActive en Users...');
    await sequelize.query('ALTER TABLE "Users" ALTER COLUMN "isActive" DROP DEFAULT;');
    await sequelize.query(`
      ALTER TABLE "Users" 
      ALTER COLUMN "isActive" TYPE BOOLEAN 
      USING CASE 
        WHEN "isActive" = 1 THEN true 
        WHEN "isActive" = 0 THEN false 
        ELSE "isActive"::boolean 
      END;
    `);
    await sequelize.query('ALTER TABLE "Users" ALTER COLUMN "isActive" SET DEFAULT true;');
    console.log('✅ Columna isActive en Users actualizada');

    // Actualizar columna isActive en Branches
    console.log('Actualizando columna isActive en Branches...');
    await sequelize.query('ALTER TABLE "Branches" ALTER COLUMN "isActive" DROP DEFAULT;');
    await sequelize.query(`
      ALTER TABLE "Branches" 
      ALTER COLUMN "isActive" TYPE BOOLEAN 
      USING CASE 
        WHEN "isActive" = 1 THEN true 
        WHEN "isActive" = 0 THEN false 
        ELSE "isActive"::boolean 
      END;
    `);
    await sequelize.query('ALTER TABLE "Branches" ALTER COLUMN "isActive" SET DEFAULT true;');
    console.log('✅ Columna isActive en Branches actualizada');

    // Actualizar columna isActive en Vehicles
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

fixIsActiveColumns();