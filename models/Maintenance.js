const mongoose = require('mongoose');

const MaintenanceSchema = new mongoose.Schema({
  // Referencias
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
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
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Mecánico asignado
  },
  
  // Información básica
  workOrderNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'preventivo',
      'correctivo',
      'predictivo',
      'emergencia',
      'inspeccion',
      'garantia'
    ]
  },
  priority: {
    type: String,
    enum: ['baja', 'media', 'alta', 'critica'],
    default: 'media'
  },
  
  // Estado y fechas
  status: {
    type: String,
    enum: [
      'programado',
      'en_proceso',
      'pausado',
      'completado',
      'cancelado',
      'pendiente_aprobacion',
      'pendiente_partes'
    ],
    default: 'programado'
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  startDate: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  estimatedDuration: {
    type: Number, // En horas
    default: 1
  },
  actualDuration: {
    type: Number // En horas
  },
  
  // Kilometraje
  odometerReading: {
    type: Number,
    required: true
  },
  nextServiceKm: {
    type: Number
  },
  
  // Descripción del trabajo
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  symptoms: {
    type: String,
    maxlength: 1000
  },
  diagnosis: {
    type: String,
    maxlength: 1000
  },
  workPerformed: {
    type: String,
    maxlength: 2000
  },
  recommendations: {
    type: String,
    maxlength: 1000
  },
  
  // Servicios realizados
  services: [{
    category: {
      type: String,
      required: true,
      enum: [
        'motor',
        'transmision',
        'frenos',
        'suspension',
        'direccion',
        'electrico',
        'aire_acondicionado',
        'sistema_combustible',
        'escape',
        'neumaticos',
        'carroceria',
        'interior',
        'diagnostico',
        'otros'
      ]
    },
    subcategory: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    laborHours: { type: Number, default: 0 },
    laborRate: { type: Number, default: 0 },
    laborCost: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedDate: { type: Date },
    notes: { type: String, maxlength: 500 }
  }],
  
  // Partes y materiales
  parts: [{
    partNumber: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, trim: true },
    description: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    supplier: { type: String, trim: true },
    warranty: {
      duration: { type: Number }, // En meses
      type: { type: String, enum: ['fabricante', 'proveedor', 'taller'] }
    },
    isInstalled: { type: Boolean, default: false },
    installedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    installedDate: { type: Date },
    notes: { type: String, maxlength: 300 }
  }],
  
  // Costos
  costs: {
    labor: { type: Number, default: 0 },
    parts: { type: Number, default: 0 },
    materials: { type: Number, default: 0 },
    external: { type: Number, default: 0 }, // Servicios externos
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },

  // Responsabilidad de costos (para vehículos de alquiler)
  costResponsibility: {
    responsibleParty: {
      type: String,
      enum: ['empresa_propietaria', 'empresa_arrendataria', 'compartido'],
      default: 'empresa_propietaria'
    },
    notes: { type: String, maxlength: 500 },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalDate: { type: Date }
  },
  
  // Inspecciones y verificaciones
  inspections: [{
    item: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['bueno', 'regular', 'malo', 'requiere_atencion', 'no_aplica'],
      required: true
    },
    notes: { type: String, maxlength: 300 },
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inspectedDate: { type: Date, default: Date.now }
  }],
  
  // Fotos del mantenimiento
  photos: [{
    url: { type: String, required: true },
    description: { type: String, maxlength: 200 },
    category: {
      type: String,
      enum: ['antes', 'durante', 'despues', 'problema', 'solucion', 'otro'],
      default: 'durante'
    },
    uploadDate: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // Archivos adjuntos
  attachments: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['image', 'document', 'video', 'audio', 'other'],
      default: 'document'
    },
    category: {
      type: String,
      enum: ['factura', 'garantia', 'diagnostico', 'presupuesto', 'otro']
    },
    uploadDate: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  
  // Aprobaciones
  approvals: [{
    type: {
      type: String,
      enum: ['presupuesto', 'trabajo_adicional', 'partes_especiales', 'garantia'],
      required: true
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestDate: { type: Date, default: Date.now },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalDate: { type: Date },
    status: {
      type: String,
      enum: ['pendiente', 'aprobado', 'rechazado'],
      default: 'pendiente'
    },
    amount: { type: Number },
    notes: { type: String, maxlength: 500 },
    rejectionReason: { type: String, maxlength: 500 }
  }],
  
  // Seguimiento de tiempo
  timeTracking: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number }, // En minutos
    activity: { type: String, required: true, trim: true },
    notes: { type: String, maxlength: 300 }
  }],
  
  // Calidad y satisfacción
  quality: {
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String, maxlength: 1000 },
    ratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ratedDate: { type: Date }
  },
  
  // Garantía del trabajo
  warranty: {
    duration: { type: Number }, // En meses
    startDate: { type: Date },
    endDate: { type: Date },
    terms: { type: String, maxlength: 500 },
    isActive: { type: Boolean, default: false }
  },
  
  // Próximo mantenimiento
  nextMaintenance: {
    type: { type: String, enum: ['preventivo', 'inspeccion'] },
    scheduledDate: { type: Date },
    estimatedKm: { type: Number },
    description: { type: String, maxlength: 300 }
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
  },
  notes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Índices
MaintenanceSchema.index({ workOrderNumber: 1 }, { unique: true });
MaintenanceSchema.index({ company: 1, status: 1 });
MaintenanceSchema.index({ vehicle: 1, scheduledDate: -1 });
MaintenanceSchema.index({ branch: 1, status: 1 });
MaintenanceSchema.index({ assignedTo: 1, status: 1 });
MaintenanceSchema.index({ scheduledDate: 1 });
MaintenanceSchema.index({ type: 1, priority: 1 });
MaintenanceSchema.index({ 'costs.total': 1 });

// Middleware pre-save
MaintenanceSchema.pre('save', function(next) {
  // Calcular costos totales
  this.costs.parts = this.parts.reduce((sum, part) => sum + part.totalPrice, 0);
  this.costs.labor = this.services.reduce((sum, service) => sum + service.laborCost, 0);
  this.costs.total = this.costs.labor + this.costs.parts + this.costs.materials + 
                   this.costs.external + this.costs.tax - this.costs.discount;
  
  // Generar número de orden de trabajo si no existe
  if (!this.workOrderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.workOrderNumber = `WO${year}${month}${day}${random}`;
  }
  
  // Actualizar fechas según el estado
  if (this.isModified('status')) {
    switch (this.status) {
      case 'en_proceso':
        if (!this.startDate) this.startDate = new Date();
        break;
      case 'completado':
        if (!this.completedDate) this.completedDate = new Date();
        if (this.startDate && this.completedDate) {
          this.actualDuration = (this.completedDate - this.startDate) / (1000 * 60 * 60); // En horas
        }
        break;
    }
  }
  
  // Actualizar lastModifiedBy si no es un documento nuevo
  if (!this.isNew && this.isModified()) {
    this.lastModifiedBy = this.modifiedBy || this.lastModifiedBy;
  }
  
  next();
});

// Métodos virtuales
MaintenanceSchema.virtual('isOverdue').get(function() {
  return this.scheduledDate < new Date() && this.status === 'programado';
});

MaintenanceSchema.virtual('daysUntilDue').get(function() {
  const diffTime = this.scheduledDate - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

MaintenanceSchema.virtual('totalParts').get(function() {
  return this.parts.reduce((sum, part) => sum + part.quantity, 0);
});

MaintenanceSchema.virtual('completionPercentage').get(function() {
  if (this.services.length === 0) return 0;
  const completedServices = this.services.filter(service => service.isCompleted).length;
  return Math.round((completedServices / this.services.length) * 100);
});

// Métodos de instancia
MaintenanceSchema.methods.addTimeEntry = function(userId, activity, startTime, endTime, notes) {
  const duration = endTime ? Math.round((endTime - startTime) / (1000 * 60)) : null;
  
  this.timeTracking.push({
    user: userId,
    startTime,
    endTime,
    duration,
    activity,
    notes
  });
  
  return this.save();
};

MaintenanceSchema.methods.completeService = function(serviceId, userId, notes) {
  const service = this.services.id(serviceId);
  if (service) {
    service.isCompleted = true;
    service.completedBy = userId;
    service.completedDate = new Date();
    if (notes) service.notes = notes;
    
    // Si todos los servicios están completados, cambiar estado
    const allCompleted = this.services.every(s => s.isCompleted);
    if (allCompleted && this.status === 'en_proceso') {
      this.status = 'completado';
    }
  }
  
  return this.save();
};

MaintenanceSchema.methods.installPart = function(partId, userId, notes) {
  const part = this.parts.id(partId);
  if (part) {
    part.isInstalled = true;
    part.installedBy = userId;
    part.installedDate = new Date();
    if (notes) part.notes = notes;
  }
  
  return this.save();
};

MaintenanceSchema.methods.requestApproval = function(type, amount, notes, requestedBy) {
  this.approvals.push({
    type,
    amount,
    notes,
    requestedBy,
    status: 'pendiente'
  });
  
  if (type === 'presupuesto' || type === 'trabajo_adicional') {
    this.status = 'pendiente_aprobacion';
  }
  
  return this.save();
};

MaintenanceSchema.methods.approveRequest = function(approvalId, approvedBy, notes) {
  const approval = this.approvals.id(approvalId);
  if (approval) {
    approval.status = 'aprobado';
    approval.approvedBy = approvedBy;
    approval.approvalDate = new Date();
    if (notes) approval.notes = notes;
    
    // Si era una aprobación de presupuesto, cambiar estado
    if (approval.type === 'presupuesto' && this.status === 'pendiente_aprobacion') {
      this.status = 'programado';
    }
  }
  
  return this.save();
};

MaintenanceSchema.methods.getTotalLaborHours = function() {
  return this.services.reduce((sum, service) => sum + (service.laborHours || 0), 0);
};

MaintenanceSchema.methods.getEstimatedCompletion = function() {
  if (this.status === 'completado') return this.completedDate;
  if (this.status !== 'en_proceso') return this.scheduledDate;
  
  const totalHours = this.getTotalLaborHours();
  const completedHours = this.services
    .filter(s => s.isCompleted)
    .reduce((sum, service) => sum + (service.laborHours || 0), 0);
  
  const remainingHours = totalHours - completedHours;
  const estimatedCompletion = new Date();
  estimatedCompletion.setHours(estimatedCompletion.getHours() + remainingHours);
  
  return estimatedCompletion;
};

module.exports = mongoose.model('Maintenance', MaintenanceSchema);