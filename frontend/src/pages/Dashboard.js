import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Chip,
  Button,
  Paper,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  DirectionsCar,
  Build,
  Warning,
  TrendingUp,
  People,
  Business,
  Store,
  Refresh,
  MoreVert,
  CheckCircle,
  Schedule,
  Error
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

// Componente de tarjeta de estadística
const StatCard = ({ title, value, icon, color, trend, trendValue }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <TrendingUp 
                sx={{ 
                  color: trend === 'up' ? 'success.main' : 'error.main',
                  mr: 0.5,
                  fontSize: 16
                }} 
              />
              <Typography 
                variant="body2" 
                sx={{ color: trend === 'up' ? 'success.main' : 'error.main' }}
              >
                {trendValue}%
              </Typography>
            </Box>
          )}
        </Box>
        <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

// Componente de gráfico de mantenimientos
const MaintenanceChart = ({ data }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Mantenimientos por Mes</Typography>
        <IconButton size="small">
          <MoreVert />
        </IconButton>
      </Box>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line 
            type="monotone" 
            dataKey="completed" 
            stroke="#00C49F" 
            strokeWidth={2}
            name="Completados"
          />
          <Line 
            type="monotone" 
            dataKey="pending" 
            stroke="#FFBB28" 
            strokeWidth={2}
            name="Pendientes"
          />
          <Line 
            type="monotone" 
            dataKey="inProgress" 
            stroke="#0088FE" 
            strokeWidth={2}
            name="En Progreso"
          />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

// Componente de distribución de vehículos
const VehicleDistribution = ({ data }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        Distribución de Vehículos
      </Typography>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

// Componente de alertas recientes
const RecentAlerts = ({ alerts }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Alertas Recientes</Typography>
        <Button size="small" startIcon={<Refresh />}>
          Actualizar
        </Button>
      </Box>
      <List>
        {alerts.map((alert, index) => (
          <React.Fragment key={alert.id}>
            <ListItem alignItems="flex-start" sx={{ px: 0 }}>
              <ListItemAvatar>
                <Avatar sx={{ 
                  bgcolor: alert.type === 'critical' ? 'error.main' : 
                          alert.type === 'warning' ? 'warning.main' : 'info.main'
                }}>
                  {alert.type === 'critical' ? <Error /> : 
                   alert.type === 'warning' ? <Warning /> : <Schedule />}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={alert.title}
                secondary={
                  <React.Fragment>
                    <Typography component="span" variant="body2" color="text.primary">
                      {typeof alert.vehicle === 'object' ? alert.vehicle?.plateNumber : alert.vehicle}
                    </Typography>
                    {` — ${alert.description}`}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {alert.time}
                    </Typography>
                  </React.Fragment>
                }
              />
            </ListItem>
            {index < alerts.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
    </CardContent>
  </Card>
);

// Componente de mantenimientos recientes
const RecentMaintenance = ({ maintenances }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        Mantenimientos Recientes
      </Typography>
      <List>
        {maintenances.map((maintenance, index) => (
          <React.Fragment key={maintenance.id}>
            <ListItem alignItems="flex-start" sx={{ px: 0 }}>
              <ListItemAvatar>
                <Avatar sx={{ 
                  bgcolor: maintenance.status === 'completed' ? 'success.main' : 
                          maintenance.status === 'in_progress' ? 'info.main' : 'warning.main'
                }}>
                  {maintenance.status === 'completed' ? <CheckCircle /> : 
                   maintenance.status === 'in_progress' ? <Build /> : <Schedule />}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2">
                      {maintenance.workOrderNumber}
                    </Typography>
                    <Chip 
                      label={
                        maintenance.status === 'completed' ? 'Completado' :
                        maintenance.status === 'in_progress' ? 'En Progreso' : 'Programado'
                      }
                      size="small"
                      color={
                        maintenance.status === 'completed' ? 'success' :
                        maintenance.status === 'in_progress' ? 'info' : 'warning'
                      }
                    />
                  </Box>
                }
                secondary={
                  <React.Fragment>
                    <Typography component="span" variant="body2" color="text.primary">
                      {typeof maintenance.vehicle === 'object' ? maintenance.vehicle?.plateNumber : maintenance.vehicle} - {maintenance.type}
                    </Typography>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {maintenance.date}
                    </Typography>
                  </React.Fragment>
                }
              />
            </ListItem>
            {index < maintenances.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { user, hasRole, isAuthenticated, authLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Consulta de datos del dashboard
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/reports/dashboard');
      return response.data;
    },
    enabled: isAuthenticated && !!user && !authLoading, // Solo ejecutar cuando el usuario esté completamente cargado
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 30000 // Actualizar cada 30 segundos
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast.success('Dashboard actualizado');
    } catch (error) {
      toast.error('Error al actualizar el dashboard');
    } finally {
      setRefreshing(false);
    }
  };

  // Datos de ejemplo para desarrollo
  const mockData = {
    stats: {
      totalVehicles: 156,
      activeMaintenance: 23,
      pendingAlerts: 8,
      totalUsers: 45,
      totalCompanies: hasRole('super_admin') ? 12 : undefined,
      totalBranches: hasRole(['super_admin', 'company_admin']) ? 8 : undefined
    },
    maintenanceChart: [
      { month: 'Ene', completed: 45, pending: 12, inProgress: 8 },
      { month: 'Feb', completed: 52, pending: 15, inProgress: 10 },
      { month: 'Mar', completed: 48, pending: 18, inProgress: 12 },
      { month: 'Abr', completed: 61, pending: 14, inProgress: 9 },
      { month: 'May', completed: 55, pending: 16, inProgress: 11 },
      { month: 'Jun', completed: 67, pending: 13, inProgress: 7 }
    ],
    vehicleDistribution: [
      { name: 'Operativo', value: 120 },
      { name: 'Mantenimiento', value: 23 },
      { name: 'Fuera de Servicio', value: 8 },
      { name: 'Reserva', value: 5 }
    ],
    recentAlerts: [
      {
        id: 1,
        type: 'critical',
        title: 'Cambio de aceite vencido',
        vehicle: 'ABC-123',
        description: 'Vencido hace 500 km',
        time: 'Hace 2 horas'
      },
      {
        id: 2,
        type: 'warning',
        title: 'Inspección próxima',
        vehicle: 'DEF-456',
        description: 'Vence en 3 días',
        time: 'Hace 4 horas'
      },
      {
        id: 3,
        type: 'info',
        title: 'Mantenimiento programado',
        vehicle: 'GHI-789',
        description: 'Programado para mañana',
        time: 'Hace 6 horas'
      }
    ],
    recentMaintenance: [
      {
        id: 1,
        workOrderNumber: 'WO-2024-001',
        vehicle: 'ABC-123',
        type: 'Cambio de aceite',
        status: 'completed',
        date: 'Hoy 14:30'
      },
      {
        id: 2,
        workOrderNumber: 'WO-2024-002',
        vehicle: 'DEF-456',
        type: 'Revisión general',
        status: 'in_progress',
        date: 'Hoy 10:00'
      },
      {
        id: 3,
        workOrderNumber: 'WO-2024-003',
        vehicle: 'GHI-789',
        type: 'Cambio de llantas',
        status: 'scheduled',
        date: 'Mañana 09:00'
      }
    ]
  };

  // Transformar datos de la API al formato esperado por el componente
  const transformedData = dashboardData ? {
    stats: {
      totalVehicles: dashboardData.vehicles?.total || 0,
      activeMaintenance: dashboardData.maintenance?.inProgress || 0,
      pendingAlerts: (dashboardData.alerts?.overdue || 0) + (dashboardData.alerts?.dueToday || 0),
      totalUsers: dashboardData.users?.total || 0,
      totalCompanies: hasRole('super_admin') ? dashboardData.companies?.total : undefined,
      totalBranches: hasRole(['super_admin', 'company_admin']) ? dashboardData.branches?.total : undefined
    },
    maintenanceChart: dashboardData.maintenanceChart || [],
    vehicleDistribution: dashboardData.vehicleDistribution || [],
    recentAlerts: dashboardData.upcomingMaintenances || [],
    recentMaintenance: dashboardData.recentMaintenances || []
  } : null;

  const data = transformedData || mockData;

  if (isLoading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Bienvenido de vuelta, {user?.name}. Aquí tienes un resumen de tu flota.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </Box>

      {/* Tarjetas de estadísticas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Vehículos"
            value={data.stats?.totalVehicles || 0}
            icon={<DirectionsCar />}
            color="primary.main"
            trend="up"
            trendValue="5.2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Mantenimientos Activos"
            value={data.stats?.activeMaintenance || 0}
            icon={<Build />}
            color="info.main"
            trend="up"
            trendValue="2.1"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Alertas Pendientes"
            value={data.stats?.pendingAlerts || 0}
            icon={<Warning />}
            color="warning.main"
            trend="down"
            trendValue="1.8"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Usuarios"
            value={data.stats?.totalUsers || 0}
            icon={<People />}
            color="success.main"
            trend="up"
            trendValue="3.5"
          />
        </Grid>
        
        {/* Estadísticas adicionales para super admin */}
        {hasRole('super_admin') && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Empresas"
                value={data.stats?.totalCompanies || 0}
                icon={<Business />}
                color="secondary.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Delegaciones"
                value={data.stats?.totalBranches || 0}
                icon={<Store />}
                color="error.main"
              />
            </Grid>
          </>
        )}
      </Grid>

      {/* Gráficos y listas */}
      <Grid container spacing={3}>
        {/* Gráfico de mantenimientos */}
        <Grid item xs={12} lg={8}>
          <MaintenanceChart data={data?.maintenanceChart || []} />
        </Grid>
        
        {/* Distribución de vehículos */}
        <Grid item xs={12} lg={4}>
          <VehicleDistribution data={data?.vehicleDistribution || []} />
        </Grid>
        
        {/* Alertas recientes */}
        <Grid item xs={12} lg={6}>
          <RecentAlerts alerts={data?.recentAlerts || []} />
        </Grid>
        
        {/* Mantenimientos recientes */}
        <Grid item xs={12} lg={6}>
          <RecentMaintenance maintenances={data?.recentMaintenance || []} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;