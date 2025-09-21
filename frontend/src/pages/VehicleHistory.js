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
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Avatar,
  Divider,
  Paper,
  Alert,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  History,
  Build,
  LocalGasStation,
  PictureAsPdf,
  FilterList,
  DateRange,
  DirectionsCar,
  AttachMoney,
  Timeline,
  Assessment,
  Print,
  Download,
  Visibility,
  CalendarToday
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../utils/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const VehicleHistory = () => {
  const { vehicleId } = useParams();
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filterType, setFilterType] = useState('all');

  // Consulta de información del vehículo
  const { data: vehicleData, isLoading: vehicleLoading } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: async () => {
      const response = await api.get(`/vehicles/${vehicleId}`);
      return response.data;
    },
    enabled: !!vehicleId
  });

  // Consulta de historial de mantenimientos
  const { data: maintenanceHistory, isLoading: maintenanceLoading } = useQuery({
    queryKey: ['vehicle-maintenance-history', vehicleId, page, rowsPerPage, dateRange],
    queryFn: async () => {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end })
      };
      const response = await api.get(`/vehicles/${vehicleId}/maintenance`, { params });
      return response.data;
    },
    enabled: !!vehicleId
  });

  // Consulta de historial de combustible
  const { data: fuelHistory, isLoading: fuelLoading } = useQuery({
    queryKey: ['vehicle-fuel-history', vehicleId, page, rowsPerPage, dateRange],
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

  // Consulta de estadísticas generales
  const { data: statsData } = useQuery({
    queryKey: ['vehicle-stats', vehicleId, dateRange],
    queryFn: async () => {
      const params = {
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end })
      };
      const response = await api.get(`/vehicles/${vehicleId}/stats`, { params });
      return response.data;
    },
    enabled: !!vehicleId
  });

  const formatDate = (date) => {
    return format(new Date(date), 'dd/MM/yyyy', { locale: es });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    const colors = {
      'programado': 'warning',
      'en_proceso': 'info',
      'completado': 'success',
      'cancelado': 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'programado': 'Programado',
      'en_proceso': 'En Proceso',
      'completado': 'Completado',
      'cancelado': 'Cancelado'
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'baja': 'success',
      'media': 'warning',
      'alta': 'error',
      'critica': 'error'
    };
    return colors[priority] || 'default';
  };

  const exportToPDF = () => {
    if (!vehicleData) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('HISTORIAL DEL VEHÍCULO', 105, 20, { align: 'center' });
    
    // Información del vehículo
    doc.setFontSize(14);
    doc.text('INFORMACIÓN DEL VEHÍCULO', 20, 40);
    
    doc.setFontSize(10);
    doc.text(`Matrícula: ${vehicleData.plateNumber}`, 20, 50);
    doc.text(`Marca/Modelo: ${vehicleData.make} ${vehicleData.model}`, 120, 50);
    doc.text(`Año: ${vehicleData.year}`, 20, 58);
    doc.text(`Tipo: ${vehicleData.vehicleType}`, 120, 58);
    
    let yPosition = 75;

    // Estadísticas generales
    if (statsData) {
      doc.setFontSize(14);
      doc.text('ESTADÍSTICAS GENERALES', 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.text(`Total mantenimientos: ${statsData.maintenanceCount || 0}`, 20, yPosition);
      doc.text(`Gasto total combustible: ${formatCurrency(statsData.totalFuelCost)}`, 120, yPosition);
      yPosition += 8;
      
      doc.text(`Gasto total mantenimiento: ${formatCurrency(statsData.totalMaintenanceCost)}`, 20, yPosition);
      doc.text(`Consumo promedio: ${statsData.averageConsumption?.toFixed(1) || 0} L/100km`, 120, yPosition);
      yPosition += 20;
    }

    // Historial de mantenimientos
    if (maintenanceHistory?.maintenances?.length > 0) {
      doc.setFontSize(14);
      doc.text('HISTORIAL DE MANTENIMIENTOS', 20, yPosition);
      yPosition += 10;

      const maintenanceData = maintenanceHistory.maintenances.map(maintenance => [
        formatDate(maintenance.scheduledDate),
        maintenance.type,
        getStatusLabel(maintenance.status),
        maintenance.assignedTo ? `${maintenance.assignedTo.firstName} ${maintenance.assignedTo.lastName}` : 'N/A',
        formatCurrency(maintenance.costs?.total || 0)
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['Fecha', 'Tipo', 'Estado', 'Mecánico', 'Coste']],
        body: maintenanceData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });

      yPosition = doc.lastAutoTable.finalY + 20;
    }

    // Historial de combustible
    if (fuelHistory?.fuelRecords?.length > 0) {
      // Verificar si necesitamos una nueva página
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.text('HISTORIAL DE COMBUSTIBLE', 20, yPosition);
      yPosition += 10;

      const fuelData = fuelHistory.fuelRecords.map(record => [
        formatDate(record.fuelDate),
        `${record.liters} L`,
        record.fuelType,
        formatCurrency(record.pricePerLiter),
        formatCurrency(record.totalCost),
        record.station || 'N/A'
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['Fecha', 'Litros', 'Tipo', 'Precio/L', 'Total', 'Estación']],
        body: fuelData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [76, 175, 80] }
      });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, 20, pageHeight - 20);
    
    // Guardar PDF
    doc.save(`historial-vehiculo-${vehicleData.plateNumber}.pdf`);
  };

  if (vehicleLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  if (!vehicleData) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        No se pudo cargar la información del vehículo
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header con información del vehículo */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 56, height: 56 }}>
                <DirectionsCar />
              </Avatar>
              <Box>
                <Typography variant="h4" gutterBottom>
                  {vehicleData.plateNumber}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  {vehicleData.make} {vehicleData.model} ({vehicleData.year})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tipo: {vehicleData.vehicleType} | Sucursal: {vehicleData.branch?.name || 'N/A'}
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<PictureAsPdf />}
              onClick={exportToPDF}
              color="error"
            >
              Exportar PDF
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
              <FormControl fullWidth>
                <InputLabel>Filtrar por</InputLabel>
                <Select
                  value={filterType}
                  label="Filtrar por"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="all">Todo</MenuItem>
                  <MenuItem value="maintenance">Solo Mantenimientos</MenuItem>
                  <MenuItem value="fuel">Solo Combustible</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Estadísticas rápidas */}
          {statsData && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Build color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">{statsData.maintenanceCount || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Mantenimientos
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <LocalGasStation color="success" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">{statsData.fuelRecordCount || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Repostajes
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <AttachMoney color="warning" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">{formatCurrency(statsData.totalCost)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Gasto Total
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Timeline color="info" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">
                      {statsData.averageConsumption?.toFixed(1) || 0} L/100km
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Consumo Promedio
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Tabs para diferentes tipos de historial */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab 
              label="Mantenimientos" 
              icon={<Build />} 
              iconPosition="start"
              disabled={filterType === 'fuel'}
            />
            <Tab 
              label="Combustible" 
              icon={<LocalGasStation />} 
              iconPosition="start"
              disabled={filterType === 'maintenance'}
            />
            <Tab 
              label="Cronología" 
              icon={<Timeline />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <CardContent>
          {/* Tab 0: Historial de Mantenimientos */}
          {tabValue === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Historial de Mantenimientos
              </Typography>
              
              {maintenanceLoading ? (
                <LinearProgress />
              ) : maintenanceHistory?.maintenances?.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell>Mecánico</TableCell>
                        <TableCell>Descripción</TableCell>
                        <TableCell>Coste</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {maintenanceHistory.maintenances.map((maintenance) => (
                        <TableRow key={maintenance.id} hover>
                          <TableCell>{formatDate(maintenance.scheduledDate)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={maintenance.type} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={getStatusLabel(maintenance.status)}
                              color={getStatusColor(maintenance.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {maintenance.assignedTo 
                              ? `${maintenance.assignedTo.firstName} ${maintenance.assignedTo.lastName}`
                              : 'No asignado'
                            }
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {maintenance.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {formatCurrency(maintenance.costs?.total || 0)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={maintenanceHistory.pagination?.total || 0}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value))}
                    labelRowsPerPage="Filas por página:"
                  />
                </TableContainer>
              ) : (
                <Alert severity="info">
                  No hay registros de mantenimiento para este vehículo en el período seleccionado
                </Alert>
              )}
            </Box>
          )}

          {/* Tab 1: Historial de Combustible */}
          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Historial de Combustible
              </Typography>
              
              {fuelLoading ? (
                <LinearProgress />
              ) : fuelHistory?.fuelRecords?.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Litros</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Precio/Litro</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Estación</TableCell>
                        <TableCell>Odómetro</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fuelHistory.fuelRecords.map((record) => (
                        <TableRow key={record.id} hover>
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
                              label={record.fuelType} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{formatCurrency(record.pricePerLiter)}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {formatCurrency(record.totalCost)}
                            </Typography>
                          </TableCell>
                          <TableCell>{record.station || 'N/A'}</TableCell>
                          <TableCell>
                            {record.odometer ? `${record.odometer} km` : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={fuelHistory.pagination?.total || 0}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value))}
                    labelRowsPerPage="Filas por página:"
                  />
                </TableContainer>
              ) : (
                <Alert severity="info">
                  No hay registros de combustible para este vehículo en el período seleccionado
                </Alert>
              )}
            </Box>
          )}

          {/* Tab 2: Cronología */}
          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Cronología de Eventos
              </Typography>
              <Alert severity="info" sx={{ mt: 2 }}>
                Vista cronológica combinada de mantenimientos y combustible (próximamente)
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default VehicleHistory;