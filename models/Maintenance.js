const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Maintenance extends Model {
  // Método para agregar entrada de tiempo
  async addTimeEntry(userId, activity, startTime, endTime, notes) {
    const duration = endTime ? Math.round((endTime - startTime) / (1000 * 60)) : null;
    
    const timeTracking = [...(this.timeTracking || [])];
    timeTracking.push({
      user: userId,
      startTime,
      endTime,
      duration,
      activity,
      notes
    });
    
    this.timeTracking = timeTracking;
    return this.save();
  }

  // Método para completar servicio
  async completeService(serviceId, userId, notes) {
    const services = [...(this.services || [])];
    const serviceIndex = services.findIndex(s => s.id === serviceId);
    
    if (serviceIndex !== -1) {
      services[serviceIndex] = {
        ...services[serviceIndex],
        isCompleted: true,
        completedBy: userId,
        completedDate: new Date(),
        notes: notes || services[serviceIndex].notes
      };
      
      this.services = services;
      
      // Si todos los servicios están completados, cambiar estado
      const allCompleted = services.every(s => s.isCompleted);
      if (allCompleted && this.status === 'en_proceso') {
        this.status = 'completado';
      }
    }
    
    return this.save();
  }

  // Método para instalar parte
  async installPart(partId, userId, notes) {
    const parts = [...(this.parts || [])];
    const partIndex = parts.findIndex(p => p.id === partId);
    
    if (partIndex !== -1) {
      parts[partIndex] = {
        ...parts[partIndex],
        isInstalled: true,
        installedBy: userId,
        installedDate: new Date(),
        notes: notes || parts[partIndex].notes
      };
      
      this.parts = parts;
    }
    
    return this.save();
  }

  // Método para solicitar aprobación
  async requestApproval(type, amount, notes, requestedBy) {
    const approvals = [...(this.approvals || [])];
    approvals.push({
      id: Date.now().toString(), // Simple ID generation
      type,
      amount,
      notes,
      requestedBy,
      requestDate: new Date(),
      status: 'pendiente'
    });
    
    this.approvals = approvals;
    
    if (type === 'presupuesto' || type === 'trabajo_adicional') {
      this.status = 'pendiente_aprobacion';
    }
    
    return this.save();
  }

  // Método para aprobar solicitud
  async approveRequest(approvalId, approvedBy, notes) {
    const approvals = [...(this.approvals || [])];
    const approvalIndex = approvals.findIndex(a => a.id === approvalId);
    
    if (approvalIndex !== -1) {
      approvals[approvalIndex] = {
        ...approvals[approvalIndex],
        status: 'aprobado',
        approvedBy,
        approvalDate: new Date(),
        notes: notes || approvals[approvalIndex].notes
      };
      
      this.approvals = approvals;
      
      // Si era una aprobación de presupuesto, cambiar estado
      if (approvals[approvalIndex].type === 'presupuesto' && this.status === 'pendiente_aprobacion') {
        this.status = 'programado';
      }
    }
    
    return this.save();
  }

  // Método para obtener total de horas de trabajo
  getTotalLaborHours() {
    return (this.services || []).reduce((sum, service) => sum + (service.laborHours || 0), 0);
  }

  // Método para obtener fecha estimada de finalización
  getEstimatedCompletion() {
    if (this.status === 'completado') return this.completedDate;
    if (this.status !== 'en_proceso') return this.scheduledDate;
    
    const totalHours = this.getTotalLaborHours();
    const completedHours = (this.services || [])
      .filter(s => s.isCompleted)
      .reduce((sum, service) => sum + (service.laborHours || 0), 0);
    
    const remainingHours = totalHours - completedHours;
    const estimatedCompletion = new Date();
    estimatedCompletion.setHours(estimatedCompletion.getHours() + remainingHours);
    
    return estimatedCompletion;
  }

  // Propiedades virtuales
  get isOverdue() {
    return this.scheduledDate < new Date() && this.status === 'programado';
  }

  get daysUntilDue() {
    const diffTime = this.scheduledDate - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get totalParts() {
    return (this.parts || []).reduce((sum, part) => sum + (part.quantity || 0), 0);
  }

  get completionPercentage() {
    const services = this.services || [];
    if (services.length === 0) return 0;
    const completedServices = services.filter(service => service.isCompleted).length;
    return Math.round((completedServices / services.length) * 100);
  }

  // Método toJSON personalizado
  toJSON() {
    const values = Object.assign({}, this.get());
    // Agregar propiedades virtuales
    values.isOverdue = this.isOverdue;
    values.daysUntilDue = this.daysUntilDue;
    values.totalParts = this.totalParts;
    values.completionPercentage = this.completionPercentage;
    return values;
  }
}

Maintenance.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  vehicleId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Vehicles',
      key: 'id'
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
    allowNull: false,
    references: {
      model: 'Branches',
      key: 'id'
    }
  },
  assignedToId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  workOrderNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  type: {
    type: DataTypes.ENUM('preventivo', 'correctivo', 'predictivo', 'emergencia', 'inspeccion', 'garantia'),
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('baja', 'media', 'alta', 'critica'),
    defaultValue: 'media'
  },
  status: {
    type: DataTypes.ENUM('programado', 'en_proceso', 'pausado', 'completado', 'cancelado', 'pendiente_aprobacion', 'pendiente_partes'),
    defaultValue: 'programado'
  },
  scheduledDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  estimatedDuration: {
    type: DataTypes.FLOAT,
    defaultValue: 1,
    validate: {
      min: 0
    }
  },
  actualDuration: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  odometerReading: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  nextServiceKm: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 2000]
    }
  },
  symptoms: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 1000]
    }
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 1000]
    }
  },
  workPerformed: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 2000]
    }
  },
  recommendations: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 1000]
    }
  },
  services: {
    type: DataTypes.JSONB,
    defaultValue: [],
    validate: {
      isValidServices(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Services must be an array');
        }
        if (value) {
          value.forEach(service => {
            if (!service.category || !service.description) {
              throw new Error('Service must have category and description');
            }
            const validCategories = ['motor', 'transmision', 'frenos', 'suspension', 'direccion', 'electrico', 'aire_acondicionado', 'sistema_combustible', 'escape', 'neumaticos', 'carroceria', 'interior', 'diagnostico', 'otros'];
            if (!validCategories.includes(service.category)) {
              throw new Error('Invalid service category');
            }
          });
        }
      }
    }
  },
  parts: {
    type: DataTypes.JSONB,
    defaultValue: [],
    validate: {
      isValidParts(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Parts must be an array');
        }
        if (value) {
          value.forEach(part => {
            if (!part.name || part.quantity < 1 || part.unitPrice < 0) {
              throw new Error('Part must have valid name, quantity and price');
            }
          });
        }
      }
    }
  },
  costs: {
    type: DataTypes.JSONB,
    defaultValue: {
      labor: 0,
      parts: 0,
      materials: 0,
      external: 0,
      tax: 0,
      discount: 0,
      total: 0
    },
    validate: {
      isValidCosts(value) {
        if (value && typeof value !== 'object') {
          throw new Error('Costs must be an object');
        }
        if (value) {
          const costFields = ['labor', 'parts', 'materials', 'external', 'tax', 'discount', 'total'];
          costFields.forEach(field => {
            if (value[field] !== undefined && (typeof value[field] !== 'number' || value[field] < 0)) {
              throw new Error(`Cost ${field} must be a non-negative number`);
            }
          });
        }
      }
    }
  },
  costResponsibility: {
    type: DataTypes.JSONB,
    defaultValue: {
      responsibleParty: 'empresa_propietaria',
      notes: null,
      approvedBy: null,
      approvalDate: null
    },
    validate: {
      isValidCostResponsibility(value) {
        if (value && typeof value !== 'object') {
          throw new Error('Cost responsibility must be an object');
        }
        if (value && value.responsibleParty && 
            !['empresa_propietaria', 'empresa_arrendataria', 'compartido'].includes(value.responsibleParty)) {
          throw new Error('Invalid responsible party');
        }
      }
    }
  },
  inspections: {
    type: DataTypes.JSONB,
    defaultValue: [],
    validate: {
      isValidInspections(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Inspections must be an array');
        }
        if (value) {
          value.forEach(inspection => {
            if (!inspection.item || !inspection.status) {
              throw new Error('Inspection must have item and status');
            }
            const validStatuses = ['bueno', 'regular', 'malo', 'requiere_atencion', 'no_aplica'];
            if (!validStatuses.includes(inspection.status)) {
              throw new Error('Invalid inspection status');
            }
          });
        }
      }
    }
  },
  photos: {
    type: DataTypes.JSONB,
    defaultValue: [],
    validate: {
      isValidPhotos(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Photos must be an array');
        }
        if (value) {
          value.forEach(photo => {
            if (!photo.url) {
              throw new Error('Photo must have URL');
            }
            if (photo.category && !['antes', 'durante', 'despues', 'problema', 'solucion', 'otro'].includes(photo.category)) {
              throw new Error('Invalid photo category');
            }
          });
        }
      }
    }
  },
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: [],
    validate: {
      isValidAttachments(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Attachments must be an array');
        }
        if (value) {
          value.forEach(attachment => {
            if (!attachment.name || !attachment.url) {
              throw new Error('Attachment must have name and URL');
            }
            if (attachment.type && !['image', 'document', 'video', 'audio', 'other'].includes(attachment.type)) {
              throw new Error('Invalid attachment type');
            }
          });
        }
      }
    }
  },
  approvals: {
    type: DataTypes.JSONB,
    defaultValue: [],
    validate: {
      isValidApprovals(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Approvals must be an array');
        }
        if (value) {
          value.forEach(approval => {
            if (!approval.type || !approval.requestedBy) {
              throw new Error('Approval must have type and requestedBy');
            }
            const validTypes = ['presupuesto', 'trabajo_adicional', 'partes_especiales', 'garantia'];
            if (!validTypes.includes(approval.type)) {
              throw new Error('Invalid approval type');
            }
            const validStatuses = ['pendiente', 'aprobado', 'rechazado'];
            if (approval.status && !validStatuses.includes(approval.status)) {
              throw new Error('Invalid approval status');
            }
          });
        }
      }
    }
  },
  timeTracking: {
    type: DataTypes.JSONB,
    defaultValue: [],
    validate: {
      isValidTimeTracking(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Time tracking must be an array');
        }
        if (value) {
          value.forEach(entry => {
            if (!entry.user || !entry.startTime || !entry.activity) {
              throw new Error('Time entry must have user, startTime and activity');
            }
          });
        }
      }
    }
  },
  quality: {
    type: DataTypes.JSONB,
    defaultValue: {
      rating: null,
      feedback: null,
      ratedBy: null,
      ratedDate: null
    },
    validate: {
      isValidQuality(value) {
        if (value && typeof value !== 'object') {
          throw new Error('Quality must be an object');
        }
        if (value && value.rating && (value.rating < 1 || value.rating > 5)) {
          throw new Error('Quality rating must be between 1 and 5');
        }
      }
    }
  },
  warranty: {
    type: DataTypes.JSONB,
    defaultValue: {
      duration: null,
      startDate: null,
      endDate: null,
      terms: null,
      isActive: false
    },
    validate: {
      isValidWarranty(value) {
        if (value && typeof value !== 'object') {
          throw new Error('Warranty must be an object');
        }
        if (value && value.duration && value.duration < 0) {
          throw new Error('Warranty duration cannot be negative');
        }
      }
    }
  },
  nextMaintenance: {
    type: DataTypes.JSONB,
    defaultValue: {
      type: null,
      scheduledDate: null,
      estimatedKm: null,
      description: null
    },
    validate: {
      isValidNextMaintenance(value) {
        if (value && typeof value !== 'object') {
          throw new Error('Next maintenance must be an object');
        }
        if (value && value.type && !['preventivo', 'inspeccion'].includes(value.type)) {
          throw new Error('Invalid next maintenance type');
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
  },
  lastModifiedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 1000]
    }
  }
}, {
  sequelize,
  modelName: 'Maintenance',
  tableName: 'Maintenances',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['workOrderNumber']
    },
    {
      fields: ['companyId', 'status']
    },
    {
      fields: ['vehicleId', 'scheduledDate']
    },
    {
      fields: ['branchId', 'status']
    },
    {
      fields: ['assignedToId', 'status']
    },
    {
      fields: ['scheduledDate']
    },
    {
      fields: ['type', 'priority']
    },
    {
      fields: [sequelize.literal("(costs->>'total')")],
      name: 'maintenances_costs_total_idx'
    }
  ],
  hooks: {
    beforeSave: async (maintenance, options) => {
      // Calcular costos totales
      const costs = maintenance.costs || {};
      const parts = maintenance.parts || [];
      const services = maintenance.services || [];
      
      costs.parts = parts.reduce((sum, part) => sum + (part.totalPrice || 0), 0);
      costs.labor = services.reduce((sum, service) => sum + (service.laborCost || 0), 0);
      costs.total = (costs.labor || 0) + (costs.parts || 0) + (costs.materials || 0) + 
                   (costs.external || 0) + (costs.tax || 0) - (costs.discount || 0);
      
      maintenance.costs = costs;
      
      // Generar número de orden de trabajo si no existe
      if (!maintenance.workOrderNumber) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        maintenance.workOrderNumber = `WO${year}${month}${day}${random}`;
      }
      
      // Actualizar fechas según el estado
      if (maintenance.changed('status')) {
        switch (maintenance.status) {
          case 'en_proceso':
            if (!maintenance.startDate) maintenance.startDate = new Date();
            break;
          case 'completado':
            if (!maintenance.completedDate) maintenance.completedDate = new Date();
            if (maintenance.startDate && maintenance.completedDate) {
              maintenance.actualDuration = (maintenance.completedDate - maintenance.startDate) / (1000 * 60 * 60); // En horas
            }
            break;
        }
      }
      
      // Actualizar lastModifiedById si no es un documento nuevo
      if (!maintenance.isNewRecord && maintenance.changed()) {
        maintenance.lastModifiedById = options.modifiedBy || maintenance.lastModifiedById;
      }
    }
  }
});

// Definir asociaciones
Maintenance.associate = (models) => {
  Maintenance.belongsTo(models.Vehicle, {
    foreignKey: 'vehicleId',
    as: 'vehicle'
  });
  
  Maintenance.belongsTo(models.Company, {
    foreignKey: 'companyId',
    as: 'company'
  });
  
  Maintenance.belongsTo(models.Branch, {
    foreignKey: 'branchId',
    as: 'branch'
  });
  
  Maintenance.belongsTo(models.User, {
    foreignKey: 'assignedToId',
    as: 'assignedTo'
  });
  
  Maintenance.belongsTo(models.User, {
    foreignKey: 'createdById',
    as: 'createdBy'
  });
  
  Maintenance.belongsTo(models.User, {
    foreignKey: 'lastModifiedById',
    as: 'lastModifiedBy'
  });
};

module.exports = Maintenance;