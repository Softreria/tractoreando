import api from './api';

export const vehicleService = {
  // Obtener todos los vehículos
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    
    const response = await api.get(`/vehicles?${queryParams}`);
    return response.data;
  },

  // Obtener un vehículo por ID
  getById: async (id) => {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
  },

  // Crear un nuevo vehículo
  create: async (vehicleData) => {
    const response = await api.post('/vehicles', vehicleData);
    return response.data;
  },

  // Actualizar un vehículo
  update: async (id, vehicleData) => {
    const response = await api.put(`/vehicles/${id}`, vehicleData);
    return response.data;
  },

  // Eliminar un vehículo
  delete: async (id) => {
    const response = await api.delete(`/vehicles/${id}`);
    return response.data;
  },

  // Actualizar odómetro
  updateOdometer: async (id, reading) => {
    const response = await api.put(`/vehicles/${id}/odometer`, { reading });
    return response.data;
  },

  // Actualizar kilometraje
  updateMileage: async (id, mileageData) => {
    const response = await api.patch(`/vehicles/${id}/mileage`, mileageData);
    return response.data;
  },

  // Obtener historial de mantenimiento
  getMaintenanceHistory: async (id) => {
    const response = await api.get(`/vehicles/${id}/maintenance-history`);
    return response.data;
  },

  // Obtener alertas de mantenimiento
  getMaintenanceAlerts: async (id) => {
    const response = await api.get(`/vehicles/${id}/maintenance-alerts`);
    return response.data;
  },

  // Obtener estadísticas de vehículos
  getStats: async () => {
    const response = await api.get('/vehicles/stats/summary');
    return response.data;
  },

  // Subir fotos
  uploadPhotos: async (id, formData) => {
    const response = await api.post(`/vehicles/${id}/photos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Eliminar foto
  deletePhoto: async (id, photoId) => {
    const response = await api.delete(`/vehicles/${id}/photos/${photoId}`);
    return response.data;
  },

  // Subir documentos
  uploadDocument: async (id, formData) => {
    const response = await api.post(`/vehicles/${id}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Obtener documentos
  getDocuments: async (id) => {
    const response = await api.get(`/vehicles/${id}/documents`);
    return response.data;
  },

  // Eliminar documento
  deleteDocument: async (id, documentId) => {
    const response = await api.delete(`/vehicles/${id}/documents/${documentId}`);
    return response.data;
  },

  // Obtener registros de combustible
  getFuelRecords: async (id, params = {}) => {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    
    const response = await api.get(`/vehicles/${id}/fuel?${queryParams}`);
    return response.data;
  },

  // Crear registro de combustible
  createFuelRecord: async (id, fuelData) => {
    const response = await api.post(`/vehicles/${id}/fuel`, fuelData);
    return response.data;
  },

  // Actualizar registro de combustible
  updateFuelRecord: async (id, fuelId, fuelData) => {
    const response = await api.put(`/vehicles/${id}/fuel/${fuelId}`, fuelData);
    return response.data;
  },

  // Eliminar registro de combustible
  deleteFuelRecord: async (id, fuelId) => {
    const response = await api.delete(`/vehicles/${id}/fuel/${fuelId}`);
    return response.data;
  },

  // Obtener estadísticas de combustible de un vehículo
  getFuelStats: async (vehicleId, startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get(`/vehicles/${vehicleId}/fuel/stats?${params}`);
    return response.data;
  },

  // Obtener resumen mensual de combustible por empresa
  getFuelCompanySummary: async (year, month) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    
    const response = await api.get(`/vehicles/fuel/company-summary?${params}`);
    return response.data;
  }
};

export default vehicleService;