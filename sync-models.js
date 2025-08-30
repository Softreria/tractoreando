require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
});

const { sequelize } = require('./models');

const syncModels = async () => {
  try {
    console.log('🔄 Conectando a PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ PostgreSQL conectado exitosamente');
    
    console.log('🔄 Sincronizando modelos (force: true)...');
    await sequelize.sync({ force: true });
    console.log('✅ Modelos sincronizados exitosamente');
    
    console.log('🔌 Cerrando conexión...');
    await sequelize.close();
    console.log('✅ Proceso completado');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

syncModels();