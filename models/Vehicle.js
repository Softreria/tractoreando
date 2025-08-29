const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  // Información básica (orden: 1-matrícula, 2-marca, 3-modelo, 4-número de bastidor)
  plateNumber: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 15
  },
  make: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  model: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  vin: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 17
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  year: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear() + 1
  },
  color: {
    type: String,
    trim: true,
    maxlength: 30
  },
  
  // Tipo y categoría
  vehicleType: {
    type: String,
    required: true,
    enum: [
      'Tractor',
      'Camión',
      'Furgoneta',
      'Coche',
      'Motocicleta',
      'Remolque',
      'Maquinaria',
      'Otro'
    ]
  },

  
  // Especificaciones técnicas
  engine: {
    type: {
      type: String,
      enum: ['gasolina', 'diesel', 'electrico', 'hibrido', 'gas_natural', 'gas_lp']
    },
    displacement: { type: Number }, // En litros
    cylinders: { type: Number },
    horsepower: { type: Number },
    torque: { type: Number }
  },
  transmission: {
    type: String,
    enum: ['manual', 'automatica', 'cvt', 'dsg']
  },
  fuelCapacity: {
    type: Number // En litros
  },
  
  // Información de kilometraje
  odometer: {
    current: { type: Number, default: 0 }, // Kilometraje actual
    lastUpdate: { type: Date, default: Date.now },
    unit: { type: String, enum: ['km', 'miles'], default: 'km' }
  },
  

  
  // Documentos (solo gestión de archivos)
  documents: {
    files: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      type: { 
        type: String, 
        enum: ['pdf', 'image', 'document', 'other'],
        default: 'document'
      },
      uploadDate: { type: Date, default: Date.now },
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }]
  },

  // Especificaciones (campos movidos desde documentos + nuevos)
  specifications: {
    // Campos de seguro (movido desde documents)
    insurance: {
      company: { type: String, trim: true },
      policyNumber: { type: String, trim: true },
      expiryDate: { type: Date },
      isValid: { type: Boolean, default: true }
    },
    // ITV (reemplaza inspection y registration)
    itv: {
      lastDate: { type: Date },
      expiryDate: { type: Date },
      isValid: { type: Boolean, default: true }
    },
    // Nuevos campos añadidos
    numberOfKeys: {
      type: Number,
      min: 0,
      default: 2
    },
    radioCode: {
      type: String,
      trim: true,
      maxlength: 20
    },
    // Notas (movido desde campo independiente)
    notes: {
      type: String,
      maxlength: 1000
    }
  },

  // Información de propiedad/alquiler
  ownership: {
    type: {
      type: String,
      enum: ['propiedad', 'alquiler'],
      default: 'propiedad'
    },
    monthlyRentalPrice: {
      type: Number,
      min: 0
    },
    maintenanceCostResponsibility: {
      type: String,
      enum: ['empresa_propietaria', 'empresa_arrendataria'],
      default: 'empresa_propietaria'
    }
  },

  // Fotos del vehículo
  photos: [{
    url: { type: String, required: true },
    description: { type: String, maxlength: 200 },
    uploadDate: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  
  // Estado y condición
  status: {
    type: String,
    enum: [
      'activo',
      'en_mantenimiento',
      'fuera_de_servicio',
      'vendido',
      'siniestrado',
      'dado_de_baja'
    ],
    default: 'activo'
  },
  condition: {
    type: String,
    enum: ['excelente', 'bueno', 'regular', 'malo', 'critico'],
    default: 'bueno'
  },
  
  // Mantenimiento
  maintenanceSchedule: {
    oilChange: {
      intervalKm: { type: Number, default: 5000 },
      intervalMonths: { type: Number, default: 6 },
      lastKm: { type: Number, default: 0 },
      lastDate: { type: Date }
    },
    generalInspection: {
      intervalKm: { type: Number, default: 10000 },
      intervalMonths: { type: Number, default: 12 },
      lastKm: { type: Number, default: 0 },
      lastDate: { type: Date }
    },
    tireRotation: {
      intervalKm: { type: Number, default: 8000 },
      intervalMonths: { type: Number, default: 6 },
      lastKm: { type: Number, default: 0 },
      lastDate: { type: Date }
    }
  },
  
  // Costos
  costs: {
    purchasePrice: { type: Number },
    currentValue: { type: Number },
    totalMaintenanceCost: { type: Number, default: 0 },
    lastYearMaintenanceCost: { type: Number, default: 0 }
  },
  

  

  
  // Metadatos
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
VehicleSchema.index({ company: 1, plateNumber: 1 }, { unique: true });
VehicleSchema.index({ company: 1, branch: 1 });
VehicleSchema.index({ company: 1, status: 1 });
VehicleSchema.index({ vin: 1 });
VehicleSchema.index({ make: 1, model: 1, year: 1 });
VehicleSchema.index({ 'specifications.itv.expiryDate': 1 });
VehicleSchema.index({ 'specifications.insurance.expiryDate': 1 });
VehicleSchema.index({ 'ownership.type': 1 });

// Middleware pre-save
VehicleSchema.pre('save', function(next) {
  if (this.plateNumber) {
    this.plateNumber = this.plateNumber.toUpperCase().trim();
  }
  if (this.vin) {
    this.vin = this.vin.toUpperCase().trim();
  }
  
  // Actualizar lastModifiedBy si no es un documento nuevo
  if (!this.isNew && this.isModified()) {
    this.lastModifiedBy = this.modifiedBy || this.lastModifiedBy;
  }
  
  next();
});

// Métodos virtuales
VehicleSchema.virtual('fullName').get(function() {
  return `${this.year} ${this.make} ${this.model}`;
});

VehicleSchema.virtual('age').get(function() {
  return new Date().getFullYear() - this.year;
});

VehicleSchema.virtual('maintenanceCount', {
  ref: 'Maintenance',
  localField: '_id',
  foreignField: 'vehicle',
  count: true
});

VehicleSchema.virtual('pendingMaintenanceCount', {
  ref: 'Maintenance',
  localField: '_id',
  foreignField: 'vehicle',
  count: true,
  match: { status: { $in: ['programado', 'en_proceso'] } }
});

// Métodos de instancia
VehicleSchema.methods.needsOilChange = function() {
  const schedule = this.maintenanceSchedule.oilChange;
  const kmSinceLastChange = this.odometer.current - (schedule.lastKm || 0);
  const monthsSinceLastChange = schedule.lastDate ? 
    Math.floor((Date.now() - schedule.lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30)) : 999;
  
  return kmSinceLastChange >= schedule.intervalKm || monthsSinceLastChange >= schedule.intervalMonths;
};

VehicleSchema.methods.needsInspection = function() {
  const schedule = this.maintenanceSchedule.generalInspection;
  const kmSinceLastInspection = this.odometer.current - (schedule.lastKm || 0);
  const monthsSinceLastInspection = schedule.lastDate ? 
    Math.floor((Date.now() - schedule.lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30)) : 999;
  
  return kmSinceLastInspection >= schedule.intervalKm || monthsSinceLastInspection >= schedule.intervalMonths;
};

VehicleSchema.methods.getExpiringDocuments = function(daysAhead = 30) {
  const expiringDocs = [];
  const checkDate = new Date();
  checkDate.setDate(checkDate.getDate() + daysAhead);
  
  // Verificar ITV
  if (this.specifications.itv.expiryDate && 
      this.specifications.itv.expiryDate <= checkDate) {
    expiringDocs.push({
      type: 'itv',
      expiryDate: this.specifications.itv.expiryDate,
      daysUntilExpiry: Math.ceil((this.specifications.itv.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
    });
  }
  
  // Verificar seguro
  if (this.specifications.insurance.expiryDate && 
      this.specifications.insurance.expiryDate <= checkDate) {
    expiringDocs.push({
      type: 'insurance',
      expiryDate: this.specifications.insurance.expiryDate,
      daysUntilExpiry: Math.ceil((this.specifications.insurance.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
    });
  }
  
  return expiringDocs;
};

// Método para verificar si es vehículo de alquiler
VehicleSchema.methods.isRental = function() {
  return this.ownership.type === 'alquiler';
};

// Método para obtener el costo mensual (solo para alquileres)
VehicleSchema.methods.getMonthlyRentalCost = function() {
  return this.isRental() ? this.ownership.monthlyRentalPrice || 0 : 0;
};

// Método para verificar quién es responsable de los costos de mantenimiento
VehicleSchema.methods.getMaintenanceResponsibility = function() {
  if (!this.isRental()) return 'empresa_propietaria';
  return this.ownership.maintenanceCostResponsibility || 'empresa_propietaria';
};

VehicleSchema.methods.updateOdometer = function(newKm, updateDate = new Date()) {
  if (newKm > this.odometer.current) {
    this.odometer.current = newKm;
    this.odometer.lastUpdate = updateDate;
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('Vehicle', VehicleSchema);