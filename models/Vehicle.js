const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Vehicle extends Model {
  // Método para verificar si necesita cambio de aceite
  needsOilChange() {
    try {
      const schedule = this.maintenanceSchedule?.oilChange;
      if (!schedule) return false;
      
      const kmSinceLastChange = (this.odometer?.current || 0) - (schedule.lastKm || 0);
      const monthsSinceLastChange = schedule.lastDate ? 
        Math.floor((Date.now() - new Date(schedule.lastDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 999;
      
      return kmSinceLastChange >= (schedule.intervalKm || 5000) || monthsSinceLastChange >= (schedule.intervalMonths || 6);
    } catch (error) {
      console.error('Error in needsOilChange:', error);
      return false;
    }
  }

  // Método para verificar si necesita inspección
  needsInspection() {
    try {
      const schedule = this.maintenanceSchedule?.generalInspection;
      if (!schedule) return false;
      
      const kmSinceLastInspection = (this.odometer?.current || 0) - (schedule.lastKm || 0);
      const monthsSinceLastInspection = schedule.lastDate ? 
        Math.floor((Date.now() - new Date(schedule.lastDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 999;
      
      return kmSinceLastInspection >= (schedule.intervalKm || 10000) || monthsSinceLastInspection >= (schedule.intervalMonths || 12);
    } catch (error) {
      console.error('Error in needsInspection:', error);
      return false;
    }
  }

  // Método para obtener documentos que expiran pronto
  getExpiringDocuments(daysAhead = 30) {
    try {
      const expiringDocs = [];
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() + daysAhead);
      
      // Verificar ITV
      if (this.specifications?.itv?.expiryDate) {
        const itvExpiryDate = new Date(this.specifications.itv.expiryDate);
        if (itvExpiryDate <= checkDate) {
          expiringDocs.push({
            type: 'itv',
            expiryDate: itvExpiryDate,
            daysUntilExpiry: Math.ceil((itvExpiryDate - new Date()) / (1000 * 60 * 60 * 24))
          });
        }
      }
      
      // Verificar seguro
      if (this.specifications?.insurance?.expiryDate) {
        const insuranceExpiryDate = new Date(this.specifications.insurance.expiryDate);
        if (insuranceExpiryDate <= checkDate) {
          expiringDocs.push({
            type: 'insurance',
            expiryDate: insuranceExpiryDate,
            daysUntilExpiry: Math.ceil((insuranceExpiryDate - new Date()) / (1000 * 60 * 60 * 24))
          });
        }
      }
      
      return expiringDocs;
    } catch (error) {
      console.error('Error in getExpiringDocuments:', error);
      return [];
    }
  }

  // Método para verificar si es vehículo de alquiler
  isRental() {
    return this.ownership.type === 'alquiler';
  }

  // Método para obtener el costo mensual (solo para alquileres)
  getMonthlyRentalCost() {
    return this.isRental() ? this.ownership.monthlyRentalPrice || 0 : 0;
  }

  // Método para verificar quién es responsable de los costos de mantenimiento
  getMaintenanceResponsibility() {
    if (!this.isRental()) return 'empresa_propietaria';
    return this.ownership.maintenanceCostResponsibility || 'empresa_propietaria';
  }

  // Método para actualizar odómetro
  async updateOdometer(newKm, updateDate = new Date()) {
    if (newKm > this.odometer.current) {
      this.odometer = {
        ...this.odometer,
        current: newKm,
        lastUpdate: updateDate
      };
      return this.save();
    }
    return Promise.resolve(this);
  }

  // Propiedades virtuales
  get fullName() {
    return `${this.year} ${this.make} ${this.model}`;
  }

  get age() {
    return new Date().getFullYear() - this.year;
  }

  // Método toJSON personalizado
  toJSON() {
    const values = Object.assign({}, this.get());
    // Agregar propiedades virtuales
    values.fullName = this.fullName;
    values.age = this.age;
    return values;
  }
}

Vehicle.init({
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
  plateNumber: {
    type: DataTypes.STRING(15),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 15]
    },
    set(value) {
      this.setDataValue('plateNumber', value.toUpperCase().trim());
    }
  },
  make: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50]
    }
  },
  model: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50]
    }
  },
  vin: {
    type: DataTypes.STRING(17),
    allowNull: true,
    validate: {
      len: [0, 17]
    },
    set(value) {
      if (value) {
        this.setDataValue('vin', value.toUpperCase().trim());
      }
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
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Branches',
      key: 'id'
    }
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1900,
      max: new Date().getFullYear() + 1
    }
  },
  color: {
    type: DataTypes.STRING(30),
    allowNull: true,
    validate: {
      len: [0, 30]
    }
  },
  vehicleType: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      isIn: [['Tractor', 'Camión', 'Furgoneta', 'Coche', 'Motocicleta', 'Remolque', 'Maquinaria', 'Otro']]
    }
  },
  engine: {
    type: DataTypes.TEXT,
    defaultValue: JSON.stringify({
      type: null,
      displacement: null,
      cylinders: null,
      horsepower: null,
      torque: null
    }),
    get() {
      const value = this.getDataValue('engine');
      return value ? JSON.parse(value) : { type: null, displacement: null, cylinders: null, horsepower: null, torque: null };
    },
    set(value) {
      this.setDataValue('engine', JSON.stringify(value || { type: null, displacement: null, cylinders: null, horsepower: null, torque: null }));
    },
    validate: {
      isValidEngine(value) {
        if (!value) return;
        
        let parsedValue = value;
        if (typeof value === 'string') {
          try {
            parsedValue = JSON.parse(value);
          } catch (e) {
            throw new Error('Engine must be a valid JSON object');
          }
        }
        
        if (typeof parsedValue !== 'object') {
          throw new Error('Engine must be an object');
        }
        if (parsedValue.type && !['gasolina', 'diesel', 'electrico', 'hibrido', 'gas_natural', 'gas_lp'].includes(parsedValue.type)) {
          throw new Error('Invalid engine type');
        }
      }
    }
  },
  transmission: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      isIn: [['manual', 'automatica', 'cvt', 'dsg']]
    }
  },
  fuelCapacity: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  odometer: {
    type: DataTypes.TEXT,
    defaultValue: JSON.stringify({
      current: 0,
      lastUpdate: new Date(),
      unit: 'km'
    }),
    get() {
      const value = this.getDataValue('odometer');
      return value ? JSON.parse(value) : { current: 0, lastUpdate: new Date(), unit: 'km' };
    },
    set(value) {
      this.setDataValue('odometer', JSON.stringify(value || { current: 0, lastUpdate: new Date(), unit: 'km' }));
    },
    validate: {
      isValidOdometer(value) {
        if (!value) return;
        
        let parsedValue = value;
        if (typeof value === 'string') {
          try {
            parsedValue = JSON.parse(value);
          } catch (e) {
            throw new Error('Odometer must be a valid JSON object');
          }
        }
        
        if (typeof parsedValue !== 'object') {
          throw new Error('Odometer must be an object');
        }
        if (parsedValue.unit && !['km', 'miles'].includes(parsedValue.unit)) {
          throw new Error('Invalid odometer unit');
        }
        if (parsedValue.current && parsedValue.current < 0) {
          throw new Error('Odometer current value cannot be negative');
        }
      }
    }
  },
  documents: {
    type: DataTypes.TEXT,
    defaultValue: JSON.stringify({
      files: []
    }),
    get() {
      const value = this.getDataValue('documents');
      return value ? JSON.parse(value) : { files: [] };
    },
    set(value) {
      this.setDataValue('documents', JSON.stringify(value || { files: [] }));
    },
    validate: {
      isValidDocuments(value) {
        if (!value) return;
        
        let parsedValue = value;
        if (typeof value === 'string') {
          try {
            parsedValue = JSON.parse(value);
          } catch (e) {
            throw new Error('Documents must be a valid JSON object');
          }
        }
        
        if (typeof parsedValue !== 'object') {
          throw new Error('Documents must be an object');
        }
        if (parsedValue.files && !Array.isArray(parsedValue.files)) {
          throw new Error('Documents files must be an array');
        }
      }
    }
  },
  specifications: {
    type: DataTypes.TEXT,
    defaultValue: JSON.stringify({
      insurance: {
        company: null,
        policyNumber: null,
        expiryDate: null,
        isValid: true
      },
      itv: {
        lastDate: null,
        expiryDate: null,
        isValid: true
      },
      numberOfKeys: 2,
      radioCode: null,
      notes: null
    }),
    get() {
      const value = this.getDataValue('specifications');
      return value ? JSON.parse(value) : {
        insurance: { company: null, policyNumber: null, expiryDate: null, isValid: true },
        itv: { lastDate: null, expiryDate: null, isValid: true },
        numberOfKeys: 2,
        radioCode: null,
        notes: null
      };
    },
    set(value) {
      this.setDataValue('specifications', JSON.stringify(value || {
        insurance: { company: null, policyNumber: null, expiryDate: null, isValid: true },
        itv: { lastDate: null, expiryDate: null, isValid: true },
        numberOfKeys: 2,
        radioCode: null,
        notes: null
      }));
    },
    validate: {
      isValidSpecifications(value) {
        if (!value) return;
        
        let parsedValue = value;
        if (typeof value === 'string') {
          try {
            parsedValue = JSON.parse(value);
          } catch (e) {
            throw new Error('Specifications must be a valid JSON object');
          }
        }
        
        if (typeof parsedValue !== 'object') {
          throw new Error('Specifications must be an object');
        }
        if (parsedValue.numberOfKeys && parsedValue.numberOfKeys < 0) {
          throw new Error('Number of keys cannot be negative');
        }
        if (parsedValue.radioCode && parsedValue.radioCode.length > 20) {
          throw new Error('Radio code cannot exceed 20 characters');
        }
        if (parsedValue.notes && parsedValue.notes.length > 1000) {
          throw new Error('Notes cannot exceed 1000 characters');
        }
      }
    }
  },
  ownership: {
    type: DataTypes.TEXT,
    defaultValue: JSON.stringify({
      type: 'propiedad',
      monthlyRentalPrice: null,
      maintenanceCostResponsibility: 'empresa_propietaria'
    }),
    get() {
      const value = this.getDataValue('ownership');
      return value ? JSON.parse(value) : { type: 'propiedad', monthlyRentalPrice: null, maintenanceCostResponsibility: 'empresa_propietaria' };
    },
    set(value) {
      this.setDataValue('ownership', JSON.stringify(value || { type: 'propiedad', monthlyRentalPrice: null, maintenanceCostResponsibility: 'empresa_propietaria' }));
    },
    validate: {
      isValidOwnership(value) {
        if (!value) return;
        
        let parsedValue = value;
        if (typeof value === 'string') {
          try {
            parsedValue = JSON.parse(value);
          } catch (e) {
            throw new Error('Ownership must be a valid JSON object');
          }
        }
        
        if (typeof parsedValue !== 'object') {
          throw new Error('Ownership must be an object');
        }
        if (parsedValue.type && !['propiedad', 'alquiler'].includes(parsedValue.type)) {
          throw new Error('Invalid ownership type');
        }
        if (parsedValue.monthlyRentalPrice && parsedValue.monthlyRentalPrice < 0) {
          throw new Error('Monthly rental price cannot be negative');
        }
        if (parsedValue.maintenanceCostResponsibility && 
            !['empresa_propietaria', 'empresa_arrendataria'].includes(parsedValue.maintenanceCostResponsibility)) {
          throw new Error('Invalid maintenance cost responsibility');
        }
      }
    }
  },
  photos: {
    type: DataTypes.TEXT,
    defaultValue: JSON.stringify([]),
    get() {
      const value = this.getDataValue('photos');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('photos', JSON.stringify(value || []));
    },
    validate: {
      isValidPhotos(value) {
        if (!value) return;
        
        let parsedValue = value;
        if (typeof value === 'string') {
          try {
            parsedValue = JSON.parse(value);
          } catch (e) {
            throw new Error('Photos must be a valid JSON array');
          }
        }
        
        if (!Array.isArray(parsedValue)) {
          throw new Error('Photos must be an array');
        }
      }
    }
  },
  status: {
    type: DataTypes.TEXT,
    defaultValue: 'activo',
    validate: {
      isIn: [['activo', 'en_mantenimiento', 'fuera_de_servicio', 'vendido', 'siniestrado', 'dado_de_baja']]
    }
  },
  condition: {
    type: DataTypes.TEXT,
    defaultValue: 'bueno',
    validate: {
      isIn: [['excelente', 'bueno', 'regular', 'malo', 'critico']]
    }
  },
  maintenanceSchedule: {
    type: DataTypes.TEXT,
    defaultValue: JSON.stringify({
      oilChange: {
        intervalKm: 5000,
        intervalMonths: 6,
        lastKm: 0,
        lastDate: null
      },
      generalInspection: {
        intervalKm: 10000,
        intervalMonths: 12,
        lastKm: 0,
        lastDate: null
      },
      tireRotation: {
        intervalKm: 8000,
        intervalMonths: 6,
        lastKm: 0,
        lastDate: null
      }
    }),
    get() {
      const value = this.getDataValue('maintenanceSchedule');
      return value ? JSON.parse(value) : {
        oilChange: { intervalKm: 5000, intervalMonths: 6, lastKm: 0, lastDate: null },
        generalInspection: { intervalKm: 10000, intervalMonths: 12, lastKm: 0, lastDate: null },
        tireRotation: { intervalKm: 8000, intervalMonths: 6, lastKm: 0, lastDate: null }
      };
    },
    set(value) {
      this.setDataValue('maintenanceSchedule', JSON.stringify(value || {
        oilChange: { intervalKm: 5000, intervalMonths: 6, lastKm: 0, lastDate: null },
        generalInspection: { intervalKm: 10000, intervalMonths: 12, lastKm: 0, lastDate: null },
        tireRotation: { intervalKm: 8000, intervalMonths: 6, lastKm: 0, lastDate: null }
      }));
    },
    validate: {
      isValidMaintenanceSchedule(value) {
        if (value && typeof value !== 'object' && typeof value !== 'string') {
          throw new Error('Maintenance schedule must be an object or JSON string');
        }
        if (typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch (e) {
            throw new Error('Maintenance schedule must be valid JSON');
          }
        }
      }
    }
  },
  costs: {
    type: DataTypes.TEXT,
    defaultValue: JSON.stringify({
      purchasePrice: null,
      currentValue: null,
      totalMaintenanceCost: 0,
      lastYearMaintenanceCost: 0
    }),
    get() {
      const value = this.getDataValue('costs');
      return value ? JSON.parse(value) : { purchasePrice: null, currentValue: null, totalMaintenanceCost: 0, lastYearMaintenanceCost: 0 };
    },
    set(value) {
      this.setDataValue('costs', JSON.stringify(value || { purchasePrice: null, currentValue: null, totalMaintenanceCost: 0, lastYearMaintenanceCost: 0 }));
    },
    validate: {
      isValidCosts(value) {
        if (value && typeof value !== 'object' && typeof value !== 'string') {
          throw new Error('Costs must be an object or JSON string');
        }
        let costsObj = value;
        if (typeof value === 'string') {
          try {
            costsObj = JSON.parse(value);
          } catch (e) {
            throw new Error('Costs must be valid JSON');
          }
        }
        if (costsObj && costsObj.purchasePrice && costsObj.purchasePrice < 0) {
          throw new Error('Purchase price cannot be negative');
        }
        if (costsObj && costsObj.currentValue && costsObj.currentValue < 0) {
          throw new Error('Current value cannot be negative');
        }
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdById: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  lastModifiedById: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'Vehicle',
  tableName: 'Vehicles',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['companyId', 'plateNumber']
    },
    {
      fields: ['companyId', 'branchId']
    },
    {
      fields: ['companyId', 'status']
    },
    {
      fields: ['vin']
    },
    {
      fields: ['make', 'model', 'year']
    },

  ],
  hooks: {
    beforeSave: async (vehicle, options) => {
      // Normalizar plateNumber
      if (vehicle.changed('plateNumber') && vehicle.plateNumber) {
        vehicle.plateNumber = vehicle.plateNumber.toUpperCase().trim();
      }
      
      // Normalizar VIN
      if (vehicle.changed('vin') && vehicle.vin) {
        vehicle.vin = vehicle.vin.toUpperCase().trim();
      }
      
      // Actualizar lastModifiedById si no es un documento nuevo
      if (!vehicle.isNewRecord && vehicle.changed()) {
        vehicle.lastModifiedById = options.modifiedBy || vehicle.lastModifiedById;
      }
    }
  }
});

// Definir asociaciones
Vehicle.associate = (models) => {
  Vehicle.belongsTo(models.Company, {
    foreignKey: 'companyId',
    as: 'company'
  });
  
  Vehicle.belongsTo(models.Branch, {
    foreignKey: 'branchId',
    as: 'branch'
  });
  
  Vehicle.belongsTo(models.User, {
    foreignKey: 'createdById',
    as: 'createdBy'
  });
  
  Vehicle.belongsTo(models.User, {
    foreignKey: 'lastModifiedById',
    as: 'lastModifiedBy'
  });
  
  Vehicle.hasMany(models.Maintenance, {
    foreignKey: 'vehicleId',
    as: 'maintenances'
  });
  
  Vehicle.hasMany(models.FuelRecord, {
    foreignKey: 'vehicleId',
    as: 'fuelRecords'
  });
};

module.exports = Vehicle;