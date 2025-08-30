const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Company extends Model {
  // Método toJSON personalizado
  toJSON() {
    const values = Object.assign({}, this.get());
    return values;
  }
}

Company.init({
  id: {
    type: DataTypes.STRING,
    defaultValue: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  cif: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    },
    set(value) {
      this.setDataValue('cif', value.toUpperCase().trim());
    }
  },
  address: {
    type: DataTypes.TEXT,
    defaultValue: JSON.stringify({
      street: null,
      city: null,
      state: null,
      zipCode: null,
      country: 'España',
      additionalInfo: null
    }),
    get() {
      const value = this.getDataValue('address');
      return value ? JSON.parse(value) : null;
    },
    set(value) {
      this.setDataValue('address', JSON.stringify(value));
    },
    validate: {
      isValidAddress(value) {
        // Parse JSON string if needed
        const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
        if (parsedValue && typeof parsedValue !== 'object') {
          throw new Error('Address must be an object');
        }
        if (parsedValue && parsedValue.additionalInfo && parsedValue.additionalInfo.length > 200) {
          throw new Error('Additional info cannot exceed 200 characters');
        }
      }
    }
  },
  contact: {
    type: DataTypes.TEXT,
    defaultValue: JSON.stringify({
      phone: null,
      email: null,
      website: null
    }),
    get() {
      const value = this.getDataValue('contact');
      return value ? JSON.parse(value) : null;
    },
    validate: {
      isValidContact(value) {
        // Parse JSON string if needed
        const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
        if (parsedValue && typeof parsedValue !== 'object') {
          throw new Error('Contact must be an object');
        }
        if (parsedValue && parsedValue.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsedValue.email)) {
          throw new Error('Invalid email format in contact');
        }
      }
    },
    set(value) {
      if (value && value.email) {
        value.email = value.email.toLowerCase().trim();
      }
      this.setDataValue('contact', JSON.stringify(value));
    }
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  settings: {
    type: DataTypes.TEXT,
    defaultValue: JSON.stringify({
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
    }),
    get() {
      const value = this.getDataValue('settings');
      return value ? JSON.parse(value) : null;
    },
    set(value) {
      this.setDataValue('settings', JSON.stringify(value));
    },
    validate: {
      isValidSettings(value) {
        // Parse JSON string if needed
        const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
        if (parsedValue && typeof parsedValue !== 'object') {
          throw new Error('Settings must be an object');
        }
      }
    }
  },
  administrator: {
    type: DataTypes.TEXT,
    defaultValue: JSON.stringify({
      firstName: null,
      lastName: null,
      email: null,
      phone: null,
      canManageUsers: true,
      userId: null
    }),
    get() {
      const value = this.getDataValue('administrator');
      return value ? JSON.parse(value) : null;
    },
    validate: {
      isValidAdministrator(value) {
        // Parse JSON string if needed
        const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
        if (parsedValue && typeof parsedValue !== 'object') {
          throw new Error('Administrator must be an object');
        }
        if (parsedValue && parsedValue.firstName && parsedValue.firstName.length > 50) {
          throw new Error('Administrator firstName cannot exceed 50 characters');
        }
        if (parsedValue && parsedValue.lastName && parsedValue.lastName.length > 50) {
          throw new Error('Administrator lastName cannot exceed 50 characters');
        }
        if (parsedValue && parsedValue.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsedValue.email)) {
          throw new Error('Invalid email format in administrator');
        }
      }
    },
    set(value) {
      if (value && value.email) {
        value.email = value.email.toLowerCase().trim();
      }
      if (value && value.firstName) {
        value.firstName = value.firstName.trim();
      }
      if (value && value.lastName) {
        value.lastName = value.lastName.trim();
      }
      if (value && value.phone) {
        value.phone = value.phone.trim();
      }
      this.setDataValue('administrator', JSON.stringify(value));
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdById: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'Company',
  tableName: 'Companies',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['cif']
    },
    {
      fields: ['name']
    },
    {
      fields: ['isActive']
    }
  ],
  hooks: {
    beforeSave: async (company, options) => {
      // Normalizar CIF
      if (company.changed('cif') && company.cif) {
        company.cif = company.cif.toUpperCase().trim();
      }
    }
  }
});

// Definir asociaciones
Company.associate = (models) => {
  Company.belongsTo(models.User, {
    foreignKey: 'createdById',
    as: 'createdBy'
  });
  
  Company.hasMany(models.Branch, {
    foreignKey: 'companyId',
    as: 'branches'
  });
  
  Company.hasMany(models.Vehicle, {
    foreignKey: 'companyId',
    as: 'vehicles'
  });
  
  Company.hasMany(models.User, {
    foreignKey: 'companyId',
    as: 'users'
  });
};

module.exports = Company;