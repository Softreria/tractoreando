const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configuración de la base de datos PostgreSQL
const sequelize = new Sequelize(
  process.env.DB_NAME || 'tractoreando',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false
    }
  }
);

// Función para conectar a la base de datos
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida correctamente.');
    
    // Sincronizar modelos en desarrollo
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Modelos sincronizados con la base de datos.');
    }
  } catch (error) {
    console.error('❌ Error al conectar con PostgreSQL:', error);
    process.exit(1);
  }
};

// Función para cerrar la conexión
const closeDB = async () => {
  try {
    await sequelize.close();
    console.log('✅ Conexión a PostgreSQL cerrada correctamente.');
  } catch (error) {
    console.error('❌ Error al cerrar la conexión:', error);
  }
};

module.exports = {
  sequelize,
  connectDB,
  closeDB
};