import axios from 'axios';

// Configuración base de Axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Si hay un error de red
    if (!error.response) {
      console.error('Error de red:', error.message);
    }
    
    // No manejar errores 401 aquí - se manejan en AuthContext
    return Promise.reject(error);
  }
);

export default api;

// Funciones de utilidad para las llamadas a la API
export const apiUtils = {
  // Autenticación
  auth: {
    login: (credentials) => api.post('/api/auth/login', credentials),
    register: (data) => api.post('/api/auth/register', data),
    forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),
    resetPassword: (token, password) => api.post('/api/auth/reset-password', { token, password }),
    refreshToken: () => api.post('/api/auth/refresh'),
    logout: () => api.post('/api/auth/logout'),
    getProfile: () => api.get('/api/auth/profile'),
    updateProfile: (data) => api.put('/api/auth/profile', data),
    changePassword: (data) => api.put('/api/auth/change-password', data),
  },

  // Empresas
  companies: {
    getAll: (params) => api.get('/api/companies', { params }),
    getById: (id) => api.get(`/api/companies/${id}`),
    create: (data) => api.post('/api/companies', data),
    update: (id, data) => api.put(`/api/companies/${id}`, data),
    delete: (id) => api.delete(`/api/companies/${id}`),
    updateStatus: (id, status) => api.patch(`/api/companies/${id}/status`, { status }),
    getStats: () => api.get('/api/companies/stats'),
  },

  // Delegaciones
  branches: {
    getAll: (params) => api.get('/api/branches', { params }),
    getById: (id) => api.get(`/api/branches/${id}`),
    create: (data) => api.post('/api/branches', data),
    update: (id, data) => api.put(`/api/branches/${id}`, data),
    delete: (id) => api.delete(`/api/branches/${id}`),
    updateStatus: (id, status) => api.patch(`/api/branches/${id}/status`, { status }),
    getByCompany: (companyId) => api.get(`/api/branches/company/${companyId}`),
  },

  // Vehículos
  vehicles: {
    getAll: (params) => api.get('/api/vehicles', { params }),
    getById: (id) => api.get(`/api/vehicles/${id}`),
    create: (data) => api.post('/api/vehicles', data),
    update: (id, data) => api.put(`/api/vehicles/${id}`, data),
    delete: (id) => api.delete(`/api/vehicles/${id}`),
    updateStatus: (id, status) => api.patch(`/api/vehicles/${id}/status`, { status }),
    updateMileage: (id, mileage) => api.patch(`/api/vehicles/${id}/mileage`, { mileage }),
    getAlerts: (id) => api.get(`/api/vehicles/${id}/alerts`),
    getMaintenanceHistory: (id) => api.get(`/api/vehicles/${id}/maintenance-history`),
    uploadDocuments: (id, formData) => api.post(`/api/vehicles/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  },

  // Mantenimientos
  maintenance: {
    getAll: (params) => api.get('/api/maintenance', { params }),
    getById: (id) => api.get(`/api/maintenance/${id}`),
    create: (data) => api.post('/api/maintenance', data),
    update: (id, data) => api.put(`/api/maintenance/${id}`, data),
    delete: (id) => api.delete(`/api/maintenance/${id}`),
    updateStatus: (id, status) => api.patch(`/api/maintenance/${id}/status`, { status }),
    addTimeLog: (id, data) => api.post(`/api/maintenance/${id}/time-log`, data),
    getTimeLog: (id) => api.get(`/api/maintenance/${id}/time-log`),
    addCost: (id, data) => api.post(`/api/maintenance/${id}/costs`, data),
    getCosts: (id) => api.get(`/api/maintenance/${id}/costs`),
    uploadFiles: (id, formData) => api.post(`/api/maintenance/${id}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  },

  // Usuarios
  users: {
    getAll: (params) => api.get('/api/users', { params }),
    getById: (id) => api.get(`/api/users/${id}`),
    create: (data) => api.post('/api/users', data),
    update: (id, data) => api.put(`/api/users/${id}`, data),
    delete: (id) => api.delete(`/api/users/${id}`),
    updateStatus: (id, status) => api.patch(`/api/users/${id}/status`, { status }),
    resetPassword: (id) => api.post(`/api/users/${id}/reset-password`),
    updatePassword: (id, data) => api.put(`/api/users/${id}/password`, data),
    getRoles: () => api.get('/api/users/roles'),
    getStats: () => api.get('/api/users/stats'),
    getActivity: (id) => api.get(`/api/users/${id}/activity`),
  },

  // Reportes
  reports: {
    getDashboard: (params) => api.get('/api/reports/dashboard', { params }),
    getVehicles: (params) => api.get('/api/reports/vehicles', { params }),
    getMaintenance: (params) => api.get('/api/reports/maintenance', { params }),
    getCosts: (params) => api.get('/api/reports/costs', { params }),
    getPerformance: (params) => api.get('/api/reports/performance', { params }),
    exportToCsv: (type, params) => api.get(`/api/reports/export/${type}`, {
      params,
      responseType: 'blob'
    }),
  },

  // Configuraciones
  settings: {
    getAll: () => api.get('/api/settings'),
    update: (data) => api.put('/api/settings', data),
    getStats: () => api.get('/api/settings/stats'),
    createBackup: () => api.post('/api/settings/backup', {}, { responseType: 'blob' }),
    restoreBackup: (formData) => api.post('/api/settings/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    cleanData: (type) => api.delete(`/api/settings/clean/${type}`),
    optimizeDatabase: () => api.post('/api/settings/optimize'),
    restartServices: () => api.post('/api/settings/restart'),
  },

  // Notificaciones
  notifications: {
    getAll: (params) => api.get('/api/notifications', { params }),
    markAsRead: (id) => api.patch(`/api/notifications/${id}/read`),
    markAllAsRead: () => api.patch('/api/notifications/read-all'),
    delete: (id) => api.delete(`/api/notifications/${id}`),
    getUnreadCount: () => api.get('/api/notifications/unread-count'),
  },

  // Archivos
  files: {
    upload: (formData) => api.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    download: (id) => api.get(`/api/files/${id}/download`, { responseType: 'blob' }),
    delete: (id) => api.delete(`/api/files/${id}`),
  },
};

// Funciones de utilidad para manejo de errores
export const handleApiError = (error) => {
  if (error.response) {
    // El servidor respondió con un código de estado de error
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return data.message || 'Datos inválidos';
      case 401:
        return 'No autorizado. Por favor, inicia sesión nuevamente.';
      case 403:
        return 'No tienes permisos para realizar esta acción.';
      case 404:
        return 'Recurso no encontrado.';
      case 409:
        return data.message || 'Conflicto con los datos existentes.';
      case 422:
        return data.message || 'Datos de validación incorrectos.';
      case 500:
        return 'Error interno del servidor. Por favor, intenta más tarde.';
      default:
        return data.message || 'Ha ocurrido un error inesperado.';
    }
  } else if (error.request) {
    // La petición fue hecha pero no se recibió respuesta
    return 'Error de conexión. Verifica tu conexión a internet.';
  } else {
    // Algo pasó al configurar la petición
    return 'Error al procesar la solicitud.';
  }
};

// Función para formatear parámetros de consulta
export const formatQueryParams = (params) => {
  const filtered = Object.entries(params)
    .filter(([key, value]) => value !== null && value !== undefined && value !== '')
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  
  return filtered;
};

// Función para crear URLs de descarga
export const createDownloadUrl = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};