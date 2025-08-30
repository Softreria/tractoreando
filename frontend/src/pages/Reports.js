import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  LinearProgress
} from '@mui/material';
import {
  Assessment,
  DirectionsCar,
  Build,
  AttachMoney,
  TrendingUp,
  GetApp,
  Refresh,
  DateRange,
  FilterList,
  PictureAsPdf,
  TableChart,
  BarChart,
  PieChart,
  Timeline,
  Engineering,
  Business,
  LocationOn,
  Schedule,
  CheckCircle,
  Warning,
  Error
} from '@mui/icons-material';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  LineChart,
  Line,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
// DatePicker temporarily removed to fix compilation issues

const Reports = () => {
  const [tabValue, setTabValue] = useState(0);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date()
  });
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedMechanic, setSelectedMechanic] = useState('');
  const [reportType, setReportType] = useState('summary');
  const [groupBy, setGroupBy] = useState('month');
  
  const { user, hasPermission } = useAuth();

  // Consulta del dashboard principal
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard-reports'],
    queryFn: async () => {
      const response = await api.get('/reports/dashboard');
      return response.data;
    }
  });

  // Consulta de reportes de vehículos
  const { data: vehicleReports, isLoading: vehicleLoading } = useQuery({
    queryKey: ['vehicle-reports', dateRange, selectedBranch],
    queryFn: async () => {
      const params = {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        branch: selectedBranch || undefined
      };
      const response = await api.get('/reports/vehicles', { params });
      return response.data;
    },
    enabled: tabValue === 1
  });

  // Consulta de reportes de mantenimiento
  const { data: maintenanceReports, isLoading: maintenanceLoading } = useQuery({
    queryKey: ['maintenance-reports', dateRange, selectedBranch, selectedVehicle],
    queryFn: async () => {
      const params = {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        branch: selectedBranch || undefined,
        vehicle: selectedVehicle || undefined
      };
      const response = await api.get('/reports/maintenance', { params });
      return response.data;
    },
    enabled: tabValue === 2
  });

  // Consulta de reportes de costos
  const { data: costReports, isLoading: costLoading } = useQuery({
    queryKey: ['cost-reports', dateRange, groupBy, selectedBranch],
    queryFn: async () => {
      const params = {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        groupBy,
        branch: selectedBranch || undefined
      };
      const response = await api.get('/reports/costs', { params });
      return response.data;
    },
    enabled: tabValue === 3
  });

  // Consulta de reportes de rendimiento
  const { data: performanceReports, isLoading: performanceLoading } = useQuery({
    queryKey: ['performance-reports', dateRange, selectedBranch, selectedMechanic],
    queryFn: async () => {
      const params = {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        branch: selectedBranch || undefined,
        mechanic: selectedMechanic || undefined
      };
      const response = await api.get('/reports/performance', { params });
      return response.data;
    },
    enabled: tabValue === 4
  });

  // Consulta de delegaciones para filtros
  const { data: branchesData } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const response = await api.get('/branches', { params: { limit: 100 } });
      return response.data.branches;
    }
  });

  // Consulta de vehículos para filtros
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-list', selectedBranch],
    queryFn: async () => {
      const params = { limit: 100 };
      if (selectedBranch) params.branch = selectedBranch;
      const response = await api.get('/vehicles', { params });
      return response.data.vehicles;
    }
  });

  // Consulta de mecánicos para filtros
  const { data: mechanicsData } = useQuery({
    queryKey: ['mechanics-list', selectedBranch],
    queryFn: async () => {
      const params = { role: 'mechanic', limit: 100 };
      if (selectedBranch) params.branch = selectedBranch;
      const response = await api.get('/users', { params });
      return response.data.users;
    }
  });

  const handleExport = async (type, format = 'csv') => {
    try {
      const params = {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        format,
        branch: selectedBranch || undefined,
        vehicle: selectedVehicle || undefined,
        mechanic: selectedMechanic || undefined
      };

      const response = await api.get(`/reports/${type}/export`, {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte-${type}-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Reporte exportado exitosamente');
    } catch (error) {
      toast.error('Error al exportar el reporte');
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'scheduled': return 'info';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'in_progress': return <Schedule />;
      case 'scheduled': return <DateRange />;
      case 'cancelled': return <Error />;
      default: return <Warning />;
    }
  };

  const StatCard = ({ title, value, icon, color = 'primary', subtitle, trend }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUp 
                  sx={{ 
                    fontSize: 16, 
                    mr: 0.5, 
                    color: trend > 0 ? 'success.main' : 'error.main' 
                  }} 
                />
                <Typography 
                  variant="caption" 
                  sx={{ color: trend > 0 ? 'success.main' : 'error.main' }}
                >
                  {trend > 0 ? '+' : ''}{trend}%
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  return (
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Reportes y Análisis
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Visualiza estadísticas y genera reportes del sistema
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => window.location.reload()}
            >
              Actualizar
            </Button>
            {hasPermission('reports', 'export') && (
              <Button
                variant="contained"
                startIcon={<GetApp />}
                onClick={() => handleExport(['vehicles', 'maintenance', 'costs', 'performance'][tabValue], 'csv')}
              >
                Exportar
              </Button>
            )}
          </Box>
        </Box>

        {/* Filtros globales */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  label="Fecha Inicio"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Fecha Fin"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Delegación</InputLabel>
                  <Select
                    value={selectedBranch}
                    label="Delegación"
                    onChange={(e) => setSelectedBranch(e.target.value)}
                  >
                    <MenuItem value="">Todas las delegaciones</MenuItem>
                    {branchesData?.map((branch) => (
                      <MenuItem key={branch._id} value={branch._id}>
                        {branch.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Agrupar por</InputLabel>
                  <Select
                    value={groupBy}
                    label="Agrupar por"
                    onChange={(e) => setGroupBy(e.target.value)}
                  >
                    <MenuItem value="day">Día</MenuItem>
                    <MenuItem value="week">Semana</MenuItem>
                    <MenuItem value="month">Mes</MenuItem>
                    <MenuItem value="quarter">Trimestre</MenuItem>
                    <MenuItem value="year">Año</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Tabs de reportes */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab icon={<Assessment />} label="Dashboard" />
            <Tab icon={<DirectionsCar />} label="Vehículos" />
            <Tab icon={<Build />} label="Mantenimiento" />
            <Tab icon={<AttachMoney />} label="Costos" />
            <Tab icon={<TrendingUp />} label="Rendimiento" />
          </Tabs>
        </Box>

        {/* Tab 0: Dashboard */}
        {tabValue === 0 && (
          <Box>
            {dashboardLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                {/* Estadísticas principales */}
                <Grid item xs={12} md={3}>
                  <StatCard
                    title="Total Vehículos"
                    value={dashboardData?.totalVehicles || 0}
                    icon={<DirectionsCar />}
                    color="primary"
                    trend={dashboardData?.vehiclesTrend}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <StatCard
                    title="Mantenimientos Activos"
                    value={dashboardData?.activeMaintenances || 0}
                    icon={<Build />}
                    color="warning"
                    trend={dashboardData?.maintenancesTrend}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <StatCard
                    title="Costo Total"
                    value={formatCurrency(dashboardData?.totalCosts || 0)}
                    icon={<AttachMoney />}
                    color="success"
                    subtitle="Este mes"
                    trend={dashboardData?.costsTrend}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <StatCard
                    title="Eficiencia"
                    value={`${dashboardData?.efficiency || 0}%`}
                    icon={<TrendingUp />}
                    color="info"
                    subtitle="Promedio"
                    trend={dashboardData?.efficiencyTrend}
                  />
                </Grid>

                {/* Gráficos */}
                <Grid item xs={12} md={8}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Mantenimientos por Mes
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={dashboardData?.monthlyMaintenances || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <RechartsTooltip />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#8884d8" 
                            fill="#8884d8" 
                            fillOpacity={0.6}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Estados de Vehículos
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={dashboardData?.vehiclesByStatus || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {(dashboardData?.vehiclesByStatus || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Alertas y notificaciones */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Alertas Recientes
                      </Typography>
                      <List>
                        {(dashboardData?.recentAlerts || []).map((alert, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <Warning color={alert.priority === 'high' ? 'error' : 'warning'} />
                            </ListItemIcon>
                            <ListItemText
                              primary={alert.message}
                              secondary={`${alert.vehicle} - ${new Date(alert.date).toLocaleDateString()}`}
                            />
                            <Chip
                              label={alert.priority}
                              color={alert.priority === 'high' ? 'error' : 'warning'}
                              size="small"
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        )}

        {/* Tab 1: Reportes de Vehículos */}
        {tabValue === 1 && (
          <Box>
            {vehicleLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Vehículos por Tipo
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart data={vehicleReports?.byType || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="type" />
                          <YAxis />
                          <RechartsTooltip />
                          <Bar dataKey="count" fill="#8884d8" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Costos de Mantenimiento por Vehículo
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Vehículo</TableCell>
                              <TableCell align="right">Costo Total</TableCell>
                              <TableCell align="right">Promedio</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(vehicleReports?.maintenanceCosts || []).slice(0, 10).map((item) => (
                              <TableRow key={item.vehicleId}>
                                <TableCell>{item.vehicleName}</TableCell>
                                <TableCell align="right">{formatCurrency(item.totalCost)}</TableCell>
                                <TableCell align="right">{formatCurrency(item.averageCost)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        )}

        {/* Tab 2: Reportes de Mantenimiento */}
        {tabValue === 2 && (
          <Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Vehículo</InputLabel>
                  <Select
                    value={selectedVehicle}
                    label="Vehículo"
                    onChange={(e) => setSelectedVehicle(e.target.value)}
                  >
                    <MenuItem value="">Todos los vehículos</MenuItem>
                    {vehiclesData?.map((vehicle) => (
                      <MenuItem key={vehicle._id} value={vehicle._id}>
                        {vehicle.make} {vehicle.model} - {vehicle.plateNumber}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            {maintenanceLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Por Estado
                      </Typography>
                      <ResponsiveContainer width="100%" height={250}>
                        <RechartsPieChart>
                          <Pie
                            data={maintenanceReports?.byStatus || []}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {(maintenanceReports?.byStatus || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Mantenimientos por Tipo
                      </Typography>
                      <ResponsiveContainer width="100%" height={250}>
                        <RechartsBarChart data={maintenanceReports?.byType || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="type" />
                          <YAxis />
                          <RechartsTooltip />
                          <Bar dataKey="count" fill="#82ca9d" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        )}

        {/* Tab 3: Reportes de Costos */}
        {tabValue === 3 && (
          <Box>
            {costLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Evolución de Costos
                      </Typography>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={costReports?.timeline || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="laborCost" 
                            stroke="#8884d8" 
                            name="Mano de Obra"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="partsCost" 
                            stroke="#82ca9d" 
                            name="Repuestos"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="totalCost" 
                            stroke="#ffc658" 
                            name="Total"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Costos por Delegación
                      </Typography>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Delegación</TableCell>
                              <TableCell align="right">Costo Total</TableCell>
                              <TableCell align="right">% del Total</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(costReports?.byBranch || []).map((item) => (
                              <TableRow key={item.branchId}>
                                <TableCell>{item.branchName}</TableCell>
                                <TableCell align="right">{formatCurrency(item.totalCost)}</TableCell>
                                <TableCell align="right">{item.percentage}%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Costos por Tipo de Mantenimiento
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={costReports?.byMaintenanceType || []}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="cost"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {(costReports?.byMaintenanceType || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        )}

        {/* Tab 4: Reportes de Rendimiento */}
        {tabValue === 4 && (
          <Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Mecánico</InputLabel>
                  <Select
                    value={selectedMechanic}
                    label="Mecánico"
                    onChange={(e) => setSelectedMechanic(e.target.value)}
                  >
                    <MenuItem value="">Todos los mecánicos</MenuItem>
                    {mechanicsData?.map((mechanic) => (
                      <MenuItem key={mechanic._id} value={mechanic._id}>
                        {mechanic.name} {mechanic.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            {performanceLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Rendimiento por Mecánico
                      </Typography>
                      <List>
                        {(performanceReports?.byMechanic || []).map((mechanic) => (
                          <ListItem key={mechanic.mechanicId}>
                            <ListItemIcon>
                              <Avatar>
                                <Engineering />
                              </Avatar>
                            </ListItemIcon>
                            <ListItemText
                              primary={mechanic.mechanicName}
                              secondary={
                                <Box>
                                  <Typography variant="caption" display="block">
                                    Trabajos completados: {mechanic.completedJobs}
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Tiempo promedio: {mechanic.averageTime}h
                                  </Typography>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={mechanic.efficiency} 
                                    sx={{ mt: 1 }}
                                  />
                                  <Typography variant="caption">
                                    Eficiencia: {mechanic.efficiency}%
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Tiempo Promedio por Tipo
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart data={performanceReports?.averageTimeByType || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="type" />
                          <YAxis />
                          <RechartsTooltip formatter={(value) => `${value} horas`} />
                          <Bar dataKey="averageTime" fill="#8884d8" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        )}
      </Box>
  );
};

export default Reports;