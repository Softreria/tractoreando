// Roles de usuario
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  MECHANIC: 'mechanic',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
};

// Etiquetas de roles para mostrar en la UI
export const ROLE_LABELS = {
  [USER_ROLES.SUPER_ADMIN]: 'Super Administrador',
  [USER_ROLES.ADMIN]: 'Administrador',
  [USER_ROLES.MANAGER]: 'Gerente',
  [USER_ROLES.MECHANIC]: 'Mecánico',
  [USER_ROLES.OPERATOR]: 'Operador',
  [USER_ROLES.VIEWER]: 'Visualizador'
};

// Estados de usuario
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
};

// Etiquetas de estados de usuario
export const USER_STATUS_LABELS = {
  [USER_STATUS.ACTIVE]: 'Activo',
  [USER_STATUS.INACTIVE]: 'Inactivo',
  [USER_STATUS.SUSPENDED]: 'Suspendido',
  [USER_STATUS.PENDING]: 'Pendiente'
};

// Estados de empresa
export const COMPANY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  TRIAL: 'trial'
};

// Etiquetas de estados de empresa
export const COMPANY_STATUS_LABELS = {
  [COMPANY_STATUS.ACTIVE]: 'Activa',
  [COMPANY_STATUS.INACTIVE]: 'Inactiva',
  [COMPANY_STATUS.SUSPENDED]: 'Suspendida',
  [COMPANY_STATUS.TRIAL]: 'Prueba'
};

// Estados de vehículo
export const VEHICLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service'
};

// Etiquetas de estados de vehículo
export const VEHICLE_STATUS_LABELS = {
  [VEHICLE_STATUS.ACTIVE]: 'Activo',
  [VEHICLE_STATUS.INACTIVE]: 'Inactivo',
  [VEHICLE_STATUS.MAINTENANCE]: 'En Mantenimiento',
  [VEHICLE_STATUS.OUT_OF_SERVICE]: 'Fuera de Servicio'
};

// Tipos de vehículo
export const VEHICLE_TYPES = {
  CAR: 'car',
  TRUCK: 'truck',
  VAN: 'van',
  MOTORCYCLE: 'motorcycle',
  BUS: 'bus',
  TRAILER: 'trailer',
  HEAVY_MACHINERY: 'heavy_machinery',
  OTHER: 'other'
};

// Etiquetas de tipos de vehículo
export const VEHICLE_TYPE_LABELS = {
  [VEHICLE_TYPES.CAR]: 'Automóvil',
  [VEHICLE_TYPES.TRUCK]: 'Camión',
  [VEHICLE_TYPES.VAN]: 'Camioneta',
  [VEHICLE_TYPES.MOTORCYCLE]: 'Motocicleta',
  [VEHICLE_TYPES.BUS]: 'Autobús',
  [VEHICLE_TYPES.TRAILER]: 'Remolque',
  [VEHICLE_TYPES.HEAVY_MACHINERY]: 'Maquinaria Pesada',
  [VEHICLE_TYPES.OTHER]: 'Otro'
};

// Estados de mantenimiento
export const MAINTENANCE_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  OVERDUE: 'overdue'
};

// Etiquetas de estados de mantenimiento
export const MAINTENANCE_STATUS_LABELS = {
  [MAINTENANCE_STATUS.SCHEDULED]: 'Programado',
  [MAINTENANCE_STATUS.IN_PROGRESS]: 'En Progreso',
  [MAINTENANCE_STATUS.COMPLETED]: 'Completado',
  [MAINTENANCE_STATUS.CANCELLED]: 'Cancelado',
  [MAINTENANCE_STATUS.OVERDUE]: 'Vencido'
};

// Tipos de mantenimiento
export const MAINTENANCE_TYPES = {
  PREVENTIVE: 'preventive',
  CORRECTIVE: 'corrective',
  PREDICTIVE: 'predictive',
  EMERGENCY: 'emergency'
};

// Etiquetas de tipos de mantenimiento
export const MAINTENANCE_TYPE_LABELS = {
  [MAINTENANCE_TYPES.PREVENTIVE]: 'Preventivo',
  [MAINTENANCE_TYPES.CORRECTIVE]: 'Correctivo',
  [MAINTENANCE_TYPES.PREDICTIVE]: 'Predictivo',
  [MAINTENANCE_TYPES.EMERGENCY]: 'Emergencia'
};

// Prioridades de mantenimiento
export const MAINTENANCE_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Etiquetas de prioridades de mantenimiento
export const MAINTENANCE_PRIORITY_LABELS = {
  [MAINTENANCE_PRIORITIES.LOW]: 'Baja',
  [MAINTENANCE_PRIORITIES.MEDIUM]: 'Media',
  [MAINTENANCE_PRIORITIES.HIGH]: 'Alta',
  [MAINTENANCE_PRIORITIES.URGENT]: 'Urgente'
};

// Tipos de alerta
export const ALERT_TYPES = {
  MAINTENANCE_DUE: 'maintenance_due',
  MAINTENANCE_OVERDUE: 'maintenance_overdue',
  DOCUMENT_EXPIRY: 'document_expiry',
  HIGH_MILEAGE: 'high_mileage',
  COST_THRESHOLD: 'cost_threshold',
  SYSTEM: 'system'
};

// Etiquetas de tipos de alerta
export const ALERT_TYPE_LABELS = {
  [ALERT_TYPES.MAINTENANCE_DUE]: 'Mantenimiento Próximo',
  [ALERT_TYPES.MAINTENANCE_OVERDUE]: 'Mantenimiento Vencido',
  [ALERT_TYPES.DOCUMENT_EXPIRY]: 'Documento por Vencer',
  [ALERT_TYPES.HIGH_MILEAGE]: 'Kilometraje Alto',
  [ALERT_TYPES.COST_THRESHOLD]: 'Umbral de Costo',
  [ALERT_TYPES.SYSTEM]: 'Sistema'
};

// Niveles de alerta
export const ALERT_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success'
};

// Tipos de notificación
export const NOTIFICATION_TYPES = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  IN_APP: 'in_app'
};

// Módulos del sistema para permisos
export const MODULES = {
  COMPANIES: 'companies',
  BRANCHES: 'branches',
  VEHICLES: 'vehicles',
  MAINTENANCE: 'maintenance',
  USERS: 'users',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  NOTIFICATIONS: 'notifications'
};

// Acciones para permisos
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  EXPORT: 'export',
  IMPORT: 'import'
};

// Etiquetas de módulos
export const MODULE_LABELS = {
  [MODULES.COMPANIES]: 'Empresas',
  [MODULES.BRANCHES]: 'Delegaciones',
  [MODULES.VEHICLES]: 'Vehículos',
  [MODULES.MAINTENANCE]: 'Mantenimiento',
  [MODULES.USERS]: 'Usuarios',
  [MODULES.REPORTS]: 'Reportes',
  [MODULES.SETTINGS]: 'Configuraciones',
  [MODULES.NOTIFICATIONS]: 'Notificaciones'
};

// Etiquetas de acciones
export const ACTION_LABELS = {
  [ACTIONS.CREATE]: 'Crear',
  [ACTIONS.READ]: 'Leer',
  [ACTIONS.UPDATE]: 'Actualizar',
  [ACTIONS.DELETE]: 'Eliminar',
  [ACTIONS.EXPORT]: 'Exportar',
  [ACTIONS.IMPORT]: 'Importar'
};

// Tipos de archivo permitidos
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  SPREADSHEETS: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ALL: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
};

// Tamaños máximos de archivo (en bytes)
export const MAX_FILE_SIZES = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  BACKUP: 100 * 1024 * 1024 // 100MB
};

// Configuraciones de paginación
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100],
  MAX_PAGE_SIZE: 100
};

// Configuraciones de fecha
export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  DISPLAY_WITH_TIME: 'DD/MM/YYYY HH:mm',
  API: 'YYYY-MM-DD',
  API_WITH_TIME: 'YYYY-MM-DD HH:mm:ss'
};

// Intervalos de tiempo para reportes
export const TIME_INTERVALS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly'
};

// Etiquetas de intervalos de tiempo
export const TIME_INTERVAL_LABELS = {
  [TIME_INTERVALS.DAILY]: 'Diario',
  [TIME_INTERVALS.WEEKLY]: 'Semanal',
  [TIME_INTERVALS.MONTHLY]: 'Mensual',
  [TIME_INTERVALS.QUARTERLY]: 'Trimestral',
  [TIME_INTERVALS.YEARLY]: 'Anual'
};

// Monedas soportadas
export const CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR'
};

// Etiquetas de monedas
export const CURRENCY_LABELS = {
  [CURRENCIES.USD]: 'Dólar Americano',
  [CURRENCIES.EUR]: 'Euro'
};

// Símbolos de monedas
export const CURRENCY_SYMBOLS = {
  [CURRENCIES.USD]: '$',
  [CURRENCIES.EUR]: '€'
};

// Idiomas soportados
export const LANGUAGES = {
  ES: 'es',
  EN: 'en'
};

// Etiquetas de idiomas
export const LANGUAGE_LABELS = {
  [LANGUAGES.ES]: 'Español',
  [LANGUAGES.EN]: 'English'
};

// Zonas horarias
export const TIMEZONES = {
  MADRID: 'Europe/Madrid',
  BARCELONA: 'Europe/Madrid',
  CANARIAS: 'Atlantic/Canary'
};

// Etiquetas de zonas horarias
export const TIMEZONE_LABELS = {
  [TIMEZONES.MADRID]: 'Madrid (Península)',
  [TIMEZONES.BARCELONA]: 'Barcelona (Península)',
  [TIMEZONES.CANARIAS]: 'Canarias'
};

// Temas de la aplicación
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

// Etiquetas de temas
export const THEME_LABELS = {
  [THEMES.LIGHT]: 'Claro',
  [THEMES.DARK]: 'Oscuro',
  [THEMES.AUTO]: 'Automático'
};

// Configuraciones por defecto
export const DEFAULT_SETTINGS = {
  LANGUAGE: LANGUAGES.ES,
  CURRENCY: CURRENCIES.EUR,
  TIMEZONE: TIMEZONES.MADRID,
  THEME: THEMES.LIGHT,
  PAGE_SIZE: PAGINATION.DEFAULT_PAGE_SIZE,
  DATE_FORMAT: DATE_FORMATS.DISPLAY,
  OIL_CHANGE_INTERVAL: 5000, // km
  INSPECTION_INTERVAL: 90, // días
  ALERT_DAYS: 7, // días de anticipación
  SESSION_TIMEOUT: 60, // minutos
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_EXPIRY_DAYS: 90,
  MAX_LOGIN_ATTEMPTS: 5,
  BACKUP_RETENTION_DAYS: 30
};

// Colores del tema
export const THEME_COLORS = {
  PRIMARY: '#1976d2',
  SECONDARY: '#dc004e',
  SUCCESS: '#2e7d32',
  WARNING: '#ed6c02',
  ERROR: '#d32f2f',
  INFO: '#0288d1'
};

// Rutas de la aplicación
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  COMPANIES: '/companies',
  BRANCHES: '/branches',
  VEHICLES: '/vehicles',
  MAINTENANCE: '/maintenance',
  USERS: '/users',
  REPORTS: '/reports',
  PROFILE: '/profile',
  SETTINGS: '/settings'
};

// Mensajes de error comunes
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'Este campo es requerido',
  INVALID_EMAIL: 'Ingresa un email válido',
  INVALID_PHONE: 'Ingresa un teléfono válido',
  INVALID_RFC: 'Ingresa un RFC válido',
  INVALID_PLATE: 'Ingresa una placa válida',
  PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 6 caracteres',
  PASSWORDS_DONT_MATCH: 'Las contraseñas no coinciden',
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet.',
  UNAUTHORIZED: 'No tienes permisos para realizar esta acción',
  NOT_FOUND: 'El recurso solicitado no fue encontrado',
  SERVER_ERROR: 'Error del servidor. Intenta más tarde.',
  VALIDATION_ERROR: 'Los datos ingresados no son válidos'
};

// Mensajes de éxito comunes
export const SUCCESS_MESSAGES = {
  CREATED: 'Creado exitosamente',
  UPDATED: 'Actualizado exitosamente',
  DELETED: 'Eliminado exitosamente',
  SAVED: 'Guardado exitosamente',
  SENT: 'Enviado exitosamente',
  UPLOADED: 'Subido exitosamente',
  DOWNLOADED: 'Descargado exitosamente',
  COPIED: 'Copiado al portapapeles',
  LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  LOGOUT_SUCCESS: 'Sesión cerrada exitosamente',
  PASSWORD_CHANGED: 'Contraseña cambiada exitosamente',
  EMAIL_SENT: 'Email enviado exitosamente'
};

// Configuraciones de la API
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8001/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// Configuraciones de React Query
export const QUERY_CONFIG = {
  STALE_TIME: 5 * 60 * 1000, // 5 minutos
  CACHE_TIME: 10 * 60 * 1000, // 10 minutos
  RETRY: 3,
  RETRY_DELAY: 1000
};

// Configuraciones de validación
export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  RFC: /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/,
  PLATE: /^[A-Z]{3}-?[0-9]{2,4}-?[0-9]{0,2}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/
};