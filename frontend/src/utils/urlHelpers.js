/**
 * Utilidades para manejo de URLs y recursos
 * Funciones auxiliares para construcción y validación de URLs
 */

import { URL_BUILDER, ENV_CONFIG, log } from '../config/environment';

/**
 * Construye URLs para avatares de usuario
 * @param {string} userId - ID del usuario
 * @param {string} avatarFilename - Nombre del archivo de avatar
 * @returns {string|null} URL del avatar o null si no existe
 */
export const buildAvatarUrl = (userId, avatarFilename) => {
  if (!avatarFilename) {
    // Retornar avatar por defecto
    return URL_BUILDER.image('default-avatar.png');
  }
  
  // Si el filename ya incluye la ruta completa, usarlo directamente
  if (avatarFilename.startsWith('http')) {
    return avatarFilename;
  }
  
  // Construir URL del avatar
  return URL_BUILDER.image(`avatars/${userId}/${avatarFilename}`);
};

/**
 * Construye URLs para fotos de vehículos
 * @param {string} vehicleId - ID del vehículo
 * @param {string} photoFilename - Nombre del archivo de foto
 * @returns {string|null} URL de la foto
 */
export const buildVehiclePhotoUrl = (vehicleId, photoFilename) => {
  if (!photoFilename) return null;
  
  if (photoFilename.startsWith('http')) {
    return photoFilename;
  }
  
  return URL_BUILDER.image(`vehicles/${vehicleId}/${photoFilename}`);
};

/**
 * Construye URLs para documentos de vehículos
 * @param {string} vehicleId - ID del vehículo
 * @param {string} documentFilename - Nombre del archivo de documento
 * @returns {string|null} URL del documento
 */
export const buildVehicleDocumentUrl = (vehicleId, documentFilename) => {
  if (!documentFilename) return null;
  
  if (documentFilename.startsWith('http')) {
    return documentFilename;
  }
  
  return URL_BUILDER.document(`vehicles/${vehicleId}/${documentFilename}`);
};

/**
 * Construye URLs para archivos de mantenimiento
 * @param {string} maintenanceId - ID del mantenimiento
 * @param {string} filename - Nombre del archivo
 * @returns {string|null} URL del archivo
 */
export const buildMaintenanceFileUrl = (maintenanceId, filename) => {
  if (!filename) return null;
  
  if (filename.startsWith('http')) {
    return filename;
  }
  
  return URL_BUILDER.file(`maintenance/${maintenanceId}/${filename}`);
};

/**
 * Construye URLs para logos de empresas
 * @param {string} companyId - ID de la empresa
 * @param {string} logoFilename - Nombre del archivo de logo
 * @returns {string|null} URL del logo
 */
export const buildCompanyLogoUrl = (companyId, logoFilename) => {
  if (!logoFilename) {
    return URL_BUILDER.image('default-company-logo.png');
  }
  
  if (logoFilename.startsWith('http')) {
    return logoFilename;
  }
  
  return URL_BUILDER.image(`companies/${companyId}/${logoFilename}`);
};

/**
 * Valida si una URL es válida
 * @param {string} url - URL a validar
 * @returns {boolean} true si es válida
 */
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Construye URLs para descargas de archivos
 * @param {string} fileId - ID del archivo
 * @param {string} filename - Nombre del archivo (opcional, para el nombre de descarga)
 * @returns {string} URL de descarga
 */
export const buildDownloadUrl = (fileId, filename = null) => {
  const baseUrl = URL_BUILDER.api(`/files/${fileId}/download`);
  return filename ? `${baseUrl}?filename=${encodeURIComponent(filename)}` : baseUrl;
};

/**
 * Construye URLs para reportes exportados
 * @param {string} reportType - Tipo de reporte (vehicles, maintenance, etc.)
 * @param {Object} params - Parámetros del reporte
 * @returns {string} URL de exportación
 */
export const buildReportExportUrl = (reportType, params = {}) => {
  const queryParams = new URLSearchParams(params);
  const baseUrl = URL_BUILDER.api(`/reports/export/${reportType}`);
  return queryParams.toString() ? `${baseUrl}?${queryParams}` : baseUrl;
};

/**
 * Construye URLs para compartir recursos
 * @param {string} resourceType - Tipo de recurso (vehicle, maintenance, etc.)
 * @param {string} resourceId - ID del recurso
 * @returns {string} URL para compartir
 */
export const buildShareUrl = (resourceType, resourceId) => {
  return URL_BUILDER.frontend(`/shared/${resourceType}/${resourceId}`);
};

/**
 * Obtiene la extensión de un archivo desde su URL o nombre
 * @param {string} filename - Nombre del archivo o URL
 * @returns {string} Extensión del archivo
 */
export const getFileExtension = (filename) => {
  if (!filename) return '';
  
  // Si es una URL, extraer solo el nombre del archivo
  const name = filename.split('/').pop().split('?')[0];
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

/**
 * Determina si un archivo es una imagen basado en su extensión
 * @param {string} filename - Nombre del archivo
 * @returns {boolean} true si es una imagen
 */
export const isImageFile = (filename) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const extension = getFileExtension(filename);
  return imageExtensions.includes(extension);
};

/**
 * Determina si un archivo es un documento basado en su extensión
 * @param {string} filename - Nombre del archivo
 * @returns {boolean} true si es un documento
 */
export const isDocumentFile = (filename) => {
  const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'rtf'];
  const extension = getFileExtension(filename);
  return documentExtensions.includes(extension);
};

/**
 * Construye una URL con parámetros de consulta
 * @param {string} baseUrl - URL base
 * @param {Object} params - Parámetros a agregar
 * @returns {string} URL con parámetros
 */
export const buildUrlWithParams = (baseUrl, params = {}) => {
  const url = new URL(baseUrl);
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      url.searchParams.set(key, params[key]);
    }
  });
  return url.toString();
};

/**
 * Limpia una URL removiendo parámetros innecesarios
 * @param {string} url - URL a limpiar
 * @param {Array} keepParams - Parámetros a mantener
 * @returns {string} URL limpia
 */
export const cleanUrl = (url, keepParams = []) => {
  try {
    const urlObj = new URL(url);
    const newParams = new URLSearchParams();
    
    keepParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        newParams.set(param, urlObj.searchParams.get(param));
      }
    });
    
    urlObj.search = newParams.toString();
    return urlObj.toString();
  } catch (error) {
    log.error('Error cleaning URL:', error);
    return url;
  }
};

/**
 * Construye URLs para thumbnails/miniaturas
 * @param {string} originalUrl - URL de la imagen original
 * @param {string} size - Tamaño del thumbnail (small, medium, large)
 * @returns {string} URL del thumbnail
 */
export const buildThumbnailUrl = (originalUrl, size = 'medium') => {
  if (!originalUrl || originalUrl.startsWith('http')) {
    return originalUrl;
  }
  
  const extension = getFileExtension(originalUrl);
  const nameWithoutExt = originalUrl.replace(`.${extension}`, '');
  
  return URL_BUILDER.image(`${nameWithoutExt}_${size}.${extension}`);
};

// Exportar todas las funciones como un objeto para facilitar el uso
export const urlHelpers = {
  buildAvatarUrl,
  buildVehiclePhotoUrl,
  buildVehicleDocumentUrl,
  buildMaintenanceFileUrl,
  buildCompanyLogoUrl,
  buildDownloadUrl,
  buildReportExportUrl,
  buildShareUrl,
  buildThumbnailUrl,
  buildUrlWithParams,
  cleanUrl,
  isValidUrl,
  getFileExtension,
  isImageFile,
  isDocumentFile,
};

export default urlHelpers;