const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  // Información básica
  plateNumber: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 15
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
  
  // Información del vehículo
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
      // Vehículos de pasajeros
      'coche',
      'motocicleta',
      'scooter',
      'bicicleta_electrica',
      
      // Vehículos comerciales ligeros
      'camioneta',
      'van',
      'pickup',
      'furgoneta',
      
      // Vehículos comerciales pesados
      'camion',
      'trailer',
      'autobus',
      'microbus',
      
      // Maquinaria agrícola
      'tractor',
      'cosechadora',
      'sembradora',
      'pulverizadora',
      'arado',
      'cultivador',
      'rastra',
      'segadora',
      'empacadora',
      'remolque_agricola',
      
      // Aperos agrícolas
      'apero_labranza',
      'apero_siembra',
      'apero_fertilizacion',
      'apero_fumigacion',
      'apero_cosecha',
      'apero_transporte',
      
      // Maquinaria de construcción
      'excavadora',
      'bulldozer',
      'cargadora',
      'grua',
      'compactadora',
      'motoniveladora',
      'retroexcavadora',
      
      // Vehículos especiales
      'ambulancia',
      'bomberos',
      'policia',
      'militar',
      'otro'
    ]
  },
  category: {
    type: String,
    enum: [
      'particular',
      'comercial',
      'transporte_publico',
      'carga',
      'construccion',
      'agricola',
      'emergencia',
      'gobierno'
    ],
    default: 'particular'
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
  
  // Información de propiedad
  owner: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true }
    }
  },
  
  // Documentación
  documents: {
    registration: {
      number: { type: String, trim: true },
      expiryDate: { type: Date },
      isValid: { type: Boolean, default: true }
    },
    insurance: {
      company: { type: String, trim: true },
      policyNumber: { type: String, trim: true },
      expiryDate: { type: Date },
      isValid: { type: Boolean, default: true }
    },
    inspection: {
      lastDate: { type: Date },
      nextDate: { type: Date },
      isValid: { type: Boolean, default: true }
    }
  },
  
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
  
  // Archivos adjuntos
  attachments: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['image', 'document', 'video', 'other'],
      default: 'document'
    },
    uploadDate: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  
  // Notas y observaciones
  notes: {
    type: String,
    maxlength: 1000
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

// Índices
VehicleSchema.index({ company: 1, plateNumber: 1 }, { unique: true });
VehicleSchema.index({ company: 1, branch: 1 });
VehicleSchema.index({ company: 1, status: 1 });
VehicleSchema.index({ vin: 1 });
VehicleSchema.index({ make: 1, model: 1, year: 1 });
VehicleSchema.index({ 'documents.registration.expiryDate': 1 });
VehicleSchema.index({ 'documents.insurance.expiryDate': 1 });

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
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  if (this.documents.registration.expiryDate && this.documents.registration.expiryDate <= futureDate) {
    expiringDocs.push({ type: 'registration', date: this.documents.registration.expiryDate });
  }
  
  if (this.documents.insurance.expiryDate && this.documents.insurance.expiryDate <= futureDate) {
    expiringDocs.push({ type: 'insurance', date: this.documents.insurance.expiryDate });
  }
  
  if (this.documents.inspection.nextDate && this.documents.inspection.nextDate <= futureDate) {
    expiringDocs.push({ type: 'inspection', date: this.documents.inspection.nextDate });
  }
  
  return expiringDocs;
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