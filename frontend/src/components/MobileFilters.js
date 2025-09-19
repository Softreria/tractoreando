import React, { useState } from 'react';
import {
  Box,
  Button,
  Drawer,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  IconButton,
  Divider,
  Stack,
  Chip
} from '@mui/material';
import {
  FilterList,
  Close,
  Clear
} from '@mui/icons-material';

const MobileFilters = ({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  filterBranch,
  setFilterBranch,
  filterType,
  setFilterType,
  branches = [],
  vehicleTypes = [],
  onClearFilters
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterBranch('');
    setFilterType('');
    if (onClearFilters) onClearFilters();
    setDrawerOpen(false);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (filterStatus !== 'all') count++;
    if (filterBranch) count++;
    if (filterType) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <>
      {/* Botón para abrir filtros */}
      <Button
        variant="outlined"
        startIcon={<FilterList />}
        onClick={() => setDrawerOpen(true)}
        sx={{ 
          position: 'relative',
          minWidth: 120
        }}
      >
        Filtros
        {activeFiltersCount > 0 && (
          <Chip
            label={activeFiltersCount}
            size="small"
            color="primary"
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              minWidth: 20,
              height: 20,
              fontSize: '0.75rem'
            }}
          />
        )}
      </Button>

      {/* Drawer de filtros */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '80vh'
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Filtros
            </Typography>
            <IconButton onClick={() => setDrawerOpen(false)}>
              <Close />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Filtros */}
          <Stack spacing={3}>
            {/* Búsqueda */}
            <TextField
              fullWidth
              label="Buscar vehículo"
              placeholder="Placa, marca, modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
            />

            {/* Estado */}
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="Estado"
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="active">Activo</MenuItem>
                <MenuItem value="maintenance">Mantenimiento</MenuItem>
                <MenuItem value="inactive">Inactivo</MenuItem>
              </Select>
            </FormControl>

            {/* Delegación */}
            <FormControl fullWidth>
              <InputLabel>Delegación</InputLabel>
              <Select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                label="Delegación"
              >
                <MenuItem value="">Todas</MenuItem>
                {branches.map((branch) => (
                  <MenuItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Tipo de vehículo */}
            <FormControl fullWidth>
              <InputLabel>Tipo de Vehículo</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="Tipo de Vehículo"
              >
                <MenuItem value="">Todos</MenuItem>
                {vehicleTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* Acciones */}
          <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
            <Button
              variant="outlined"
              startIcon={<Clear />}
              onClick={handleClearFilters}
              sx={{ flex: 1 }}
            >
              Limpiar
            </Button>
            <Button
              variant="contained"
              onClick={() => setDrawerOpen(false)}
              sx={{ flex: 1 }}
            >
              Aplicar
            </Button>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default MobileFilters;