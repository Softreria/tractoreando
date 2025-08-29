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
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
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
    type: DataTypes.JSONB,
    defaultValue: {
      street: null,
      city: null,
      state: null,
      zipCode: null,
      country: 'España',
      additionalInfo: null
    },
    validate: {
      isValidAddress(value) {
        if (value && typeof value !== 'object') {
          throw new Error('Address must be an object');
        }
        if (value && value.additionalInfo && value.additionalInfo.length > 200) {
          throw new Error('Additional info cannot exceed 200 characters');
        }
      }
    }
  },
  contact: {
    type: DataTypes.JSONB,
    defaultValue: {
      phone: null,
      email: null,
      website: null
    },
    validate: {
      isValidContact(value) {
        if (value && typeof value !== 'object') {
          throw new Error('Contact must be an object');
        }
        if (value && value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
          throw new Error('Invalid email format in contact');
        }
      }
    },
    set(value) {
      if (value && value.email) {
        value.email = value.email.toLowerCase().trim();
      }
      this.setDataValue('contact', value);
    }
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      currency: 'EUR',
      timezone: 'Europe/Madrid',
      maintenanceReminders: true,
      emailNotifications: true
    },
    validate: {
      isValidSettings(value) {
        if (value && typeof value !== 'object') {
          throw new Error('Settings must be an object');
        }
      }
    }
  },
  administrator: {
    type: DataTypes.JSONB,
    defaultValue: {
      firstName: null,
      lastName: null,
      email: null,
      phone: null,
      canManageUsers: true,
      userId: null
    },
    validate: {
      isValidAdministrator(value) {
        if (value && typeof value !== 'object') {
          throw new Error('Administrator must be an object');
        }
        if (value && value.firstName && value.firstName.length > 50) {
          throw new Error('Administrator firstName cannot exceed 50 characters');
        }
        if (value && value.lastName && value.lastName.length > 50) {
          throw new Error('Administrator lastName cannot exceed 50 characters');
        }
        if (value && value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
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
      this.setDataValue('administrator', value);
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdById: {
    type: DataTypes.UUID,
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
    },
    {
      fields: [sequelize.literal("(administrator->>'email')")],
      name: 'companies_administrator_email_idx'
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