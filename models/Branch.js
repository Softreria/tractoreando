const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Branch extends Model {
  // Método para verificar si está abierto ahora
  isOpenNow() {
    const now = new Date();
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    const todayHours = this.operatingHours[dayOfWeek];
    if (!todayHours || !todayHours.isOpen) return false;
    
    return currentTime >= todayHours.open && currentTime <= todayHours.close;
  }

  // Método para obtener dirección completa
  getFullAddress() {
    const addr = this.address;
    return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`;
  }

  // Método toJSON personalizado
  toJSON() {
    const values = Object.assign({}, this.get());
    return values;
  }
}

Branch.init({
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
  type: {
    type: DataTypes.ENUM('delegacion', 'finca', 'subempresa', 'oficina', 'almacen', 'taller'),
    defaultValue: 'delegacion'
  },
  code: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 10]
    },
    set(value) {
      this.setDataValue('code', value.toUpperCase().trim());
    }
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Companies',
      key: 'id'
    }
  },
  address: {
    type: DataTypes.JSONB,
    allowNull: false,
    validate: {
      isValidAddress(value) {
        if (!value || typeof value !== 'object') {
          throw new Error('Address is required and must be an object');
        }
        if (!value.street || !value.city || !value.state || !value.zipCode) {
          throw new Error('Street, city, state, and zipCode are required in address');
        }
      }
    },
    defaultValue: {
      street: null,
      city: null,
      state: null,
      zipCode: null,
      country: 'España',
      coordinates: {
        latitude: null,
        longitude: null
      }
    }
  },
  contact: {
    type: DataTypes.JSONB,
    defaultValue: {
      phone: null,
      email: null,
      manager: null
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
      if (value && value.phone) {
        value.phone = value.phone.trim();
      }
      if (value && value.manager) {
        value.manager = value.manager.trim();
      }
      this.setDataValue('contact', value);
    }
  },
  operatingHours: {
    type: DataTypes.JSONB,
    defaultValue: {
      monday: { open: null, close: null, isOpen: true },
      tuesday: { open: null, close: null, isOpen: true },
      wednesday: { open: null, close: null, isOpen: true },
      thursday: { open: null, close: null, isOpen: true },
      friday: { open: null, close: null, isOpen: true },
      saturday: { open: null, close: null, isOpen: false },
      sunday: { open: null, close: null, isOpen: false }
    },
    validate: {
      isValidOperatingHours(value) {
        if (value && typeof value !== 'object') {
          throw new Error('Operating hours must be an object');
        }
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        if (value) {
          for (const day of validDays) {
            if (value[day] && typeof value[day] !== 'object') {
              throw new Error(`Operating hours for ${day} must be an object`);
            }
          }
        }
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'Branch',
  tableName: 'Branches',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['companyId', 'code']
    },
    {
      fields: ['companyId', 'name']
    },
    {
      fields: ['companyId', 'isActive']
    },
    {
      fields: [sequelize.literal("(address->>'city')"), sequelize.literal("(address->>'state')")],
      name: 'branches_address_city_state_idx'
    }
  ],
  hooks: {
    beforeSave: async (branch, options) => {
      // Normalizar código
      if (branch.changed('code') && branch.code) {
        branch.code = branch.code.toUpperCase().trim();
      }
    }
  }
});

// Definir asociaciones
Branch.associate = (models) => {
  Branch.belongsTo(models.Company, {
    foreignKey: 'companyId',
    as: 'company'
  });
  
  Branch.belongsTo(models.User, {
    foreignKey: 'createdById',
    as: 'createdBy'
  });
  
  Branch.hasMany(models.Vehicle, {
    foreignKey: 'branchId',
    as: 'vehicles'
  });
  
  Branch.hasMany(models.Maintenance, {
    foreignKey: 'branchId',
    as: 'maintenances'
  });
  
  Branch.hasMany(models.User, {
    foreignKey: 'branchId',
    as: 'users'
  });
};

module.exports = Branch;