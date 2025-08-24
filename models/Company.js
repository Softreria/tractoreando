const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  rfc: {
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
    country: { type: String, default: 'España', trim: true }
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
  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic'
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    maxVehicles: { type: Number, default: 10 },
    maxUsers: { type: Number, default: 5 },
    maxBranches: { type: Number, default: 1 }
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
CompanySchema.index({ rfc: 1 });
CompanySchema.index({ name: 1 });
CompanySchema.index({ isActive: 1 });

// Middleware pre-save
CompanySchema.pre('save', function(next) {
  if (this.rfc) {
    this.rfc = this.rfc.toUpperCase().trim();
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