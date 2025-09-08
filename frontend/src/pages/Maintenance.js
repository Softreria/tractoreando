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
  Avatar,
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
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  InputAdornment,
  Tooltip,
  Badge,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondary,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Autocomplete,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Search,
  FilterList,
  Build,
  Schedule,
  PlayArrow,
  Pause,
  CheckCircle,
  Warning,
  Error,
  DirectionsCar,
  Person,
  CalendarToday,
  AccessTime,
  AttachMoney,
  Assignment,
  Visibility,
  Print,
  GetApp,
  Timeline,
  Settings,
  Done,
  Cancel
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import MaintenanceCalendar from '../components/MaintenanceCalendar';

const Maintenance = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  
  const { user, hasPermission, hasRole } = useAuth();
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors }
  } = useForm();

  const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({
    control,
    name: 'services'
  });

  const { fields: partFields, append: appendPart, remove: removePart } = useFieldArray({
    control,
    name: 'parts'
  });

  const {
    register: registerTime,
    handleSubmit: handleSubmitTime,
    reset: resetTime,
    formState: { errors: timeErrors }
  } = useForm();

  // Consulta de mantenimientos
  const { data: maintenanceData, isLoading } = useQuery({
    queryKey: ['maintenance', page, rowsPerPage, searchTerm, filterStatus, filterType, filterPriority, filterVehicle],
    queryFn: async () => {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        type: filterType || undefined,
        priority: filterPriority || undefined,
        vehicle: filterVehicle || undefined
      };
      const response = await api.get('/maintenance', { params });
      return response.data;
    }
  });

  // Consulta de vehículos para el filtro
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: async () => {
      const response = await api.get('/vehicles', { params: { limit: 100 } });
      return response.data.vehicles;
    }
  });

  // Consulta de usuarios (mecánicos)
  const { data: usersData } = useQuery({
    queryKey: ['users-mechanics'],
    queryFn: async () => {
      const response = await api.get('/users', { params: { role: 'mechanic', limit: 100 } });
      return response.data.users;
    }
  });

  // Mutación para crear/actualizar mantenimiento
  const saveMaintenanceMutation = useMutation({
    mutationFn: async (data) => {
      if (editingMaintenance) {
        return api.put(`/maintenance/${editingMaintenance.id}`, data);
    } else {
      return api.post('/maintenance', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenance']);
      toast.success(editingMaintenance ? 'Mantenimiento actualizado' : 'Mantenimiento creado');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al guardar mantenimiento');
    }
  });

  // Mutación para eliminar mantenimiento
  const deleteMaintenanceMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/maintenance/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenance']);
      toast.success('Mantenimiento eliminado');
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar mantenimiento');
    }
  });

  // Mutación para cambiar estado
  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }) => {
      return api.patch(`/maintenance/${id}/status`, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenance']);
      toast.success('Estado actualizado');
      setStatusDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar estado');
    }
  });

  // Mutación para registrar tiempo
  const logTimeMutation = useMutation({
    mutationFn: async (data) => {
      return api.post(`/maintenance/${selectedMaintenance.id}/time`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenance']);
      toast.success('Tiempo registrado');
      setTimeDialogOpen(false);
      resetTime();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al registrar tiempo');
    }
  });

  const handleOpenDialog = (maintenance = null) => {
    setEditingMaintenance(maintenance);
    if (maintenance) {
      reset({
        vehicleId: maintenance.vehicle.id,
        type: maintenance.type,
        priority: maintenance.priority,
        title: maintenance.title,
        description: maintenance.description,
        odometerReading: maintenance.odometerReading,
        scheduledDate: maintenance.scheduledDate ? maintenance.scheduledDate.split('T')[0] : '',
        estimatedDuration: maintenance.estimatedDuration,
        assignedTo: maintenance.assignedTo?.map(user => user.id) || [],
        services: maintenance.services || [{ category: '', description: '', estimatedCost: 0 }],
        parts: maintenance.parts || [{ name: '', partNumber: '', quantity: 1, unitPrice: 0 }],
        notes: maintenance.notes
      });
    } else {
      reset({
        type: 'preventivo',
        priority: 'media',
        estimatedDuration: 2,
        services: [{ category: '', description: '', estimatedCost: 0 }],
        parts: [{ name: '', partNumber: '', quantity: 1, unitPrice: 0 }]
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMaintenance(null);
    reset();
  };

  const handleMenuOpen = (event, maintenance) => {
    setAnchorEl(event.currentTarget);
    setSelectedMaintenance(maintenance);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMaintenance(null);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    setAnchorEl(null);
  };

  const confirmDelete = () => {
    if (selectedMaintenance) {
      deleteMaintenanceMutation.mutate(selectedMaintenance.id);
    }
  };

  const handleChangeStatus = (status) => {
    setStatusDialogOpen(true);
    handleMenuClose();
  };

  const handleLogTime = () => {
    resetTime();
    setTimeDialogOpen(true);
    handleMenuClose();
  };

  const onSubmit = (data) => {
    const maintenanceData = {
      ...data,
      odometerReading: parseInt(data.odometerReading) || 0,
      estimatedDuration: parseFloat(data.estimatedDuration),
      services: data.services.map(service => ({
        ...service,
        estimatedCost: parseFloat(service.estimatedCost) || 0
      })),
      parts: data.parts.map(part => ({
        ...part,
        quantity: parseInt(part.quantity) || 1,
        unitPrice: parseFloat(part.unitPrice) || 0
      }))
    };
    saveMaintenanceMutation.mutate(maintenanceData);
  };

  const onSubmitTime = (data) => {
    logTimeMutation.mutate({
      hours: parseFloat(data.hours),
      description: data.description,
      date: data.date
    });
  };

  const filteredMaintenance = maintenanceData?.maintenance || [];
  const totalCount = maintenanceData?.total || 0;

  const maintenanceTypes = [
    { value: 'preventivo', label: 'Preventivo' },
    { value: 'correctivo', label: 'Correctivo' },
    { value: 'emergencia', label: 'Emergencia' },
    { value: 'inspeccion', label: 'Inspección' }
  ];

  const priorities = [
    { value: 'baja', label: 'Baja' },
    { value: 'media', label: 'Media' },
    { value: 'alta', label: 'Alta' },
    { value: 'critica', label: 'Crítica' }
  ];

  const statuses = [
    { value: 'programado', label: 'Programado' },
    { value: 'en_proceso', label: 'En Progreso' },
    { value: 'pausado', label: 'En Espera' },
    { value: 'completado', label: 'Completado' },
    { value: 'cancelado', label: 'Cancelado' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'programado': return 'info';
      case 'en_proceso': return 'warning';
        case 'pausado': return 'default';
        case 'completado': return 'success';
        case 'cancelado': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'success';
      case 'medium': return 'info';
      case 'high': return 'warning';
      case 'urgent': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'programado': return <Schedule />;
      case 'en_proceso': return <PlayArrow />;
        case 'pausado': return <Pause />;
        case 'completado': return <CheckCircle />;
        case 'cancelado': return <Cancel />;
      default: return <Build />;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Gestión de Mantenimiento
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Programa y gestiona el mantenimiento de la flota
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Toggle de vista */}
          <Button
            variant={viewMode === 'list' ? 'contained' : 'outlined'}
            startIcon={<Assignment />}
            onClick={() => setViewMode('list')}
          >
            Lista
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'contained' : 'outlined'}
            startIcon={<CalendarToday />}
            onClick={() => setViewMode('calendar')}
          >
            Calendario
          </Button>
          {hasPermission('maintenance', 'create') && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Nuevo Mantenimiento
            </Button>
          )}
        </Box>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Vehículo</InputLabel>
                <Select
                  value={filterVehicle}
                  label="Vehículo"
                  onChange={(e) => setFilterVehicle(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {vehiclesData?.map((vehicle) => (
                    <MenuItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.plateNumber} - {vehicle.make} {vehicle.model}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={filterType}
                  label="Tipo"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {maintenanceTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Prioridad</InputLabel>
                <Select
                  value={filterPriority}
                  label="Prioridad"
                  onChange={(e) => setFilterPriority(e.target.value)}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {priorities.map((priority) => (
                    <MenuItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filterStatus}
                  label="Estado"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  {statuses.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
              >
                Más Filtros
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Vista de lista */}
      {viewMode === 'list' && (
        <Card>
          <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Mantenimiento</TableCell>
                <TableCell>Vehículo</TableCell>
                <TableCell>Tipo/Prioridad</TableCell>
                <TableCell>Programación</TableCell>
                <TableCell>Asignado</TableCell>
                <TableCell>Progreso</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMaintenance.map((maintenance) => {
                const progress = maintenance.status === 'completado' ? 100 :
                                maintenance.status === 'en_proceso' ? 50 :
                               maintenance.status === 'programado' ? 0 : 25;
                
                return (
                  <TableRow key={maintenance.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          <Build />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            #{maintenance.workOrderNumber}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                            {maintenance.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Creado: {new Date(maintenance.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <DirectionsCar sx={{ fontSize: 16, mr: 0.5 }} />
                        <Box>
                          <Typography variant="body2">
                            {maintenance.vehicle?.plateNumber}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {maintenance.vehicle?.make} {maintenance.vehicle?.model}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Chip
                          label={maintenanceTypes.find(t => t.value === maintenance.type)?.label}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={priorities.find(p => p.value === maintenance.priority)?.label}
                          size="small"
                          color={getPriorityColor(maintenance.priority)}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <CalendarToday sx={{ fontSize: 16, mr: 0.5 }} />
                        <Typography variant="body2">
                          {maintenance.scheduledDate ? new Date(maintenance.scheduledDate).toLocaleDateString() : 'Sin programar'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AccessTime sx={{ fontSize: 16, mr: 0.5 }} />
                        <Typography variant="caption" color="text.secondary">
                          {maintenance.estimatedDuration}h estimadas
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {maintenance.assignedTo?.length > 0 ? (
                        <Box>
                          {maintenance.assignedTo.slice(0, 2).map((user, index) => (
                            <Box key={user.id} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <Person sx={{ fontSize: 16, mr: 0.5 }} />
                              <Typography variant="caption">
                                {user.name} {user.lastName}
                              </Typography>
                            </Box>
                          ))}
                          {maintenance.assignedTo.length > 2 && (
                            <Typography variant="caption" color="text.secondary">
                              +{maintenance.assignedTo.length - 2} más
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Sin asignar
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                          color={progress === 100 ? 'success' : 'primary'}
                        />
                        <Typography variant="caption">
                          {progress}%
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {maintenance.actualDuration || 0}h / {maintenance.estimatedDuration}h
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(maintenance.status)}
                        label={statuses.find(s => s.value === maintenance.status)?.label}
                        color={getStatusColor(maintenance.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, maintenance)}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </Card>
      )}

      {/* Vista de calendario */}
      {viewMode === 'calendar' && (
        <MaintenanceCalendar />
      )}

      {/* Menú de acciones */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {hasPermission('maintenance', 'read') && (
          <MenuItem onClick={() => { /* Ver detalles */ handleMenuClose(); }}>
            <ListItemIcon>
              <Visibility fontSize="small" />
            </ListItemIcon>
            <ListItemText>Ver Detalles</ListItemText>
          </MenuItem>
        )}
        {hasPermission('maintenance', 'update') && (
          <MenuItem onClick={() => { handleOpenDialog(selectedMaintenance); handleMenuClose(); }}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        )}
        {hasPermission('maintenance', 'update') && selectedMaintenance?.status !== 'completed' && (
          <MenuItem onClick={() => handleChangeStatus('en_proceso')}>
            <ListItemIcon>
              <PlayArrow fontSize="small" />
            </ListItemIcon>
            <ListItemText>Iniciar</ListItemText>
          </MenuItem>
        )}
        {hasPermission('maintenance', 'update') && selectedMaintenance?.status === 'en_proceso' && (
          <MenuItem onClick={() => handleChangeStatus('completado')}>
            <ListItemIcon>
              <CheckCircle fontSize="small" />
            </ListItemIcon>
            <ListItemText>Completar</ListItemText>
          </MenuItem>
        )}
        {hasPermission('maintenance', 'update') && (
          <MenuItem onClick={handleLogTime}>
            <ListItemIcon>
              <AccessTime fontSize="small" />
            </ListItemIcon>
            <ListItemText>Registrar Tiempo</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => { /* Imprimir */ handleMenuClose(); }}>
          <ListItemIcon>
            <Print fontSize="small" />
          </ListItemIcon>
          <ListItemText>Imprimir Orden</ListItemText>
        </MenuItem>
        <Divider />
        {hasPermission('maintenance', 'delete') && selectedMaintenance?.status === 'programado' && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Delete fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Eliminar</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Dialog de crear/editar mantenimiento */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingMaintenance ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab label="Información General" />
                <Tab label="Servicios" />
                <Tab label="Partes" />
              </Tabs>
            </Box>
            
            {/* Tab 0: Información General */}
            {tabValue === 0 && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="vehicleId"
                    control={control}
                    rules={{ required: 'El vehículo es requerido' }}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.vehicleId}>
                        <InputLabel>Vehículo</InputLabel>
                        <Select {...field} label="Vehículo">
                          {vehiclesData?.map((vehicle) => (
                            <MenuItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.plateNumber} - {vehicle.make} {vehicle.model}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Controller
                    name="type"
                    control={control}
                    rules={{ required: 'El tipo es requerido' }}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.type}>
                        <InputLabel>Tipo</InputLabel>
                        <Select {...field} label="Tipo">
                          {maintenanceTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Controller
                    name="priority"
                    control={control}
                    rules={{ required: 'La prioridad es requerida' }}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.priority}>
                        <InputLabel>Prioridad</InputLabel>
                        <Select {...field} label="Prioridad">
                          {priorities.map((priority) => (
                            <MenuItem key={priority.value} value={priority.value}>
                              {priority.label}
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
                    label="Título"
                    {...register('title', { required: 'El título es requerido' })}
                    error={!!errors.title}
                    helperText={errors.title?.message}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Lectura del Odómetro (km)"
                    type="number"
                    {...register('odometerReading', { required: 'La lectura del odómetro es requerida', min: 0 })}
                    error={!!errors.odometerReading}
                    helperText={errors.odometerReading?.message}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Descripción"
                    multiline
                    rows={3}
                    {...register('description', { required: 'La descripción es requerida' })}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Fecha Programada"
                    type="date"
                    {...register('scheduledDate')}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Duración Estimada (horas)"
                    type="number"
                    step="0.5"
                    {...register('estimatedDuration', { required: 'La duración es requerida', min: 0.5 })}
                    error={!!errors.estimatedDuration}
                    helperText={errors.estimatedDuration?.message}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="assignedTo"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        multiple
                        options={usersData || []}
                        getOptionLabel={(option) => `${option.name} ${option.lastName}`}
                        value={usersData?.filter(user => field.value?.includes(user.id)) || []}
              onChange={(event, newValue) => {
                field.onChange(newValue.map(user => user.id));
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Asignar a"
                            placeholder="Selecciona mecánicos"
                          />
                        )}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notas Adicionales"
                    multiline
                    rows={2}
                    {...register('notes')}
                  />
                </Grid>
              </Grid>
            )}
            
            {/* Tab 1: Servicios */}
            {tabValue === 1 && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Servicios a Realizar</Typography>
                  <Button
                    startIcon={<Add />}
                    onClick={() => appendService({ category: '', description: '', estimatedCost: 0 })}
                  >
                    Agregar Servicio
                  </Button>
                </Box>
                {serviceFields.map((field, index) => (
                  <Card key={field.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Categoría del Servicio"
                            {...register(`services.${index}.category`, { required: 'Requerido' })}
                            error={!!errors.services?.[index]?.category}
                          />
                        </Grid>
                        <Grid item xs={12} md={5}>
                          <TextField
                            fullWidth
                            label="Descripción"
                            {...register(`services.${index}.description`)}
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            label="Costo Estimado"
                            type="number"
                            step="0.01"
                            {...register(`services.${index}.estimatedCost`)}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">€</InputAdornment>
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={1}>
                          <IconButton
                            color="error"
                            onClick={() => removeService(index)}
                            disabled={serviceFields.length === 1}
                          >
                            <Delete />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
            
            {/* Tab 2: Partes */}
            {tabValue === 2 && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Partes Requeridas</Typography>
                  <Button
                    startIcon={<Add />}
                    onClick={() => appendPart({ name: '', partNumber: '', quantity: 1, unitPrice: 0 })}
                  >
                    Agregar Parte
                  </Button>
                </Box>
                {partFields.map((field, index) => (
                  <Card key={field.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            label="Nombre de la Parte"
                            {...register(`parts.${index}.name`, { required: 'Requerido' })}
                            error={!!errors.parts?.[index]?.name}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            label="Número de Parte"
                            {...register(`parts.${index}.partNumber`)}
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            label="Cantidad"
                            type="number"
                            {...register(`parts.${index}.quantity`, { required: 'Requerido', min: 1 })}
                            error={!!errors.parts?.[index]?.quantity}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            label="Costo Unitario"
                            type="number"
                            step="0.01"
                            {...register(`parts.${index}.unitPrice`)}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">€</InputAdornment>
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={1}>
                          <IconButton
                            color="error"
                            onClick={() => removePart(index)}
                            disabled={partFields.length === 1}
                          >
                            <Delete />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={saveMaintenanceMutation.isPending}
            >
              {saveMaintenanceMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog de registrar tiempo */}
      <Dialog open={timeDialogOpen} onClose={() => setTimeDialogOpen(false)}>
        <form onSubmit={handleSubmitTime(onSubmitTime)}>
          <DialogTitle>Registrar Tiempo de Trabajo</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Horas Trabajadas"
                  type="number"
                  step="0.25"
                  {...registerTime('hours', { required: 'Las horas son requeridas', min: 0.25 })}
                  error={!!timeErrors.hours}
                  helperText={timeErrors.hours?.message}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Fecha"
                  type="date"
                  {...registerTime('date', { required: 'La fecha es requerida' })}
                  error={!!timeErrors.date}
                  helperText={timeErrors.date?.message}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción del Trabajo"
                  multiline
                  rows={3}
                  {...registerTime('description', { required: 'La descripción es requerida' })}
                  error={!!timeErrors.description}
                  helperText={timeErrors.description?.message}
                  placeholder="Describe el trabajo realizado..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTimeDialogOpen(false)}>Cancelar</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={logTimeMutation.isPending}
            >
              {logTimeMutation.isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta acción no se puede deshacer.
          </Alert>
          <Typography>
            ¿Estás seguro de que deseas eliminar el mantenimiento <strong>#{selectedMaintenance?.workOrderNumber}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={deleteMaintenanceMutation.isPending}
          >
            {deleteMaintenanceMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Maintenance;