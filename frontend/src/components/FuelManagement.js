import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Alert,
  Divider,
  Paper,
  Tabs,
  Tab,
  LinearProgress,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  LocalGasStation,
  TrendingUp,
  CalendarToday,
  Speed,
  AttachMoney,
  Timeline,
  Assessment,
  LocationOn,
  Receipt,
  Save,
  Cancel
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../utils/api';
import toast from 'react-hot-toast';

const FuelManagement = ({ vehicleId, vehicle }) => {
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [manualTotalCost, setManualTotalCost] = useState(false);

  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm();

  // Observar cambios en litros y precio por litro para calcular automáticamente
  const watchedLiters = watch('liters');
  const watchedPricePerLiter = watch('pricePerLiter');
  const watchedTotalCost = watch('totalCost');

  // Efecto para calcular automáticamente el costo total
  React.useEffect(() => {
    if (!manualTotalCost && watchedLiters && watchedPricePerLiter) {
      const calculatedTotal = (parseFloat(watchedLiters) * parseFloat(watchedPricePerLiter)).toFixed(2);
      setValue('totalCost', calculatedTotal);
    }
  }, [watchedLiters, watchedPricePerLiter, manualTotalCost, setValue]);

  // Tipos de combustible
  const fuelTypes = [
    { value: 'diesel', label: 'Diésel' },
    { value: 'gasolina_95', label: 'Gasolina 95' },
    { value: 'gasolina_98', label: 'Gasolina 98' },
    { value: 'gas_natural', label: 'Gas Natural' },
    { value: 'electrico', label: 'Eléctrico' },
    { value: 'hibrido', label: 'Híbrido' },
    { value: 'otro', label: 'Otro' }
  ];

  // Consulta de registros de combustible
  const { data: fuelData, isLoading } = useQuery({
    queryKey: ['fuel-records', vehicleId, page, rowsPerPage, dateRange],
    queryFn: async () => {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end })
      };
      const response = await api.get(`/vehicles/${vehicleId}/fuel`, { params });
      return response.data;
    },
    enabled: !!vehicleId
  });

  // Consulta de estadísticas
  const { data: statsData } = useQuery({
    queryKey: ['fuel-stats', vehicleId, dateRange],
    queryFn: async () => {
      const params = {
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end })
      };
      const response = await api.get(`/vehicles/${vehicleId}/fuel/stats`, { params });
      return response.data;
    },
    enabled: !!vehicleId
  });

  // Mutación para crear/actualizar registro
  const saveFuelRecord = useMutation({
    mutationFn: async (data) => {
      if (editingRecord) {
        return api.put(`/vehicles/${vehicleId}/fuel/${editingRecord.id}`, data);
      } else {
        return api.post(`/vehicles/${vehicleId}/fuel`, data);
      }
    },
    onSuccess: () => {
      toast.success(editingRecord ? 'Registro actualizado' : 'Registro creado');
      queryClient.invalidateQueries(['fuel-records', vehicleId]);
      queryClient.invalidateQueries(['fuel-stats', vehicleId]);
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al guardar registro');
    }
  });

  // Mutación para eliminar registro
  const deleteFuelRecord = useMutation({
    mutationFn: async (recordId) => {
      return api.delete(`/vehicles/${vehicleId}/fuel/${recordId}`);
    },
    onSuccess: () => {
      toast.success('Registro eliminado');
      queryClient.invalidateQueries(['fuel-records', vehicleId]);
      queryClient.invalidateQueries(['fuel-stats', vehicleId]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar registro');
    }
  });

  const handleOpenDialog = (record = null) => {
    setEditingRecord(record);
    setManualTotalCost(false); // Resetear el estado de modificación manual
    if (record) {
      reset({
        fuelDate: format(new Date(record.fuelDate), 'yyyy-MM-dd'),
        liters: record.liters,
        odometer: record.odometer,
        pricePerLiter: record.pricePerLiter,
        totalCost: record.totalCost,
        fuelType: record.fuelType,
        station: record.station,
        location: record.location,
        isFull: record.isFull,
        notes: record.notes
      });
      // Si hay un costo total diferente al calculado, marcar como manual
      if (record.totalCost && record.liters && record.pricePerLiter) {
        const calculatedTotal = parseFloat((record.liters * record.pricePerLiter).toFixed(2));
        const actualTotal = parseFloat(record.totalCost);
        if (Math.abs(calculatedTotal - actualTotal) > 0.01) {
          setManualTotalCost(true);
        }
      }
    } else {
      reset({
        fuelDate: format(new Date(), 'yyyy-MM-dd'),
        fuelType: 'diesel',
        isFull: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRecord(null);
    setManualTotalCost(false);
    reset();
  };

  const onSubmit = (data) => {
    // Calcular costo total si no se proporciona
    if (data.liters && data.pricePerLiter && !data.totalCost) {
      data.totalCost = (parseFloat(data.liters) * parseFloat(data.pricePerLiter)).toFixed(2);
    }
    saveFuelRecord.mutate(data);
  };

  const handleDelete = (recordId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este registro?')) {
      deleteFuelRecord.mutate(recordId);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return format(new Date(date), 'dd/MM/yyyy', { locale: es });
  };

  const getFuelTypeLabel = (type) => {
    const fuelType = fuelTypes.find(f => f.value === type);
    return fuelType ? fuelType.label : type;
  };

  return (
    <Box>
      {/* Header con información del vehículo */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                <LocalGasStation sx={{ mr: 1, verticalAlign: 'middle' }} />
                Gestión de Combustible
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {vehicle?.make} {vehicle?.model} - {vehicle?.plateNumber}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Nuevo Registro
            </Button>
          </Box>

          {/* Filtros de fecha */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Fecha Inicio"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Fecha Fin"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setDateRange({ start: '', end: '' })}
                sx={{ height: '56px' }}
              >
                Limpiar Filtros
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Registros" icon={<Receipt />} />
          <Tab label="Estadísticas" icon={<Assessment />} />
        </Tabs>
      </Paper>

      {/* Tab 0: Registros */}
      {tabValue === 0 && (
        <Card>
          <CardContent>
            {isLoading ? (
              <LinearProgress />
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Litros</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Precio/L</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Odómetro</TableCell>
                        <TableCell>Estación</TableCell>
                        <TableCell>Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fuelData?.fuelRecords?.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{formatDate(record.fuelDate)}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <LocalGasStation sx={{ mr: 1, fontSize: 16 }} />
                              {record.liters} L
                              {!record.isFull && (
                                <Chip size="small" label="Parcial" sx={{ ml: 1 }} />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={getFuelTypeLabel(record.fuelType)}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{formatCurrency(record.pricePerLiter)}</TableCell>
                          <TableCell>{formatCurrency(record.totalCost)}</TableCell>
                          <TableCell>
                            {record.odometer ? (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Speed sx={{ mr: 1, fontSize: 16 }} />
                                {record.odometer.toLocaleString()} km
                              </Box>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {record.station && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <LocationOn sx={{ mr: 1, fontSize: 16 }} />
                                {record.station}
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(record)}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(record.id)}
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={fuelData?.pagination?.totalRecords || 0}
                  page={page}
                  onPageChange={(e, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[5, 10, 25]}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 1: Estadísticas */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          {/* Estadísticas generales */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <LocalGasStation sx={{ mr: 1 }} />
                  Total Litros
                </Typography>
                <Typography variant="h4" color="primary">
                  {statsData?.stats?.totalLiters || 0} L
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <AttachMoney sx={{ mr: 1 }} />
                  Gasto Total
                </Typography>
                <Typography variant="h4" color="secondary">
                  {formatCurrency(statsData?.stats?.totalCost)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <TrendingUp sx={{ mr: 1 }} />
                  Precio Promedio
                </Typography>
                <Typography variant="h4">
                  {formatCurrency(statsData?.stats?.averagePrice)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Timeline sx={{ mr: 1 }} />
                  Consumo Promedio
                </Typography>
                <Typography variant="h4">
                  {statsData?.stats?.averageConsumption?.toFixed(1) || 0} L/100km
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Información adicional */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Información del Período
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Registros: {statsData?.stats?.recordCount || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Período: {statsData?.period?.days || 30} días
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Última carga: {statsData?.stats?.lastFuelDate ? formatDate(statsData.stats.lastFuelDate) : 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Dialog para crear/editar registro */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingRecord ? 'Editar Registro' : 'Nuevo Registro de Combustible'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Fecha de Repostaje"
                  type="date"
                  {...register('fuelDate', { required: 'La fecha es requerida' })}
                  error={!!errors.fuelDate}
                  helperText={errors.fuelDate?.message}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Litros"
                  type="number"
                  step="0.01"
                  {...register('liters', {
                    required: 'Los litros son requeridos',
                    min: { value: 0.1, message: 'Mínimo 0.1 litros' }
                  })}
                  error={!!errors.liters}
                  helperText={errors.liters?.message}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">L</InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="fuelType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Tipo de Combustible</InputLabel>
                      <Select {...field} label="Tipo de Combustible">
                        {fuelTypes.map((type) => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Odómetro"
                  type="number"
                  {...register('odometer', { min: 0 })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">km</InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Precio por Litro"
                  type="number"
                  step="0.001"
                  {...register('pricePerLiter', { min: 0 })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">€</InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Costo Total"
                  type="number"
                  step="0.01"
                  {...register('totalCost', { min: 0 })}
                  onChange={(e) => {
                    // Marcar como modificación manual cuando el usuario cambia el valor
                    setManualTotalCost(true);
                    // Llamar al onChange original del register
                    const { onChange } = register('totalCost', { min: 0 });
                    onChange(e);
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Tooltip title={manualTotalCost ? "Cambiar a cálculo automático" : "Permitir edición manual"}>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setManualTotalCost(!manualTotalCost);
                                if (manualTotalCost && watchedLiters && watchedPricePerLiter) {
                                  // Si volvemos a automático, recalcular
                                  const calculatedTotal = (parseFloat(watchedLiters) * parseFloat(watchedPricePerLiter)).toFixed(2);
                                  setValue('totalCost', calculatedTotal);
                                }
                              }}
                              color={manualTotalCost ? "primary" : "default"}
                            >
                              {manualTotalCost ? <Edit /> : <Assessment />}
                            </IconButton>
                          </Tooltip>
                          €
                        </Box>
                      </InputAdornment>
                    )
                  }}
                  helperText={
                    manualTotalCost 
                      ? "Modo manual: puedes editar el precio (ej. descuentos)" 
                      : "Modo automático: se calcula litros × precio por litro"
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Estación de Servicio"
                  {...register('station')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Ubicación"
                  {...register('location')}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="isFull"
                  control={control}
                  render={({ field }) => (
                    <FormControl component="fieldset">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          {...field}
                          checked={field.value}
                          style={{ marginRight: 8 }}
                        />
                        <Typography>Tanque lleno</Typography>
                      </Box>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notas"
                  multiline
                  rows={3}
                  {...register('notes')}
                  placeholder="Observaciones adicionales..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} startIcon={<Cancel />}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
              disabled={saveFuelRecord.isLoading}
            >
              {editingRecord ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default FuelManagement;