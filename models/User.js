const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String, // URL o path del avatar
    default: null
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: function() {
      return this.role !== 'super_admin';
    }
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: function() {
      return this.role !== 'super_admin';
    }
  },
  vehicleTypeAccess: [{
    type: String,
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
  }],
  role: {
    type: String,
    enum: [
      'super_admin',    // Administrador del sistema
      'company_admin',  // Administrador de empresa
      'branch_manager', // Gerente de sucursal
      'mechanic',       // Mecánico
      'operator',       // Operador
      'viewer'          // Solo lectura
    ],
    required: true
  },
  permissions: {
    companies: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    branches: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    vehicles: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    maintenance: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    users: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    reports: {
      read: { type: Boolean, default: true },
      export: { type: Boolean, default: false }
    }
  },
  preferences: {
    language: { type: String, default: 'es', enum: ['es', 'en'] },
    timezone: { type: String, default: 'Europe/Madrid' },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    dashboard: {
      defaultView: { type: String, default: 'overview' },
      itemsPerPage: { type: Number, default: 10 }
    }
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
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
UserSchema.index({ email: 1 });
UserSchema.index({ company: 1, role: 1 });
UserSchema.index({ company: 1, isActive: 1 });
UserSchema.index({ branch: 1 });

// Virtual para nombre completo
UserSchema.virtual('fullName').get(function() {
  return `${this.name} ${this.lastName}`;
});

// Virtual para verificar si la cuenta está bloqueada
UserSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Middleware pre-save para hashear password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware para establecer permisos por defecto según el rol
UserSchema.pre('save', function(next) {
  if (!this.isModified('role') && !this.isNew) return next();
  
  // Lista completa de tipos de vehículos
  const allVehicleTypes = [
    'Tractor', 'Camión', 'Furgoneta', 'Coche', 'Motocicleta', 'Remolque', 'Maquinaria', 'Otro'
  ];
  
  // Establecer permisos por defecto según el rol
  switch (this.role) {
    case 'super_admin':
      this.permissions = {
        companies: { create: true, read: true, update: true, delete: true },
        branches: { create: true, read: true, update: true, delete: true },
        vehicles: { create: true, read: true, update: true, delete: true },
        maintenance: { create: true, read: true, update: true, delete: true },
        users: { create: true, read: true, update: true, delete: true },
        reports: { read: true, export: true }
      };
      // Super admin tiene acceso a todos los tipos de vehículos
      if (!this.vehicleTypeAccess || this.vehicleTypeAccess.length === 0) {
        this.vehicleTypeAccess = allVehicleTypes;
      }
      break;
    case 'company_admin':
      this.permissions = {
        companies: { create: false, read: true, update: true, delete: false },
        branches: { create: true, read: true, update: true, delete: true },
        vehicles: { create: true, read: true, update: true, delete: true },
        maintenance: { create: true, read: true, update: true, delete: true },
        users: { create: true, read: true, update: true, delete: true },
        reports: { read: true, export: true }
      };
      // Company admin tiene acceso a todos los tipos por defecto
      if (!this.vehicleTypeAccess || this.vehicleTypeAccess.length === 0) {
        this.vehicleTypeAccess = allVehicleTypes;
      }
      break;
    case 'branch_manager':
      this.permissions = {
        companies: { create: false, read: true, update: false, delete: false },
        branches: { create: false, read: true, update: true, delete: false },
        vehicles: { create: true, read: true, update: true, delete: false },
        maintenance: { create: true, read: true, update: true, delete: false },
        users: { create: true, read: true, update: true, delete: false },
        reports: { read: true, export: true }
      };
      // Branch manager tiene acceso a vehículos comerciales y de pasajeros por defecto
      if (!this.vehicleTypeAccess || this.vehicleTypeAccess.length === 0) {
        this.vehicleTypeAccess = ['coche', 'motocicleta', 'camioneta', 'van', 'pickup', 'furgoneta', 'camion', 'trailer', 'autobus', 'microbus'];
      }
      break;
    case 'mechanic':
      this.permissions = {
        companies: { create: false, read: true, update: false, delete: false },
        branches: { create: false, read: true, update: false, delete: false },
        vehicles: { create: false, read: true, update: true, delete: false },
        maintenance: { create: true, read: true, update: true, delete: false },
        users: { create: false, read: false, update: false, delete: false },
        reports: { read: true, export: false }
      };
      // Mecánico tiene acceso a vehículos básicos por defecto
      if (!this.vehicleTypeAccess || this.vehicleTypeAccess.length === 0) {
        this.vehicleTypeAccess = ['coche', 'motocicleta', 'camioneta', 'van', 'pickup'];
      }
      break;
    default:
      // operator, viewer
      this.permissions = {
        companies: { create: false, read: true, update: false, delete: false },
        branches: { create: false, read: true, update: false, delete: false },
        vehicles: { create: false, read: true, update: false, delete: false },
        maintenance: { create: false, read: true, update: false, delete: false },
        users: { create: false, read: false, update: false, delete: false },
        reports: { read: true, export: false }
      };
      // Operador/viewer tiene acceso limitado por defecto
      if (!this.vehicleTypeAccess || this.vehicleTypeAccess.length === 0) {
        this.vehicleTypeAccess = ['coche', 'motocicleta', 'camioneta'];
      }
  }
  
  next();
});

// Métodos de instancia
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.incLoginAttempts = function() {
  // Si ya tenemos un lockUntil y no ha expirado, solo incrementamos
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Si llegamos al máximo de intentos y no estamos bloqueados, bloquear
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 horas
  }
  
  return this.updateOne(updates);
};

UserSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationToken;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.loginAttempts;
  delete user.lockUntil;
  return user;
};

module.exports = mongoose.model('User', UserSchema);