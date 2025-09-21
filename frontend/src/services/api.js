import axios from 'axios';
import { ENV_CONFIG, log } from '../config/environment';

// Configuración base de la API
const API_BASE_URL = ENV_CONFIG.API_URL;

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
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
    // Manejar errores de autenticación - DESHABILITADO para evitar logout automático
    // El manejo de errores 401 se hace en AuthContext.js
    if (error.response?.status === 401) {
      console.log('Error 401 detectado en services/api.js:', error.config?.url);
      // NO hacer logout automático aquí - se maneja en AuthContext
      // localStorage.removeItem('token');
      // localStorage.removeItem('user');
      // window.location.href = '/login';
    }
    
    // Manejar otros errores
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    
    // Log del error para debugging
    log.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: errorMessage,
      data: error.response?.data
    });
    
    return Promise.reject({
      ...error,
      message: errorMessage
    });
  }
);

export default api;