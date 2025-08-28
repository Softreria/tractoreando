import axios from 'axios';

// Configuración base de Axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 30000, // Aumentado a 30 segundos para producción
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
    login: (credentials) => api.post('/auth/login', credentials),
    register: (data) => api.post('/auth/register', data),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
    refreshToken: () => api.post('/auth/refresh'),
    logout: () => api.post('/auth/logout'),
    getProfile: () => api.get('/auth/profile'),
    updateProfile: (data) => api.put('/auth/profile', data),
    changePassword: (data) => api.put('/auth/change-password', data),
  },

  // Empresas
  companies: {
    getAll: (params) => api.get('/companies', { params }),
    getById: (id) => api.get(`/companies/${id}`),
    create: (data) => api.post('/companies', data),
    update: (id, data) => api.put(`/companies/${id}`, data),
    delete: (id) => api.delete(`/companies/${id}`),
    updateStatus: (id, status) => api.patch(`/companies/${id}/status`, { status }),
    getStats: () => api.get('/companies/stats'),
  },

  // Delegaciones
  branches: {
    getAll: (params) => api.get('/branches', { params }),
    getById: (id) => api.get(`/branches/${id}`),
    create: (data) => api.post('/branches', data),
    update: (id, data) => api.put(`/branches/${id}`, data),
    delete: (id) => api.delete(`/branches/${id}`),
    updateStatus: (id, status) => api.patch(`/branches/${id}/status`, { status }),
    getByCompany: (companyId) => api.get(`/branches/company/${companyId}`),
  },

  // Vehículos
  vehicles: {
    getAll: (params) => api.get('/vehicles', { params }),
    getById: (id) => api.get(`/vehicles/${id}`),
    create: (data) => api.post('/vehicles', data),
    update: (id, data) => api.put(`/vehicles/${id}`, data),
    delete: (id) => api.delete(`/vehicles/${id}`),
    updateStatus: (id, status) => api.patch(`/vehicles/${id}/status`, { status }),
    updateMileage: (id, mileage) => api.patch(`/vehicles/${id}/mileage`, { mileage }),
    getAlerts: (id) => api.get(`/vehicles/${id}/alerts`),
    getMaintenanceHistory: (id) => api.get(`/vehicles/${id}/maintenance-history`),
    uploadDocuments: (id, formData) => api.post(`/vehicles/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  },

  // Mantenimientos
  maintenance: {
    getAll: (params) => api.get('/maintenance', { params }),
    getById: (id) => api.get(`/maintenance/${id}`),
    create: (data) => api.post('/maintenance', data),
    update: (id, data) => api.put(`/maintenance/${id}`, data),
    delete: (id) => api.delete(`/maintenance/${id}`),
    updateStatus: (id, status) => api.patch(`/maintenance/${id}/status`, { status }),
    addTimeLog: (id, data) => api.post(`/maintenance/${id}/time-log`, data),
    getTimeLog: (id) => api.get(`/maintenance/${id}/time-log`),
    addCost: (id, data) => api.post(`/maintenance/${id}/costs`, data),
    getCosts: (id) => api.get(`/maintenance/${id}/costs`),
    uploadFiles: (id, formData) => api.post(`/maintenance/${id}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  },

  // Usuarios
  users: {
    getAll: (params) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    updateStatus: (id, status) => api.patch(`/users/${id}/status`, { status }),
    resetPassword: (id) => api.post(`/users/${id}/reset-password`),
    updatePassword: (id, data) => api.put(`/users/${id}/password`, data),
    getRoles: () => api.get('/users/roles'),
    getStats: () => api.get('/users/stats'),
    getActivity: (id) => api.get(`/users/${id}/activity`),
  },

  // Reportes
  reports: {
    getDashboard: (params) => api.get('/reports/dashboard', { params }),
    getVehicles: (params) => api.get('/reports/vehicles', { params }),
    getMaintenance: (params) => api.get('/reports/maintenance', { params }),
    exportToCsv: (type, params) => api.get(`/reports/export/${type}`, {
      params,
      responseType: 'blob'
    }),
  },

  // Configuraciones
  settings: {
    getAll: () => api.get('/settings'),
    update: (data) => api.put('/settings', data),
    getStats: () => api.get('/settings/stats'),
    createBackup: () => api.post('/settings/backup', {}, { responseType: 'blob' }),
    restoreBackup: (formData) => api.post('/settings/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    cleanData: (type) => api.delete(`/settings/clean/${type}`),
    optimizeDatabase: () => api.post('/settings/optimize'),
    restartServices: () => api.post('/settings/restart'),
  },

  // Notificaciones
  notifications: {
    getAll: (params) => api.get('/notifications', { params }),
    markAsRead: (id) => api.patch(`/notifications/${id}/read`),
    markAllAsRead: () => api.patch('/notifications/read-all'),
    getUnreadCount: () => api.get('/notifications/unread-count'),
  },

  // Archivos
  files: {
    upload: (formData) => api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    download: (id) => api.get(`/files/${id}/download`, { responseType: 'blob' }),
    delete: (id) => api.delete(`/files/${id}`),
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