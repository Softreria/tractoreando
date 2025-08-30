const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configuración de PostgreSQL para todos los entornos
const config = {
  development: {
    dialect: 'postgres',
    database: process.env.DB_NAME || 'tractoreando_dev',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === 'true',
    logging: console.log,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false
    }
  },
  production: {
    dialect: 'postgres',
    database: process.env.DB_NAME || 'tractoreando',
    username: process.env.DB_USER || 'tractoreando_user',
    password: process.env.DB_PASSWORD || 'tractoreando123',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === 'true',
    logging: false,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false
    }
  }
};

// Crear instancia de Sequelize basada en el entorno
const env = process.env.NODE_ENV || 'development';
const sequelize = new Sequelize(config[env]);

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