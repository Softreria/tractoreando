import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

const PublicRoute = ({ children, redirectTo = '/dashboard' }) => {
  const { user, loading } = useAuth();
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
          Cargando...
        </Typography>
      </Box>
    );
  }

  // Si está autenticado, redirigir a la página especificada o dashboard
  if (user) {
    // Si hay un estado 'from' en la ubicación, redirigir ahí
    const from = location.state?.from?.pathname || redirectTo;
    return <Navigate to={from} replace />;
  }

  // Si no está autenticado, mostrar la página pública
  return children;
};

export default PublicRoute;