require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
});

const { sequelize } = require('./models');

const initDatabase = async () => {
  try {
    console.log('🔄 Iniciando sincronización de base de datos...');
    
    // Autenticar conexión
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida correctamente.');
    
    // Sincronizar modelos (crear tablas si no existen)
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Tablas sincronizadas correctamente.');
    
    // Verificar tablas creadas
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    console.log('📋 Tablas en la base de datos:', tables);
    
    console.log('🎉 Inicialización de base de datos completada exitosamente.');
    
  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
    console.error('💥 Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔒 Conexión cerrada.');
    process.exit(0);
  }
};

// Ejecutar inicialización
initDatabase();