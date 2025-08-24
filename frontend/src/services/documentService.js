import api from '../utils/api';

class DocumentService {
  // Subir documento a un vehículo
  async uploadDocument(vehicleId, documentData) {
    try {
      const response = await api.post(`/vehicles/${vehicleId}/documents`, documentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al subir documento' };
    }
  }

  // Obtener documentos de un vehículo
  async getDocuments(vehicleId) {
    try {
      const response = await api.get(`/vehicles/${vehicleId}/documents`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al obtener documentos' };
    }
  }

  // Eliminar documento
  async deleteDocument(vehicleId, documentId) {
    try {
      const response = await api.delete(`/vehicles/${vehicleId}/documents/${documentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al eliminar documento' };
    }
  }

  // Simular subida de archivo (para desarrollo)
  async uploadFile(file) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // En producción, esto sería una subida real a un servicio de almacenamiento
        const mockUrl = `https://example.com/uploads/${Date.now()}_${file.name}`;
        resolve({
          url: mockUrl,
          name: file.name,
          type: this.getFileType(file.type),
          size: file.size
        });
      }, 1500); // Simular tiempo de subida
    });
  }

  // Determinar tipo de archivo
  getFileType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf')) return 'document';
    if (mimeType.includes('video/')) return 'video';
    return 'other';
  }

  // Validar archivo
  validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    if (file.size > maxSize) {
      throw new Error('El archivo es demasiado grande. Máximo 10MB.');
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipo de archivo no permitido. Solo PDF, DOC, DOCX, JPG, PNG.');
    }

    return true;
  }
}

export default new DocumentService();