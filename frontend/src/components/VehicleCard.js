import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  LinearProgress,
  Badge,
  Divider,
  Stack
} from '@mui/material';
import {
  DirectionsCar,
  LocationOn,
  Speed,
  Warning,
  CheckCircle,
  Error,
  Schedule,
  MoreVert
} from '@mui/icons-material';

const VehicleCard = ({ 
  vehicle, 
  onMenuClick, 
  vehicleTypes = [],
  alertCount = 0,
  serviceProgress = 0 
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'maintenance': return 'warning';
      case 'inactive': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle />;
      case 'maintenance': return <Schedule />;
      case 'inactive': return <Error />;
      default: return <DirectionsCar />;
    }
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'excellent': return 'success';
      case 'good': return 'info';
      case 'fair': return 'warning';
      case 'poor': return 'error';
      default: return 'default';
    }
  };

  const getConditionLabel = (condition) => {
    const labels = {
      excellent: 'Excelente',
      good: 'Bueno',
      fair: 'Regular',
      poor: 'Malo'
    };
    return labels[condition] || condition;
  };

  return (
    <Card 
      sx={{ 
        mb: 2, 
        position: 'relative',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out'
        }
      }}
    >
      <CardContent sx={{ pb: 2 }}>
        {/* Header con avatar y acciones */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Avatar 
            sx={{ 
              mr: 2, 
              bgcolor: 'primary.main',
              width: 48,
              height: 48
            }}
          >
            <DirectionsCar />
          </Avatar>
          
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              {vehicle.plateNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {vehicle.make} {vehicle.model} ({vehicle.year})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {vehicleTypes.find(t => t.value === vehicle.vehicleType)?.label}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {alertCount > 0 && (
              <Badge badgeContent={alertCount} color="error">
                <Warning color="warning" />
              </Badge>
            )}
            <IconButton 
              size="small" 
              onClick={(e) => onMenuClick(e, vehicle)}
              sx={{ ml: 1 }}
            >
              <MoreVert />
            </IconButton>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Información principal */}
        <Stack spacing={2}>
          {/* Delegación */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LocationOn sx={{ fontSize: 20, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2">
              <strong>Delegación:</strong> {vehicle.branch?.name || 'No asignada'}
            </Typography>
          </Box>

          {/* Kilometraje */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Speed sx={{ fontSize: 20, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">
                <strong>Kilometraje:</strong> {vehicle.odometer?.current?.toLocaleString() || 0} km
              </Typography>
            </Box>
            {serviceProgress > 0 && (
              <Box sx={{ ml: 3 }}>
                <LinearProgress
                  variant="determinate"
                  value={serviceProgress}
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    backgroundColor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      backgroundColor: serviceProgress > 80 ? 'error.main' : 'primary.main'
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Próximo servicio: {Math.round(serviceProgress)}%
                </Typography>
              </Box>
            )}
          </Box>

          {/* Estado y Condición */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              icon={getStatusIcon(vehicle.status)}
              label={vehicle.status === 'active' ? 'Activo' : 
                     vehicle.status === 'maintenance' ? 'Mantenimiento' : 'Inactivo'}
              color={getStatusColor(vehicle.status)}
              size="small"
              variant="outlined"
            />
            {vehicle.condition && (
              <Chip
                label={getConditionLabel(vehicle.condition)}
                color={getConditionColor(vehicle.condition)}
                size="small"
                variant="filled"
              />
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default VehicleCard;