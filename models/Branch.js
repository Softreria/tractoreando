const mongoose = require('mongoose');

// Esquema para Delegaciones/Fincas/Subempresas
const BranchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    enum: ['delegacion', 'finca', 'subempresa', 'oficina', 'almacen', 'taller'],
    default: 'delegacion'
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 10,
    // Código único de la delegación/finca
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  address: {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zipCode: { type: String, required: true, trim: true },
    country: { type: String, default: 'España', trim: true },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  contact: {
    phone: { type: String, trim: true, required: false },
    email: { type: String, trim: true, lowercase: true, required: false },
    manager: { type: String, trim: true, required: false }
  },
  operatingHours: {
    monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    saturday: { open: String, close: String, isOpen: { type: Boolean, default: false } },
    sunday: { open: String, close: String, isOpen: { type: Boolean, default: false } }
  },

  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Índices compuestos
BranchSchema.index({ company: 1, code: 1 }, { unique: true });
BranchSchema.index({ company: 1, name: 1 });
BranchSchema.index({ company: 1, isActive: 1 });
BranchSchema.index({ 'address.city': 1, 'address.state': 1 });

// Middleware pre-save
BranchSchema.pre('save', function(next) {
  if (this.code) {
    this.code = this.code.toUpperCase().trim();
  }
  next();
});

// Métodos virtuales
BranchSchema.virtual('vehicleCount', {
  ref: 'Vehicle',
  localField: '_id',
  foreignField: 'branch',
  count: true
});

BranchSchema.virtual('activeMaintenanceCount', {
  ref: 'Maintenance',
  localField: '_id',
  foreignField: 'branch',
  count: true,
  match: { status: { $in: ['programado', 'en_proceso'] } }
});

// Métodos de instancia
BranchSchema.methods.isOpenNow = function() {
  const now = new Date();
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  const todayHours = this.operatingHours[dayOfWeek];
  if (!todayHours || !todayHours.isOpen) return false;
  
  return currentTime >= todayHours.open && currentTime <= todayHours.close;
};

BranchSchema.methods.getFullAddress = function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`;
};

module.exports = mongoose.model('Branch', BranchSchema);