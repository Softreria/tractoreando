import api from '../utils/api';

class DocumentService {
  /**
   * Subir documentos para un vehículo
   * @param {string} vehicleId - ID del vehículo
   * @param {FileList} files - Archivos a subir
   * @param {Function} onProgress - Callback para progreso de subida
   * @returns {Promise} Respuesta de la API
   */
  async uploadVehicleDocuments(vehicleId, files, onProgress = null) {
    const formData = new FormData();
    
    // Agregar archivos al FormData
    Array.from(files).forEach((file, index) => {
      formData.append('documents', file);
    });

    try {
      const response = await api.post(`/vehicles/${vehicleId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading documents:', error);
      throw error.response?.data || { message: 'Error al subir documentos' };
    }
  }

  // Subir documento a un vehículo (método legacy)
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

  /**
   * Descargar un documento
   * @param {string} vehicleId - ID del vehículo
   * @param {string} documentId - ID del documento
   * @param {string} filename - Nombre del archivo
   * @returns {Promise} Blob del archivo
   */
  async downloadDocument(vehicleId, documentId, filename) {
    try {
      const response = await api.get(`/vehicles/${vehicleId}/documents/${documentId}/download`, {
        responseType: 'blob',
      });
      
      // Crear enlace de descarga
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return response.data;
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error.response?.data || { message: 'Error al descargar documento' };
    }
  }

  /**
   * Subir documentos para un mantenimiento
   * @param {string} maintenanceId - ID del mantenimiento
   * @param {FileList} files - Archivos a subir
   * @param {Function} onProgress - Callback para progreso de subida
   * @returns {Promise} Respuesta de la API
   */
  async uploadMaintenanceDocuments(maintenanceId, files, onProgress = null) {
    const formData = new FormData();
    
    Array.from(files).forEach((file) => {
      formData.append('documents', file);
    });

    try {
      const response = await api.post(`/maintenance/${maintenanceId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading maintenance documents:', error);
      throw error.response?.data || { message: 'Error al subir documentos de mantenimiento' };
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

  /**
   * Validar tipo de archivo
   * @param {File} file - Archivo a validar
   * @param {Array} allowedTypes - Tipos permitidos
   * @returns {boolean} Es válido
   */
  validateFileType(file, allowedTypes = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif']) {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    return allowedTypes.includes(fileExtension);
  }

  /**
   * Validar tamaño de archivo
   * @param {File} file - Archivo a validar
   * @param {number} maxSizeMB - Tamaño máximo en MB
   * @returns {boolean} Es válido
   */
  validateFileSize(file, maxSizeMB = 10) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  // Validar archivo (método legacy)
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

  /**
   * Formatear tamaño de archivo
   * @param {number} bytes - Tamaño en bytes
   * @returns {string} Tamaño formateado
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Obtener icono según tipo de archivo
   * @param {string} filename - Nombre del archivo
   * @returns {string} Nombre del icono
   */
  getFileIcon(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    
    const iconMap = {
      pdf: 'PictureAsPdf',
      doc: 'Description',
      docx: 'Description',
      xls: 'TableChart',
      xlsx: 'TableChart',
      jpg: 'Image',
      jpeg: 'Image',
      png: 'Image',
      gif: 'Image',
      txt: 'TextSnippet',
      zip: 'Archive',
      rar: 'Archive',
    };
    
    return iconMap[extension] || 'InsertDriveFile';
  }
}

const documentService = new DocumentService();
export default documentService;