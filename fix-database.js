require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
});

const { sequelize } = require('./models');

const fixDatabase = async () => {
  try {
    console.log('🔄 Conectando a PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ PostgreSQL conectado exitosamente');
    
    // Verificar estructura de tabla Vehicles
    console.log('🔍 Verificando estructura de tabla Vehicles...');
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Vehicles' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Columnas actuales en tabla Vehicles:');
    results.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Verificar si existe branchId
    const branchIdExists = results.some(col => col.column_name === 'branchId');
    console.log(`🔍 Columna branchId existe: ${branchIdExists ? 'SÍ' : 'NO'}`);
    
    if (!branchIdExists) {
      console.log('🔧 Agregando columna branchId...');
      await sequelize.query(`
        ALTER TABLE "Vehicles" 
        ADD COLUMN "branchId" VARCHAR(255) REFERENCES "Branches"("id");
      `);
      console.log('✅ Columna branchId agregada exitosamente');
    }
    
    console.log('🔌 Cerrando conexión...');
    await sequelize.close();
    console.log('✅ Proceso completado');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

fixDatabase();
