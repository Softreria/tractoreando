import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

const ProtectedRoute = ({ children, requiredRole, requiredPermission }) => {
  const { user, loading, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 2
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Verificando autenticación...
        </Typography>
      </Box>
    );
  }

  // Si no está autenticado, redirigir al login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar rol requerido
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 2,
          p: 3,
          textAlign: 'center'
        }}
      >
        <Typography variant="h4" color="error">
          Acceso Denegado
        </Typography>
        <Typography variant="body1" color="text.secondary">
          No tienes permisos para acceder a esta página.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Rol requerido: {requiredRole}
        </Typography>
      </Box>
    );
  }

  // Verificar permiso requerido
  if (requiredPermission) {
    const [module, action] = requiredPermission.split('.');
    if (!hasPermission(module, action)) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            gap: 2,
            p: 3,
            textAlign: 'center'
          }}
        >
          <Typography variant="h4" color="error">
            Acceso Denegado
          </Typography>
          <Typography variant="body1" color="text.secondary">
            No tienes permisos para acceder a esta página.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Permiso requerido: {requiredPermission}
          </Typography>
        </Box>
      );
    }
  }

  // Si todo está bien, mostrar el componente
  return children;
};

export default ProtectedRoute;