const { sequelize } = require('../config/database');

// Importar todos los modelos
const User = require('./User');
const Company = require('./Company');
const Branch = require('./Branch');
const Vehicle = require('./Vehicle');
const Maintenance = require('./Maintenance');

// Crear objeto con todos los modelos
const models = {
  User,
  Company,
  Branch,
  Vehicle,
  Maintenance
};

// Configurar asociaciones
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Exportar modelos y sequelize
module.exports = {
  ...models,
  sequelize
};