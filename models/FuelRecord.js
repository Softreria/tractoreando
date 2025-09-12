const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class FuelRecord extends Model {
  // Método para calcular el consumo promedio
  static async getAverageConsumption(vehicleId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const records = await this.findAll({
        where: {
          vehicleId,
          fuelDate: {
            [sequelize.Sequelize.Op.gte]: startDate
          }
        },
        order: [['fuelDate', 'ASC']]
      });
      
      if (records.length < 2) return null;
      
      let totalLiters = 0;
      let totalKm = 0;
      
      for (let i = 1; i < records.length; i++) {
        const currentRecord = records[i];
        const previousRecord = records[i - 1];
        
        if (currentRecord.odometer && previousRecord.odometer) {
          const kmDifference = currentRecord.odometer - previousRecord.odometer;
          if (kmDifference > 0) {
            totalLiters += currentRecord.liters;
            totalKm += kmDifference;
          }
        }
      }
      
      return totalKm > 0 ? (totalLiters / totalKm * 100) : null; // L/100km
    } catch (error) {
      console.error('Error calculating average consumption:', error);
      return null;
    }
  }
  
  // Método para obtener estadísticas de combustible
  static async getFuelStats(vehicleId, startDate = null, endDate = null) {
    try {
      const whereClause = { vehicleId };
      
      if (startDate || endDate) {
        whereClause.fuelDate = {};
        if (startDate) whereClause.fuelDate[sequelize.Sequelize.Op.gte] = startDate;
        if (endDate) whereClause.fuelDate[sequelize.Sequelize.Op.lte] = endDate;
      }
      
      const records = await this.findAll({
        where: whereClause,
        order: [['fuelDate', 'ASC']]
      });
      
      if (records.length === 0) {
        return {
          totalLiters: 0,
          totalCost: 0,
          averagePrice: 0,
          recordCount: 0,
          averageConsumption: null
        };
      }
      
      const totalLiters = records.reduce((sum, record) => sum + record.liters, 0);
      const totalCost = records.reduce((sum, record) => sum + (record.totalCost || 0), 0);
      const averagePrice = totalCost > 0 ? totalCost / totalLiters : 0;
      
      // Calcular consumo promedio
      let averageConsumption = null;
      if (records.length >= 2) {
        let totalKmForConsumption = 0;
        let totalLitersForConsumption = 0;
        
        for (let i = 1; i < records.length; i++) {
          const current = records[i];
          const previous = records[i - 1];
          
          if (current.odometer && previous.odometer) {
            const kmDiff = current.odometer - previous.odometer;
            if (kmDiff > 0) {
              totalKmForConsumption += kmDiff;
              totalLitersForConsumption += current.liters;
            }
          }
        }
        
        if (totalKmForConsumption > 0) {
          averageConsumption = (totalLitersForConsumption / totalKmForConsumption) * 100;
        }
      }
      
      return {
        totalLiters,
        totalCost,
        averagePrice,
        recordCount: records.length,
        averageConsumption
      };
    } catch (error) {
      console.error('Error getting fuel stats:', error);
      return null;
    }
  }
  
  // Método para validar que el odómetro no sea menor al anterior
  async validateOdometer() {
    if (!this.odometer) return true;
    
    try {
      const lastRecord = await FuelRecord.findOne({
        where: {
          vehicleId: this.vehicleId,
          fuelDate: {
            [sequelize.Sequelize.Op.lt]: this.fuelDate
          }
        },
        order: [['fuelDate', 'DESC']]
      });
      
      if (lastRecord && lastRecord.odometer && this.odometer < lastRecord.odometer) {
        throw new Error(`El odómetro (${this.odometer} km) no puede ser menor al registro anterior (${lastRecord.odometer} km)`);
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }
}

FuelRecord.init({
  id: {
    type: DataTypes.STRING,
    defaultValue: () => {
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2, 8);
      return `fuel_${timestamp}_${random}`;
    },
    primaryKey: true
  },
  vehicleId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Vehicles',
      key: 'id'
    },
    validate: {
      notEmpty: true
    }
  },
  fuelDate: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'La fecha de repostaje es obligatoria'
      },
      isDate: {
        msg: 'Debe ser una fecha válida'
      },
      notFuture(value) {
        if (new Date(value) > new Date()) {
          throw new Error('La fecha no puede ser futura');
        }
      }
    }
  },
  liters: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Los litros son obligatorios'
      },
      isFloat: {
        msg: 'Los litros deben ser un número válido'
      },
      min: {
        args: [0.1],
        msg: 'Los litros deben ser mayor a 0'
      },
      max: {
        args: [1000],
        msg: 'Los litros no pueden exceder 1000'
      }
    }
  },
  odometer: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      isInt: {
        msg: 'El odómetro debe ser un número entero'
      },
      min: {
        args: [0],
        msg: 'El odómetro no puede ser negativo'
      },
      max: {
        args: [9999999],
        msg: 'El odómetro no puede exceder 9,999,999 km'
      }
    }
  },
  pricePerLiter: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      isFloat: {
        msg: 'El precio por litro debe ser un número válido'
      },
      min: {
        args: [0],
        msg: 'El precio por litro no puede ser negativo'
      },
      max: {
        args: [10],
        msg: 'El precio por litro no puede exceder 10€'
      }
    }
  },
  totalCost: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      isFloat: {
        msg: 'El costo total debe ser un número válido'
      },
      min: {
        args: [0],
        msg: 'El costo total no puede ser negativo'
      }
    }
  },
  fuelType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'diesel',
    validate: {
      isIn: {
        args: [['diesel', 'gasolina_95', 'gasolina_98', 'gas_natural', 'electrico', 'hibrido', 'otro']],
        msg: 'Tipo de combustible no válido'
      }
    }
  },
  station: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      len: {
        args: [0, 100],
        msg: 'El nombre de la estación no puede exceder 100 caracteres'
      }
    }
  },
  location: {
    type: DataTypes.STRING(200),
    allowNull: true,
    validate: {
      len: {
        args: [0, 200],
        msg: 'La ubicación no puede exceder 200 caracteres'
      }
    }
  },
  isFull: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Indica si fue un llenado completo del tanque'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: {
        args: [0, 500],
        msg: 'Las notas no pueden exceder 500 caracteres'
      }
    }
  },
  receipt: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON con información del recibo/factura',
    get() {
      const rawValue = this.getDataValue('receipt');
      if (!rawValue) return null;
      try {
        return JSON.parse(rawValue);
      } catch (error) {
        console.error('Error parsing receipt JSON:', error);
        return null;
      }
    },
    set(value) {
      if (value === null || value === undefined) {
        this.setDataValue('receipt', null);
      } else {
        this.setDataValue('receipt', JSON.stringify(value));
      }
    },
    validate: {
      isValidReceipt(value) {
        if (value === null || value === undefined) return;
        
        try {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          
          if (typeof parsed !== 'object') {
            throw new Error('El recibo debe ser un objeto válido');
          }
          
          // Validar campos opcionales del recibo
          const allowedFields = ['fileName', 'fileUrl', 'uploadDate', 'fileSize', 'mimeType'];
          for (const key in parsed) {
            if (!allowedFields.includes(key)) {
              throw new Error(`Campo no permitido en recibo: ${key}`);
            }
          }
        } catch (error) {
          throw new Error(`Formato de recibo inválido: ${error.message}`);
        }
      }
    }
  },
  createdById: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  companyId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Companies',
      key: 'id'
    },
    comment: 'Referencia a la empresa para filtros y permisos'
  }
}, {
  sequelize,
  modelName: 'FuelRecord',
  tableName: 'FuelRecords',
  timestamps: true,
  indexes: [
    {
      fields: ['vehicleId', 'fuelDate']
    },
    {
      fields: ['companyId', 'fuelDate']
    },
    {
      fields: ['vehicleId', 'createdAt']
    },
    {
      fields: ['fuelType']
    }
  ],
  hooks: {
    beforeSave: async (fuelRecord, options) => {
      // Validar odómetro
      await fuelRecord.validateOdometer();
      
      // Calcular costo total si no está presente
      if (fuelRecord.pricePerLiter && fuelRecord.liters && !fuelRecord.totalCost) {
        fuelRecord.totalCost = fuelRecord.pricePerLiter * fuelRecord.liters;
      }
      
      // Validar que el precio por litro coincida con el costo total
      if (fuelRecord.pricePerLiter && fuelRecord.totalCost && fuelRecord.liters) {
        const calculatedTotal = fuelRecord.pricePerLiter * fuelRecord.liters;
        const difference = Math.abs(calculatedTotal - fuelRecord.totalCost);
        if (difference > 0.01) { // Tolerancia de 1 céntimo
          console.warn(`Discrepancia en cálculo de costo: calculado ${calculatedTotal}, proporcionado ${fuelRecord.totalCost}`);
        }
      }
    },
    
    afterCreate: async (fuelRecord, options) => {
      // Actualizar el odómetro del vehículo si se proporcionó
      if (fuelRecord.odometer) {
        try {
          const Vehicle = require('./Vehicle');
          const vehicle = await Vehicle.findByPk(fuelRecord.vehicleId);
          if (vehicle) {
            await vehicle.updateOdometer(fuelRecord.odometer, fuelRecord.fuelDate);
          }
        } catch (error) {
          console.error('Error updating vehicle odometer:', error);
        }
      }
    }
  }
});

// Definir asociaciones
FuelRecord.associate = (models) => {
  // Un registro de combustible pertenece a un vehículo
  FuelRecord.belongsTo(models.Vehicle, {
    foreignKey: 'vehicleId',
    as: 'vehicle'
  });
  
  // Un registro de combustible pertenece a una empresa
  FuelRecord.belongsTo(models.Company, {
    foreignKey: 'companyId',
    as: 'company'
  });
  
  // Un registro de combustible fue creado por un usuario
  FuelRecord.belongsTo(models.User, {
    foreignKey: 'createdById',
    as: 'createdBy'
  });
};

module.exports = FuelRecord;