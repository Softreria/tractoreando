import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  LocalGasStation,
  DirectionsCar,
  Euro,
  Assessment,
  ExpandMore,
  Business
} from '@mui/icons-material';
import { vehicleService } from '../services/vehicleService';

const FuelSummary = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let year = currentYear - 5; year <= currentYear + 1; year++) {
    years.push(year);
  }

  const fetchSummaryData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vehicleService.getFuelCompanySummary(selectedYear, selectedMonth);
      setSummaryData(data);
    } catch (err) {
      console.error('Error fetching fuel summary:', err);
      setError('Error al cargar el resumen de combustible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();
  }, [selectedYear, selectedMonth]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatNumber = (number, decimals = 2) => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number || 0);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Assessment color="primary" />
        Resumen de Combustible por Empresa
      </Typography>

      {/* Filtros */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Año</InputLabel>
          <Select
            value={selectedYear}
            label="Año"
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {years.map(year => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Mes</InputLabel>
          <Select
            value={selectedMonth}
            label="Mes"
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {months.map(month => (
              <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="h6" sx={{ ml: 2 }}>
          {summaryData?.period?.monthName} {summaryData?.period?.year}
        </Typography>
      </Box>

      {summaryData && (
        <>
          {/* Resumen General */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <DirectionsCar color="primary" />
                    <Typography variant="h6">{summaryData.summary.totalVehicles}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Vehículos Totales
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summaryData.summary.vehiclesWithRecords} con registros
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LocalGasStation color="primary" />
                    <Typography variant="h6">{formatNumber(summaryData.summary.totalLiters)} L</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Litros Totales
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summaryData.summary.totalRecords} registros
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Euro color="primary" />
                    <Typography variant="h6">{formatCurrency(summaryData.summary.totalCost)}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Costo Total
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summaryData.summary.averagePricePerLiter ? 
                      `${formatCurrency(summaryData.summary.averagePricePerLiter)}/L promedio` : 
                      'Sin datos de precio'
                    }
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Assessment color="primary" />
                    <Typography variant="h6">
                      {summaryData.summary.totalRecords > 0 ? 
                        formatNumber(summaryData.summary.totalLiters / summaryData.summary.totalRecords) : '0'
                      } L
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Promedio por Registro
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Resumen por Tipo de Vehículo */}
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Resumen por Tipo de Vehículo</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tipo</TableCell>
                      <TableCell align="right">Vehículos</TableCell>
                      <TableCell align="right">Litros</TableCell>
                      <TableCell align="right">Costo</TableCell>
                      <TableCell align="right">Registros</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(summaryData.byVehicleType).map(([type, data]) => (
                      <TableRow key={type}>
                        <TableCell>{type}</TableCell>
                        <TableCell align="right">{data.count}</TableCell>
                        <TableCell align="right">{formatNumber(data.totalLiters)} L</TableCell>
                        <TableCell align="right">{formatCurrency(data.totalCost)}</TableCell>
                        <TableCell align="right">{data.recordCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          {/* Resumen por Sucursal */}
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Resumen por Sucursal</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Sucursal</TableCell>
                      <TableCell align="right">Vehículos</TableCell>
                      <TableCell align="right">Litros</TableCell>
                      <TableCell align="right">Costo</TableCell>
                      <TableCell align="right">Registros</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(summaryData.byBranch).map(([branch, data]) => (
                      <TableRow key={branch}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Business fontSize="small" />
                            {branch}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{data.count}</TableCell>
                        <TableCell align="right">{formatNumber(data.totalLiters)} L</TableCell>
                        <TableCell align="right">{formatCurrency(data.totalCost)}</TableCell>
                        <TableCell align="right">{data.recordCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          {/* Detalle por Vehículo */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detalle por Vehículo
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Vehículo</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Sucursal</TableCell>
                      <TableCell align="right">Registros</TableCell>
                      <TableCell align="right">Litros</TableCell>
                      <TableCell align="right">Costo</TableCell>
                      <TableCell align="right">€/L</TableCell>
                      <TableCell align="right">Consumo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summaryData.vehicles.map((vehicle) => (
                      <TableRow key={vehicle.vehicleId}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {vehicle.plateNumber}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {vehicle.make} {vehicle.model}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={vehicle.vehicleType} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{vehicle.branch}</TableCell>
                        <TableCell align="right">{vehicle.recordCount}</TableCell>
                        <TableCell align="right">
                          {vehicle.totalLiters > 0 ? `${formatNumber(vehicle.totalLiters)} L` : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {vehicle.totalCost > 0 ? formatCurrency(vehicle.totalCost) : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {vehicle.averagePricePerLiter ? formatCurrency(vehicle.averagePricePerLiter) : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {vehicle.averageConsumption ? 
                            `${formatNumber(vehicle.averageConsumption)} L/100km` : 
                            '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default FuelSummary;