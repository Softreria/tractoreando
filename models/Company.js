const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Company extends Model {
  // Método para obtener configuración por defecto
  getDefaultSettings() {
    return {
      currency: 'EUR',
      timezone: 'Europe/Madrid',
      maintenanceReminders: true,
      emailNotifications: true,
      subscription: {
        plan: 'basic',
        maxUsers: 10,
        maxVehicles: 25,
        maxBranches: 5,
        features: ['basic_maintenance', 'basic_reports'],
        startDate: null,
        endDate: null,
        isActive: true
      }
    };
  }

  // Método toJSON personalizado
  toJSON() {
    const values = { ...this.get() };
    delete values.createdAt;
    delete values.updatedAt;
    return values;
  }
}

Company.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  taxId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('address');
      return value ? JSON.parse(value) : null;
    },
    set(value) {
      this.setDataValue('address', value ? JSON.stringify(value) : null);
    }
  },
  contact: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('contact');
      return value ? JSON.parse(value) : null;
    },
    set(value) {
      this.setDataValue('contact', value ? JSON.stringify(value) : null);
    }
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  settings: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('settings');
      return value ? JSON.parse(value) : this.getDefaultSettings();
    },
    set(value) {
      this.setDataValue('settings', value ? JSON.stringify(value) : null);
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  modelName: 'Company',
  tableName: 'Companies',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['taxId']
    },
    {
      fields: ['name']
    },
    {
      fields: ['isActive']
    }
  ]
});

// Definir asociaciones
Company.associate = (models) => {
  Company.hasMany(models.User, {
    foreignKey: 'companyId',
    as: 'users'
  });
  
  Company.hasMany(models.Branch, {
    foreignKey: 'companyId',
    as: 'branches'
  });
  
  Company.hasMany(models.Vehicle, {
    foreignKey: 'companyId',
    as: 'vehicles'
  });
  
  Company.hasMany(models.Maintenance, {
    foreignKey: 'companyId',
    as: 'maintenances'
  });
};

module.exports = Company;