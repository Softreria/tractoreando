import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Breadcrumbs,
  Link,
  Alert
} from '@mui/material';
import {
  ArrowBack,
  DirectionsCar,
  LocalGasStation
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import FuelManagement from '../components/FuelManagement';

const VehicleFuel = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, authLoading } = useAuth();

  // Consulta del vehículo
  const { data: vehicle, isLoading, error } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: async () => {
      const response = await api.get(`/vehicles/${vehicleId}`);
      return response.data;
    },
    enabled: isAuthenticated && !!user && !authLoading && !!vehicleId
  });

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Cargando...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error al cargar el vehículo: {error.message}
        </Alert>
      </Box>
    );
  }

  if (!vehicle) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Vehículo no encontrado
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header con navegación */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton
            onClick={() => navigate('/vehicles')}
            sx={{ mr: 1 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            Gestión de Combustible
          </Typography>
        </Box>

        {/* Breadcrumbs */}
        <Breadcrumbs>
          <Link
            color="inherit"
            href="#"
            onClick={() => navigate('/vehicles')}
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <DirectionsCar sx={{ mr: 0.5 }} fontSize="inherit" />
            Vehículos
          </Link>
          <Typography
            color="text.primary"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <LocalGasStation sx={{ mr: 0.5 }} fontSize="inherit" />
            Combustible - {vehicle.plateNumber}
          </Typography>
        </Breadcrumbs>
      </Box>

      {/* Información del vehículo */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DirectionsCar sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h5" gutterBottom>
                {vehicle.make} {vehicle.model}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Matrícula: <strong>{vehicle.plateNumber}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tipo: {vehicle.type} | Combustible: {vehicle.engine?.type || 'No especificado'}
                {vehicle.fuelCapacity && ` | Capacidad: ${vehicle.fuelCapacity}L`}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Componente de gestión de combustible */}
      <FuelManagement vehicleId={vehicleId} vehicle={vehicle} />
    </Box>
  );
};

export default VehicleFuel;