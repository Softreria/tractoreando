import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

// Estado inicial
const initialState = {
  user: null,
  token: null, // Se configurará en el useEffect de inicialización
  isAuthenticated: false, // Solo true cuando el usuario esté completamente cargado
  isLoading: false, // Para operaciones específicas como login
  authLoading: true, // Para la carga inicial del usuario
  error: null,
};

// Tipos de acciones
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  LOAD_USER_START: 'LOAD_USER_START',
  LOAD_USER_SUCCESS: 'LOAD_USER_SUCCESS',
  LOAD_USER_FAILURE: 'LOAD_USER_FAILURE',
  UPDATE_USER: 'UPDATE_USER',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_AUTH_LOADING: 'SET_AUTH_LOADING',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case AUTH_ACTIONS.LOAD_USER_START:
      return {
        ...state,
        authLoading: true,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        authLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.LOAD_USER_SUCCESS:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        authLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      localStorage.removeItem('token');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        authLoading: false,
        error: action.payload,
      };

    case AUTH_ACTIONS.LOAD_USER_FAILURE:
      // Solo limpiar autenticación si no hay token o si es un error 401
      if (!state.token || action.payload?.status === 401) {
        localStorage.removeItem('token');
        return {
          ...state,
          user: null,
          token: null,
          isAuthenticated: false,
          authLoading: false,
          error: action.payload,
        };
      }
      // Si hay token pero falló por otro motivo, mantener el estado pero marcar como no cargando
      return {
        ...state,
        authLoading: false,
        error: action.payload,
      };

    case AUTH_ACTIONS.LOGOUT:
      localStorage.removeItem('token');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        authLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case AUTH_ACTIONS.SET_AUTH_LOADING:
      return {
        ...state,
        authLoading: action.payload,
      };

    default:
      return state;
  }
};

// Crear contexto
const AuthContext = createContext();

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Configurar axios interceptors
// Variable para controlar si el interceptor ya está configurado
let interceptorConfigured = false;

const setupAxiosInterceptors = (token, logout, authLoading) => {
  // Configurar interceptor solo una vez
  if (!interceptorConfigured) {
    // Interceptor de request para agregar token dinámicamente
    api.interceptors.request.use(
      (config) => {
        const currentToken = localStorage.getItem('token');
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
        } else {
          delete config.headers.Authorization;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Interceptor de response - DESHABILITADO para evitar duplicación con api.js
    // El manejo de errores 401 se hace en api.js
    // api.interceptors.response.use(
    //   (response) => response,
    //   (error) => {
    //     if (error.response?.status === 401) {
    //       console.log('Error 401 detectado en:', error.config?.url);
    //     }
    //     return Promise.reject(error);
    //   }
    // );
    interceptorConfigured = true;
  }
};

// Provider del contexto
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const hasInitialized = useRef(false);

  // Función para cargar usuario
  const loadUser = useCallback(async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOAD_USER_START });
      const response = await api.get('/auth/profile');
      dispatch({
        type: AUTH_ACTIONS.LOAD_USER_SUCCESS,
        payload: response.data.user,
      });
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.LOAD_USER_FAILURE,
        payload: {
          message: error.response?.data?.message || 'Error al cargar usuario',
          status: error.response?.status
        },
      });
    }
  }, []);

  // Función para cerrar sesión
  const logout = useCallback(async (showToast = true) => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      if (showToast) {
        toast.success('Sesión cerrada exitosamente');
      }
    }
  }, [dispatch]);

  // Configurar interceptors una sola vez al montar el componente
  useEffect(() => {
    setupAxiosInterceptors(state.token, logout, state.authLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sin dependencias para ejecutar solo una vez

  // Cargar usuario al inicializar (solo una vez)
  useEffect(() => {
    // Solo ejecutar una vez al montar el componente
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      const token = localStorage.getItem('token');
      if (token) {
        // Configurar el token en el estado
        dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { token, user: null } });
        
        // Cargar usuario directamente sin dependencia externa
        const loadUserDirectly = async () => {
          try {
            dispatch({ type: AUTH_ACTIONS.LOAD_USER_START });
            const response = await api.get('/auth/profile');
            dispatch({
              type: AUTH_ACTIONS.LOAD_USER_SUCCESS,
              payload: response.data.user,
            });
          } catch (error) {
            console.error('Error al cargar usuario:', error);
            // Si hay error 401, limpiar token inválido
            if (error.response?.status === 401) {
              localStorage.removeItem('token');
              dispatch({ type: AUTH_ACTIONS.LOGOUT });
            } else {
              dispatch({
                type: AUTH_ACTIONS.LOAD_USER_FAILURE,
                payload: {
                  message: error.response?.data?.message || 'Error al cargar usuario',
                  status: error.response?.status
                },
              });
            }
          }
        };
        
        loadUserDirectly();
      } else {
        dispatch({ type: AUTH_ACTIONS.LOAD_USER_FAILURE, payload: null });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sin dependencias para ejecutar solo una vez

  // Función para iniciar sesión
  const login = async (email, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });

      const response = await api.post('/auth/login', {
        email,
        password,
      });

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: response.data.user,
          token: response.data.token,
        },
      });

      toast.success(`¡Bienvenido, ${response.data.user.firstName}!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Error al iniciar sesión';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: message,
      });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Función de registro eliminada - Solo el super admin puede crear empresas



  // Función para actualizar perfil
  const updateProfile = async (userData) => {
    try {
      const response = await api.put('/auth/profile', userData);

      dispatch({
        type: AUTH_ACTIONS.UPDATE_USER,
        payload: response.data.user,
      });

      toast.success('Perfil actualizado exitosamente');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Error al actualizar perfil';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Función para cambiar contraseña
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      toast.success('Contraseña actualizada exitosamente');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Error al cambiar contraseña';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Función para solicitar restablecimiento de contraseña
  const forgotPassword = async (email) => {
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Se ha enviado un enlace de restablecimiento a tu email');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Error al solicitar restablecimiento';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Función para restablecer contraseña
  const resetPassword = async (token, newPassword) => {
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword,
      });
      toast.success('Contraseña restablecida exitosamente');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Error al restablecer contraseña';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Función para limpiar errores
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Función para verificar permisos
  const hasPermission = (module, action) => {
    if (!state.user) return false;
    
    // Super admin tiene todos los permisos
    if (state.user.role === 'super_admin') return true;
    
    // Verificar permisos específicos
    const userPermissions = state.user.permissions || {};
    const modulePermissions = userPermissions[module] || {};
    
    return modulePermissions[action] === true;
  };

  // Función para verificar rol
  const hasRole = (roles) => {
    if (!state.user) return false;
    
    if (Array.isArray(roles)) {
      return roles.includes(state.user.role);
    }
    
    return state.user.role === roles;
  };

  // Función para verificar si es admin
  const isAdmin = () => {
    return hasRole(['super_admin', 'company_admin']);
  };

  // Función para verificar acceso a delegación
  const hasAccessToBranch = (branchId) => {
    if (!state.user) return false;
    
    // Super admin y company admin tienen acceso a todas las delegaciones
    if (hasRole(['super_admin', 'company_admin'])) return true;
    
    // Verificar si el usuario tiene acceso a la delegación específica
    return state.user.branches?.some(branch => 
      (typeof branch === 'string' ? branch : branch._id) === branchId
    );
  };

  const value = {
    // Estado
    ...state,
    
    // Acciones
    login,
    logout,
    loadUser,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    clearError,
    
    // Utilidades
    hasPermission,
    hasRole,
    isAdmin,
    hasAccessToBranch,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;