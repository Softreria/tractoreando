const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  cif: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, default: 'España', trim: true },
    additionalInfo: { type: String, trim: true, maxlength: 200 }
  },
  contact: {
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    website: { type: String, trim: true }
  },
  logo: {
    type: String, // URL o path del logo
    default: null
  },
  settings: {
    currency: { type: String, default: 'EUR' },
    timezone: { type: String, default: 'Europe/Madrid' },
    maintenanceReminders: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true }
  },
  // Datos del administrador de la empresa
  administrator: {
    firstName: { type: String, trim: true, maxlength: 50 },
    lastName: { type: String, trim: true, maxlength: 50 },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    canManageUsers: { type: Boolean, default: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índices
CompanySchema.index({ cif: 1 });
CompanySchema.index({ name: 1 });
CompanySchema.index({ isActive: 1 });
CompanySchema.index({ 'administrator.email': 1 });

// Middleware pre-save
CompanySchema.pre('save', function(next) {
  if (this.cif) {
    this.cif = this.cif.toUpperCase().trim();
  }
  next();
});

// Métodos virtuales
CompanySchema.virtual('branchCount', {
  ref: 'Branch',
  localField: '_id',
  foreignField: 'company',
  count: true
});

CompanySchema.virtual('vehicleCount', {
  ref: 'Vehicle',
  localField: '_id',
  foreignField: 'company',
  count: true
});

// Métodos de instancia
CompanySchema.methods.toJSON = function() {
  const company = this.toObject();
  return company;
};

module.exports = mongoose.model('Company', CompanySchema);