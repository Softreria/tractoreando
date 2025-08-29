const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

class User extends Model {
  // Virtual para nombre completo
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  // Virtual para verificar si la cuenta está bloqueada
  get isLocked() {
    return !!(this.lockUntil && this.lockUntil > new Date());
  }

  // Método para comparar contraseñas
  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Método para incrementar intentos de login
  async incLoginAttempts() {
    // Si ya tenemos un lockUntil y no ha expirado, solo incrementamos
    if (this.lockUntil && this.lockUntil < new Date()) {
      await this.update({
        lockUntil: null,
        loginAttempts: 1
      });
      return;
    }

    const updates = { loginAttempts: this.loginAttempts + 1 };

    // Si llegamos al máximo de intentos y no estamos bloqueados, bloquear
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
      updates.lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas
    }

    await this.update(updates);
  }

  // Método para resetear intentos de login
  async resetLoginAttempts() {
    await this.update({
      loginAttempts: 0,
      lockUntil: null
    });
  }

  // Método toJSON personalizado
  toJSON() {
    const values = Object.assign({}, this.get());
    delete values.password;
    delete values.emailVerificationToken;
    delete values.passwordResetToken;
    delete values.passwordResetExpires;
    delete values.loginAttempts;
    delete values.lockUntil;
    return values;
  }

  // Método para establecer permisos por defecto según el rol
  setDefaultPermissions() {
    const allVehicleTypes = [
      'Tractor', 'Camión', 'Furgoneta', 'Coche', 'Motocicleta', 'Remolque', 'Maquinaria', 'Otro'
    ];

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
        if (!this.vehicleTypeAccess || this.vehicleTypeAccess.length === 0) {
          this.vehicleTypeAccess = ['Coche', 'Motocicleta', 'Furgoneta', 'Camión'];
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
        if (!this.vehicleTypeAccess || this.vehicleTypeAccess.length === 0) {
          this.vehicleTypeAccess = ['Coche', 'Motocicleta', 'Furgoneta'];
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
        if (!this.vehicleTypeAccess || this.vehicleTypeAccess.length === 0) {
          this.vehicleTypeAccess = ['Coche', 'Motocicleta'];
        }
    }
  }
}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50]
    }
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    },
    set(value) {
      this.setDataValue('email', value.toLowerCase().trim());
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 255]
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Companies',
      key: 'id'
    },
    validate: {
      isRequiredForNonSuperAdmin(value) {
        if (this.role !== 'super_admin' && !value) {
          throw new Error('Company is required for non-super admin users');
        }
      }
    }
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Branches',
      key: 'id'
    },
    validate: {
      isRequiredForNonSuperAdmin(value) {
        if (this.role !== 'super_admin' && !value) {
          throw new Error('Branch is required for non-super admin users');
        }
      }
    }
  },
  vehicleTypeAccess: {
    type: DataTypes.ARRAY(DataTypes.ENUM(
      'Tractor', 'Camión', 'Furgoneta', 'Coche', 'Motocicleta', 'Remolque', 'Maquinaria', 'Otro'
    )),
    defaultValue: []
  },
  role: {
    type: DataTypes.ENUM(
      'super_admin', 'company_admin', 'branch_manager', 'mechanic', 'operator', 'viewer'
    ),
    allowNull: false
  },
  permissions: {
    type: DataTypes.JSONB,
    defaultValue: {
      companies: { create: false, read: true, update: false, delete: false },
      branches: { create: false, read: true, update: false, delete: false },
      vehicles: { create: false, read: true, update: false, delete: false },
      maintenance: { create: false, read: true, update: false, delete: false },
      users: { create: false, read: false, update: false, delete: false },
      reports: { read: true, export: false }
    }
  },
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      language: 'es',
      timezone: 'Europe/Madrid',
      notifications: {
        email: true,
        push: true,
        sms: false
      },
      dashboard: {
        defaultView: 'overview',
        itemsPerPage: 10
      }
    }
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lockUntil: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'Users',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['companyId', 'role']
    },
    {
      fields: ['companyId', 'isActive']
    },
    {
      fields: ['branchId']
    }
  ],
  hooks: {
    beforeSave: async (user, options) => {
      // Hash password si ha sido modificado
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }

      // Establecer permisos por defecto si el rol ha cambiado o es un nuevo usuario
      if (user.changed('role') || user.isNewRecord) {
        user.setDefaultPermissions();
      }
    }
  }
});

// Definir asociaciones
User.associate = (models) => {
  User.belongsTo(models.Company, {
    foreignKey: 'companyId',
    as: 'company'
  });
  
  User.belongsTo(models.Branch, {
    foreignKey: 'branchId',
    as: 'branch'
  });
  
  User.belongsTo(models.User, {
    foreignKey: 'createdById',
    as: 'createdBy'
  });
  
  User.hasMany(models.User, {
    foreignKey: 'createdById',
    as: 'createdUsers'
  });
};

module.exports = User;