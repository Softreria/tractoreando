import React from 'react';
import { Container, Typography, Box, Button, Grid } from '@mui/material';
import { LocalGasStation, Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import FuelSummary from '../components/FuelSummary';

const FuelSummaryPage = () => {
  const navigate = useNavigate();

  const handleFuelManagement = () => {
    navigate('/vehicles'); // Navegar a vehículos donde está la gestión de combustible
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Resumen de Combustible
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<LocalGasStation />}
          onClick={handleFuelManagement}
          sx={{ ml: 2 }}
        >
          Gestión de Combustible
        </Button>
      </Box>
      
      <FuelSummary />
    </Container>
  );
};

export default FuelSummaryPage;