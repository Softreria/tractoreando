/**
 * Configuración centralizada de URLs y entornos
 * Este archivo centraliza todas las URLs base para evitar hardcodear valores
 * y facilitar el cambio entre entornos (desarrollo/producción)
 */

// URL base principal - todas las demás se generan a partir de esta
const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:3002';

// Configuración base del entorno
export const ENV_CONFIG = {
  // Información del entorno
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  // URL base principal
  BASE_URL: BASE_URL,
  
  // URLs principales (generadas automáticamente)
  API_URL: process.env.REACT_APP_API_URL || `${BASE_URL}/api`,
  FRONTEND_URL: process.env.REACT_APP_FRONTEND_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : BASE_URL),
  BACKEND_URL: process.env.REACT_APP_BACKEND_URL || BASE_URL,
  
  // URLs de recursos (generadas automáticamente)
  FILES_URL: process.env.REACT_APP_FILES_URL || `${BASE_URL}/uploads`,
  IMAGES_URL: process.env.REACT_APP_IMAGES_URL || `${BASE_URL}/images`,
  DOCUMENTS_URL: process.env.REACT_APP_DOCUMENTS_URL || `${BASE_URL}/documents`,
  
  // Configuración de la aplicación
  APP_VERSION: process.env.REACT_APP_VERSION || '1.0.0',
  APP_ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT || 'development',
  
  // Configuración de funcionalidades
  ENABLE_ANALYTICS: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  ENABLE_ERROR_REPORTING: process.env.REACT_APP_ENABLE_ERROR_REPORTING === 'true',
  ENABLE_DEVTOOLS: process.env.REACT_APP_ENABLE_DEVTOOLS === 'true',
  DEBUG_MODE: process.env.REACT_APP_DEBUG_MODE === 'true',
  
  // Configuración de archivos
  MAX_FILE_SIZE: parseInt(process.env.REACT_APP_MAX_FILE_SIZE) || 10485760, // 10MB
  ALLOWED_FILE_TYPES: process.env.REACT_APP_ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'application/pdf'
  ],
  
  // Configuración de UI
  THEME: process.env.REACT_APP_THEME || 'light',
  LANGUAGE: process.env.REACT_APP_LANGUAGE || 'es',
  TIMEZONE: process.env.REACT_APP_TIMEZONE || 'Europe/Madrid',
  
  // Configuración de cache
  CACHE_DURATION: parseInt(process.env.REACT_APP_CACHE_DURATION) || 0,
};

/**
 * Utilidades para construcción de URLs
 */
export const URL_BUILDER = {
  /**
   * Construye una URL completa para la API
   * @param {string} endpoint - El endpoint de la API (ej: '/users', '/vehicles/123')
   * @returns {string} URL completa
   */
  api: (endpoint) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${ENV_CONFIG.API_URL}${cleanEndpoint}`;
  },

  /**
   * Construye una URL para archivos subidos
   * @param {string} filename - Nombre del archivo
   * @returns {string} URL completa del archivo
   */
  file: (filename) => {
    if (!filename) return null;
    const cleanFilename = filename.startsWith('/') ? filename.slice(1) : filename;
    return `${ENV_CONFIG.FILES_URL}/${cleanFilename}`;
  },

  /**
   * Construye una URL para imágenes
   * @param {string} imageName - Nombre de la imagen
   * @returns {string} URL completa de la imagen
   */
  image: (imageName) => {
    if (!imageName) return null;
    const cleanImageName = imageName.startsWith('/') ? imageName.slice(1) : imageName;
    return `${ENV_CONFIG.IMAGES_URL}/${cleanImageName}`;
  },

  /**
   * Construye una URL para documentos
   * @param {string} documentName - Nombre del documento
   * @returns {string} URL completa del documento
   */
  document: (documentName) => {
    if (!documentName) return null;
    const cleanDocumentName = documentName.startsWith('/') ? documentName.slice(1) : documentName;
    return `${ENV_CONFIG.DOCUMENTS_URL}/${cleanDocumentName}`;
  },

  /**
   * Construye una URL completa del frontend
   * @param {string} path - Ruta del frontend (ej: '/dashboard', '/vehicles/123')
   * @returns {string} URL completa
   */
  frontend: (path) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${ENV_CONFIG.FRONTEND_URL}${cleanPath}`;
  },

  /**
   * Construye una URL del backend (no API)
   * @param {string} path - Ruta del backend
   * @returns {string} URL completa
   */
  backend: (path) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${ENV_CONFIG.BACKEND_URL}${cleanPath}`;
  }
};

/**
 * Configuración específica por entorno
 */
export const ENVIRONMENT_CONFIGS = {
  development: {
    API_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    LOG_LEVEL: 'debug',
    ENABLE_MOCK_DATA: true,
  },
  production: {
    API_TIMEOUT: 15000,
    RETRY_ATTEMPTS: 2,
    LOG_LEVEL: 'error',
    ENABLE_MOCK_DATA: false,
  }
};

/**
 * Obtiene la configuración específica del entorno actual
 */
export const getCurrentEnvironmentConfig = () => {
  return ENVIRONMENT_CONFIGS[ENV_CONFIG.NODE_ENV] || ENVIRONMENT_CONFIGS.development;
};

/**
 * Función de utilidad para logging condicional
 */
export const log = {
  debug: (...args) => {
    if (ENV_CONFIG.DEBUG_MODE) {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args) => {
    if (ENV_CONFIG.DEBUG_MODE || ENV_CONFIG.IS_DEVELOPMENT) {
      console.info('[INFO]', ...args);
    }
  },
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args) => {
    console.error('[ERROR]', ...args);
  }
};

/**
 * Validación de configuración
 */
export const validateConfig = () => {
  const requiredVars = ['API_URL', 'FRONTEND_URL', 'BACKEND_URL'];
  const missing = requiredVars.filter(varName => !ENV_CONFIG[varName]);
  
  if (missing.length > 0) {
    log.error('Variables de entorno faltantes:', missing);
    return false;
  }
  
  log.info('Configuración de entorno validada correctamente');
  return true;
};

// Validar configuración al cargar el módulo
if (ENV_CONFIG.IS_DEVELOPMENT) {
  validateConfig();
  log.debug('Configuración de entorno cargada:', ENV_CONFIG);
}

export default ENV_CONFIG;