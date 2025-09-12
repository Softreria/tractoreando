import React, { useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Add,
  Assignment,
  Build,
  CalendarToday,
  CheckCircle,
  Delete,
  DirectionsCar,
  Download,
  Edit,
  Error,
  FilterList,
  History,
  LocalGasStation,
  LocationOn,
  MoreVert,
  Schedule,
  Search,
  Speed,
  TrendingUp,
  Visibility,
  Warning
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import documentService from '../services/documentService';

const Vehicles = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mileageDialogOpen, setMileageDialogOpen] = useState(false);
  const [alertsDialogOpen, setAlertsDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [maintenanceHistoryDialogOpen, setMaintenanceHistoryDialogOpen] = useState(false);
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [vehicleDocuments, setVehicleDocuments] = useState([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [vehiclePhotos, setVehiclePhotos] = useState([]);
  
  const { user, hasPermission, hasRole, isAuthenticated, authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors }
  } = useForm();

  const {
    register: registerMileage,
    handleSubmit: handleSubmitMileage,
    reset: resetMileage,
    formState: { errors: mileageErrors }
  } = useForm();

  // Consulta de vehículos
  const { data: vehiclesData, isLoading } = useQuery({
    queryKey: ['vehicles', page, rowsPerPage, searchTerm, filterStatus, filterBranch, filterType],
    queryFn: async () => {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        branch: filterBranch || undefined,
        type: filterType || undefined
        // No enviamos vehicleTypeAccess como parámetro - el backend ya maneja esto internamente
      };
      const response = await api.get('/vehicles', { params });
      return response.data;
    },
    enabled: isAuthenticated && !!user && !authLoading
  });

  // Consulta de delegaciones para el filtro
  const { data: branchesData } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const response = await api.get('/branches', { params: { limit: 100 } });
      return response.data.branches;
    },
    enabled: isAuthenticated && !!user && !authLoading
  });

  // Consulta de alertas del vehículo seleccionado
  const { data: alertsData } = useQuery({
    queryKey: ['vehicle-alerts', selectedVehicle?.id],
    queryFn: async () => {
      const response = await api.get(`/vehicles/${selectedVehicle.id}/alerts`);
      return response.data;
    },
    enabled: !!selectedVehicle && alertsDialogOpen
  });

  // Mutación para crear/actualizar vehículo
  const saveVehicleMutation = useMutation({
    mutationFn: async (data) => {
      if (editingVehicle) {
        return api.put(`/vehicles/${editingVehicle.id}`, data);
    } else {
      return api.post('/vehicles', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vehicles']);
      toast.success(editingVehicle ? 'Vehículo actualizado' : 'Vehículo creado');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al guardar vehículo');
    }
  });

  // Mutación para eliminar vehículo
  const deleteVehicleMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/vehicles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vehicles']);
      toast.success('Vehículo eliminado');
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar vehículo');
    }
  });

  // Mutación para actualizar kilometraje
  const updateMileageMutation = useMutation({
    mutationFn: async (data) => {
      return api.patch(`/vehicles/${selectedVehicle.id}/mileage`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vehicles']);
      toast.success('Kilometraje actualizado');
      setMileageDialogOpen(false);
      resetMileage();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar kilometraje');
    }
  });

  const handleOpenDialog = (vehicle = null) => {
    // Validar acceso al tipo de vehículo al editar (excepto super_admin)
    if (vehicle && user?.role !== 'super_admin' && user?.vehicleTypeAccess && user.vehicleTypeAccess.length > 0) {
      if (!user.vehicleTypeAccess.includes(vehicle.vehicleType)) {
        toast.error('No tienes acceso para editar vehículos de este tipo');
        return;
      }
    }

    setEditingVehicle(vehicle);
    if (vehicle) {
      reset({
        plateNumber: vehicle.plateNumber,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        type: vehicle.vehicleType,
        branch: vehicle.branch.id,
        vin: vehicle.vin,
        color: vehicle.color,
        'engine.type': vehicle.engine?.type,
        transmission: vehicle.transmission,
        'odometer.current': vehicle.odometer?.current || 0,
        purchaseDate: vehicle.purchaseDate ? vehicle.purchaseDate.split('T')[0] : '',
        'documents.insurance.expiryDate': vehicle.documents?.insurance?.expiryDate ? vehicle.documents.insurance.expiryDate.split('T')[0] : '',
        'documents.registration.expiryDate': vehicle.documents?.registration?.expiryDate ? vehicle.documents.registration.expiryDate.split('T')[0] : '',
        'maintenanceSchedule.oilChange.intervalKm': vehicle.maintenanceSchedule?.oilChange?.intervalKm || 5000,
        notes: vehicle.notes
      });
    } else {
      // Al crear un nuevo vehículo, usar el primer tipo disponible para el usuario
      const defaultType = vehicleTypes.length > 0 ? vehicleTypes[0].value : 'Coche';
      reset({
        type: defaultType,
        'engine.type': 'gasolina',
        transmission: 'manual',
        'odometer.current': 0,
        'maintenanceSchedule.oilChange.intervalKm': 5000
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingVehicle(null);
    reset();
  };

  const handleMenuOpen = (event, vehicle) => {
    setAnchorEl(event.currentTarget);
    setSelectedVehicle(vehicle);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedVehicle(null);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    setAnchorEl(null);
  };

  const confirmDelete = () => {
    if (selectedVehicle) {
      deleteVehicleMutation.mutate(selectedVehicle.id);
    }
  };

  const handleUpdateMileage = () => {
    resetMileage({ currentMileage: selectedVehicle.odometer?.current || 0 });
    setMileageDialogOpen(true);
    handleMenuClose();
  };

  const handleViewAlerts = () => {
    setAlertsDialogOpen(true);
    handleMenuClose();
  };

  const handleViewDetails = () => {
    setDetailsDialogOpen(true);
    setAnchorEl(null); // Solo cerrar el menú sin limpiar selectedVehicle
  };

  const handleViewMaintenanceHistory = async () => {
    setMaintenanceHistoryDialogOpen(true);
    handleMenuClose();
    
    if (selectedVehicle) {
      await loadMaintenanceHistory(selectedVehicle.id);
    }
  };

  const loadMaintenanceHistory = async (vehicleId) => {
    try {
      const response = await api.get(`/maintenance?vehicle=${vehicleId}&limit=20`);
      setMaintenanceHistory(response.data.maintenances || []);
    } catch (error) {
      console.error('Error al cargar historial de mantenimiento:', error);
      toast.error('Error al cargar historial de mantenimiento');
    }
  };

  const handleViewDocuments = async () => {
    setDocumentsDialogOpen(true);
    handleMenuClose();
    
    if (selectedVehicle) {
      await loadVehicleDocuments(selectedVehicle.id);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    try {
      // Validar archivos
      files.forEach(file => {
        if (!documentService.validateFileType(file.name)) {
          throw new Error(`Tipo de archivo no válido: ${file.name}`);
        }
        if (!documentService.validateFileSize(file, 10)) {
          throw new Error(`Archivo muy grande: ${file.name} (máximo 10MB)`);
        }
      });
      
      setUploadingFile(true);
      
      // Subir múltiples documentos
      if (selectedVehicle) {
        const uploadResults = await documentService.uploadVehicleDocuments(
          selectedVehicle.id, 
          files,
          (progress) => {
            // Aquí podrías mostrar el progreso si quisieras
            console.log(`Progreso de subida: ${progress}%`);
          }
        );
        
        toast.success(`${uploadResults.length} documento(s) subido(s) exitosamente`);
        
        // Recargar documentos
        await loadVehicleDocuments(selectedVehicle.id);
      }
      
    } catch (error) {
      toast.error(error.message || 'Error al subir archivo(s)');
    } finally {
      setUploadingFile(false);
      // Limpiar input
      event.target.value = '';
    }
  };

  const loadVehicleDocuments = async (vehicleId) => {
    try {
      const documents = await documentService.getDocuments(vehicleId);
      setVehicleDocuments(documents);
    } catch (error) {
      console.error('Error al cargar documentos:', error);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!selectedVehicle) return;
    
    try {
      await documentService.deleteDocument(selectedVehicle.id, documentId);
      toast.success('Documento eliminado exitosamente');
      await loadVehicleDocuments(selectedVehicle.id);
    } catch (error) {
      toast.error(error.message || 'Error al eliminar documento');
    }
  };

  const handleDownloadDocument = async (document) => {
    try {
      await documentService.downloadDocument(document.url, document.name);
      toast.success('Descarga iniciada');
    } catch (error) {
      toast.error('Error al descargar el documento');
    }
  };

  const onSubmit = (data) => {
    // Validar acceso al tipo de vehículo antes de enviar (excepto super_admin)
    if (user?.role !== 'super_admin' && user?.vehicleTypeAccess && user.vehicleTypeAccess.length > 0) {
      if (!user.vehicleTypeAccess.includes(data.type)) {
        toast.error('No tienes acceso para crear/editar vehículos de este tipo');
        return;
      }
    }

    const vehicleData = {
      plateNumber: data.plateNumber,
      vin: data.vin || undefined,
      company: data.company || user?.companyId,
      branch: data.branch || undefined,
      make: data.make,
      model: data.model,
      year: parseInt(data.year),
      color: data.color || '',
      vehicleType: data.type,
      category: data.category || 'particular',
      fuelCapacity: data.fuelCapacity ? parseFloat(data.fuelCapacity) : undefined,
      transmission: data.transmission || 'manual',
      purchaseDate: data.purchaseDate || undefined,
      odometer: {
        current: parseInt(data['odometer.current']) || 0,
        unit: 'km'
      },
      engine: {
        type: data['engine.type'] || 'gasolina',
        displacement: data['engine.displacement'] || undefined,
        power: data['engine.power'] || undefined
      },
      owner: {
        name: data['owner.name'] || '',
        contact: data['owner.contact'] || '',
        type: data['owner.type'] || 'empresa'
      },
      documents: {
        insurance: {
          policyNumber: data['documents.insurance.policyNumber'] || '',
          company: data['documents.insurance.company'] || '',
          expiryDate: data['documents.insurance.expiryDate'] || undefined
        },
        registration: {
          number: data['documents.registration.number'] || '',
          expiryDate: data['documents.registration.expiryDate'] || undefined
        }
      },
      maintenanceSchedule: {
        oilChange: {
          intervalKm: parseInt(data['maintenanceSchedule.oilChange.intervalKm']) || 5000,
          intervalMonths: 6,
          lastKm: parseInt(data['maintenanceSchedule.oilChange.lastKm']) || 0
        },
        inspection: {
          intervalMonths: parseInt(data['maintenanceSchedule.inspection.intervalMonths']) || 12,
          lastInspectionDate: data['maintenanceSchedule.inspection.lastInspectionDate'] || undefined
        }
      },
      costs: {
        purchase: parseFloat(data['costs.purchase']) || 0,
        maintenance: parseFloat(data['costs.maintenance']) || 0,
        fuel: parseFloat(data['costs.fuel']) || 0
      },
      notes: data.notes || '',
      status: data.status || 'activo',
      condition: data.condition || 'bueno'
    };
    
    // Limpiar campos vacíos
    Object.keys(vehicleData).forEach(key => {
      if (vehicleData[key] === '' || vehicleData[key] === undefined) {
        delete vehicleData[key];
      }
    });
    
    saveVehicleMutation.mutate(vehicleData);
  };

  const onSubmitMileage = (data) => {
    updateMileageMutation.mutate({
      currentMileage: parseInt(data.currentMileage),
      notes: data.notes
    });
  };

  // Funciones para manejo de fotos
  const handlePhotoUpload = async (files) => {
    if (!selectedVehicle || !files.length) return;
    
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('photos', file);
      });
      
      const response = await api.post(`/vehicles/${selectedVehicle.id}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setVehiclePhotos(response.data.photos || []);
      toast.success('Fotos subidas correctamente');
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Error al subir las fotos');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!selectedVehicle) return;
    
    try {
      await api.delete(`/vehicles/${selectedVehicle.id}/photos/${photoId}`);
      setVehiclePhotos(prev => prev.filter(photo => photo.id !== photoId));
      toast.success('Foto eliminada correctamente');
    } catch (error) {
       console.error('Error deleting photo:', error);
       toast.error('Error al eliminar la foto');
     }
   };

  const filteredVehicles = vehiclesData?.vehicles || [];
  const totalCount = vehiclesData?.total || 0;

  // Todos los tipos de vehículos disponibles (deben coincidir con el modelo Vehicle.js)
  const allVehicleTypes = [
    { value: 'Coche', label: 'Coche' },
    { value: 'Furgoneta', label: 'Furgoneta' },
    { value: 'Camión', label: 'Camión' },
    { value: 'Motocicleta', label: 'Motocicleta' },
    { value: 'Tractor', label: 'Tractor' },
    { value: 'Remolque', label: 'Remolque' },
    { value: 'Maquinaria', label: 'Maquinaria' },
    { value: 'Otro', label: 'Otro' }
  ];

  // Filtrar tipos de vehículos según permisos del usuario (excepto super_admin)
  const vehicleTypes = user?.role === 'super_admin' || !user?.vehicleTypeAccess || user.vehicleTypeAccess.length === 0
    ? allVehicleTypes // Super admin o sin restricciones: mostrar todos
    : allVehicleTypes.filter(type => user.vehicleTypeAccess.includes(type.value)); // Filtrar según permisos

  const fuelTypes = [
    { value: 'gasolina', label: 'Gasolina' },
    { value: 'diesel', label: 'Diésel' },
    { value: 'electrico', label: 'Eléctrico' },
    { value: 'hibrido', label: 'Híbrido' },
    { value: 'gas_natural', label: 'Gas Natural' },
    { value: 'gas_lp', label: 'Gas LP' }
  ];

  const transmissionTypes = [
    { value: 'manual', label: 'Manual' },
    { value: 'automatica', label: 'Automática' },
    { value: 'cvt', label: 'CVT' },
    { value: 'dsg', label: 'DSG' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'activo': return 'success';
      case 'mantenimiento': return 'warning';
      case 'inactivo': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'activo': return <CheckCircle />;
      case 'mantenimiento': return <Build />;
      case 'inactivo': return <Error />;
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

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Gestión de Vehículos
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Administra la flota de vehículos y su mantenimiento
          </Typography>
        </Box>
        {hasPermission('vehicles', 'create') && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Nuevo Vehículo
          </Button>
        )}
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder="Buscar vehículos..."
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
                <InputLabel>Delegación</InputLabel>
                <Select
                  value={filterBranch}
                  label="Delegación"
                  onChange={(e) => setFilterBranch(e.target.value)}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {branchesData?.map((branch) => (
                    <MenuItem key={branch.id} value={branch.id}>
                      {branch.name}
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
                  {vehicleTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
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
                  <MenuItem value="activo">Activos</MenuItem>
                  <MenuItem value="mantenimiento">En Mantenimiento</MenuItem>
                  <MenuItem value="inactivo">Inactivos</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
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

      {/* Tabla de vehículos */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vehículo</TableCell>
                <TableCell>Delegación</TableCell>
                <TableCell>Kilometraje</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Condición</TableCell>
                <TableCell>Alertas</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredVehicles.map((vehicle) => {
                const alertCount = (vehicle.alerts?.length || 0);
                const serviceProgress = vehicle.maintenanceSchedule?.oilChange?.intervalKm > 0 
                  ? Math.min((vehicle.odometer?.current / vehicle.maintenanceSchedule.oilChange.intervalKm) * 100, 100)
                  : 0;
                
                return (
                  <TableRow key={vehicle.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          <DirectionsCar />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {vehicle.plateNumber}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {vehicle.make} {vehicle.model} ({vehicle.year})
                          </Typography>
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            {vehicleTypes.find(t => t.value === vehicle.vehicleType)?.label}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocationOn sx={{ fontSize: 16, mr: 0.5 }} />
                        <Typography variant="body2">
                          {vehicle.branch?.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <Speed sx={{ fontSize: 16, mr: 0.5 }} />
                          {vehicle.odometer?.current?.toLocaleString()} km
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={serviceProgress}
                            sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                            color={serviceProgress > 90 ? 'error' : serviceProgress > 70 ? 'warning' : 'primary'}
                          />
                          <Typography variant="caption">
                            {Math.round(serviceProgress)}%
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Próximo servicio: {vehicle.maintenanceSchedule?.oilChange?.intervalKm?.toLocaleString()} km
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(vehicle.status)}
                        label={vehicle.status === 'activo' ? 'Activo' : 
                               vehicle.status === 'mantenimiento' ? 'Mantenimiento' : 'Inactivo'}
                        color={getStatusColor(vehicle.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={vehicle.condition === 'excellent' ? 'Excelente' :
                               vehicle.condition === 'good' ? 'Buena' :
                               vehicle.condition === 'fair' ? 'Regular' : 'Mala'}
                        color={getConditionColor(vehicle.condition)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {alertCount > 0 ? (
                          <Badge badgeContent={alertCount} color="error">
                            <Warning color="warning" />
                          </Badge>
                        ) : (
                          <CheckCircle color="success" />
                        )}
                        <Typography variant="caption" sx={{ ml: 1 }}>
                          {alertCount > 0 ? `${alertCount} alertas` : 'Sin alertas'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, vehicle)}
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

      {/* Menú de acciones */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {hasPermission('vehicles', 'read') && (
          <MenuItem onClick={handleViewDetails}>
            <ListItemIcon>
              <Visibility fontSize="small" />
            </ListItemIcon>
            <ListItemText>Ver Detalles</ListItemText>
          </MenuItem>
        )}
        {hasPermission('vehicles', 'update') && (
          <MenuItem onClick={() => { handleOpenDialog(selectedVehicle); handleMenuClose(); }}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        )}
        {hasPermission('vehicles', 'update') && (
          <MenuItem onClick={handleUpdateMileage}>
            <ListItemIcon>
              <Speed fontSize="small" />
            </ListItemIcon>
            <ListItemText>Actualizar Kilometraje</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleViewAlerts}>
          <ListItemIcon>
            <Warning fontSize="small" />
          </ListItemIcon>
          <ListItemText>Ver Alertas</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleViewMaintenanceHistory}>
          <ListItemIcon>
            <History fontSize="small" />
          </ListItemIcon>
          <ListItemText>Historial de Mantenimiento</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleViewDocuments}>
          <ListItemIcon>
            <Assignment fontSize="small" />
          </ListItemIcon>
          <ListItemText>Gestionar Documentos</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { navigate(`/vehicles/${selectedVehicle?.id}/fuel`); handleMenuClose(); }}>
          <ListItemIcon>
            <LocalGasStation fontSize="small" />
          </ListItemIcon>
          <ListItemText>Gestión de Combustible</ListItemText>
        </MenuItem>
        <Divider />
        {hasPermission('vehicles', 'delete') && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Delete fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Eliminar</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Dialog de crear/editar vehículo */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingVehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab label="Información Básica" />
                <Tab label="Especificaciones" />
                <Tab label="Documentos" />
              </Tabs>
            </Box>
            
            {/* Tab 0: Información Básica */}
            {tabValue === 0 && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Matrícula"
                    {...register('plateNumber', { required: 'La matrícula es requerida' })}
                    error={!!errors.plateNumber}
                    helperText={errors.plateNumber?.message}
                    inputProps={{ style: { textTransform: 'uppercase' } }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Número de Bastidor (VIN)"
                    {...register('vin', { required: 'El VIN es requerido' })}
                    error={!!errors.vin}
                    helperText={errors.vin?.message}
                    inputProps={{ style: { textTransform: 'uppercase' } }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Marca"
                    {...register('make', { required: 'La marca es requerida' })}
                    error={!!errors.make}
                    helperText={errors.make?.message}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Modelo"
                    {...register('model', { required: 'El modelo es requerido' })}
                    error={!!errors.model}
                    helperText={errors.model?.message}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Año"
                    type="number"
                    {...register('year', { required: 'El año es requerido', min: 1900, max: new Date().getFullYear() + 1 })}
                    error={!!errors.year}
                    helperText={errors.year?.message}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="type"
                    control={control}
                    rules={{ 
                      required: 'El tipo es requerido',
                      validate: (value) => {
                        // Validar que el usuario tenga acceso al tipo de vehículo seleccionado (excepto super_admin)
                        if (user?.role !== 'super_admin' && user?.vehicleTypeAccess && user.vehicleTypeAccess.length > 0) {
                          if (!user.vehicleTypeAccess.includes(value)) {
                            return 'No tienes acceso a este tipo de vehículo';
                          }
                        }
                        return true;
                      }
                    }}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.type}>
                        <InputLabel>Tipo de Vehículo</InputLabel>
                        <Select {...field} label="Tipo de Vehículo">
                          {vehicleTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.type && (
                          <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                            {errors.type.message}
                          </Typography>
                        )}
                        {user?.vehicleTypeAccess && user.vehicleTypeAccess.length > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
                            Solo puedes crear vehículos de los tipos autorizados para tu usuario
                          </Typography>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Color"
                    {...register('color')}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="branch"
                    control={control}
                    rules={{ required: 'La delegación es requerida' }}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.branch}>
                        <InputLabel>Delegación *</InputLabel>
                        <Select {...field} label="Delegación *" value={field.value || ''}>
                          <MenuItem value="" disabled>
                            Selecciona una delegación
                          </MenuItem>
                          {branchesData?.map((branch) => (
                            <MenuItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.branch && (
                          <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                            {errors.branch.message}
                          </Typography>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="ownership.type"
                    control={control}
                    rules={{ required: 'El tipo de propiedad es requerido' }}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.ownership?.type}>
                        <InputLabel>Tipo de Propiedad</InputLabel>
                        <Select {...field} label="Tipo de Propiedad">
                          <MenuItem value="owned">Propio</MenuItem>
                          <MenuItem value="rented">Alquilado</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                {watch('ownership.type') === 'rented' && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Precio Mensual de Alquiler"
                      type="number"
                      {...register('ownership.monthlyPrice', { required: 'El precio mensual es requerido para vehículos alquilados', min: 0 })}
                      error={!!errors.ownership?.monthlyPrice}
                      helperText={errors.ownership?.monthlyPrice?.message}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">€</InputAdornment>
                      }}
                    />
                  </Grid>
                )}
              </Grid>
            )}
            
            {/* Tab 1: Especificaciones */}
            {tabValue === 1 && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    🔧 Especificaciones Técnicas
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Información técnica y características del vehículo
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Capacidad de Combustible (L)"
                    type="number"
                    {...register('fuelCapacity')}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Número de Llaves"
                    type="number"
                    {...register('specifications.numberOfKeys', { min: 0 })}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">llaves</InputAdornment>
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Código de Radio"
                    {...register('specifications.radioCode')}
                    placeholder="Ej: 1234"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="engine.type"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Tipo de Motor</InputLabel>
                        <Select {...field} label="Tipo de Motor">
                          {fuelTypes.map((fuel) => (
                            <MenuItem key={fuel.value} value={fuel.value}>
                              {fuel.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="transmission"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Transmisión</InputLabel>
                        <Select {...field} label="Transmisión">
                          {transmissionTypes.map((trans) => (
                            <MenuItem key={trans.value} value={trans.value}>
                              {trans.label}
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
                    label="Fecha de Compra"
                    type="date"
                    {...register('purchaseDate')}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Kilometraje Actual"
                    type="number"
                    {...register('odometer.current', { required: 'El kilometraje es requerido', min: 0 })}
                    error={!!errors.odometer?.current}
                    helperText={errors.odometer?.current?.message}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">km</InputAdornment>
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Próximo Servicio (km)"
                    type="number"
                    {...register('maintenanceSchedule.oilChange.intervalKm', { min: 0 })}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">km</InputAdornment>
                    }}
                  />
                </Grid>
                
                {/* Divisor */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>
                
                {/* Sección de Seguros e ITV */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    📋 Seguros e ITV
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Información sobre seguros e inspección técnica
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Vencimiento de Seguro"
                    type="date"
                    {...register('specifications.insurance.expiryDate')}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Vencimiento de ITV"
                    type="date"
                    {...register('specifications.itv.expiryDate')}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Número de Póliza de Seguro"
                    {...register('specifications.insurance.policyNumber')}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Compañía de Seguros"
                    {...register('specifications.insurance.company')}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Centro de ITV"
                    {...register('specifications.itv.center')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notas"
                    multiline
                    rows={3}
                    {...register('specifications.notes')}
                    placeholder="Información adicional sobre el vehículo..."
                  />
                </Grid>
              </Grid>
            )}
            
            {/* Tab 2: Documentos Unificado */}
            {tabValue === 2 && (
              <Grid container spacing={3} sx={{ mt: 1 }}>
                {/* Sección de Información Documental */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    📄 Información Documental
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Gestiona la información legal y administrativa del vehículo
                  </Typography>
                </Grid>
                {/* Sección de Fotos */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    📸 Fotos del Vehículo
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Sube fotos del vehículo para documentación visual
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'grey.300',
                      borderRadius: 2,
                      p: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover'
                      }
                    }}
                    onClick={() => document.getElementById('photo-upload').click()}
                  >
                    <input
                      id="photo-upload"
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.webp"
                      style={{ display: 'none' }}
                      onChange={handlePhotoUpload}
                    />
                    <DirectionsCar sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                    <Typography variant="h6" gutterBottom>
                      Arrastra fotos aquí o haz clic para seleccionar
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Formatos soportados: JPG, PNG, WEBP
                    </Typography>
                  </Box>
                </Grid>
                {uploadingPhoto && (
                   <Grid item xs={12}>
                     <Alert severity="info">
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                         <Typography>Subiendo foto...</Typography>
                         <LinearProgress sx={{ flexGrow: 1 }} />
                       </Box>
                     </Alert>
                   </Grid>
                 )}
                 <Grid item xs={12}>
                   <Typography variant="subtitle1" gutterBottom>
                     Fotos Existentes
                   </Typography>
                   {vehiclePhotos.length > 0 ? (
                     <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                       {vehiclePhotos.map((photo, index) => (
                         <Card key={photo.id || index} sx={{ width: 200 }}>
                           <Box sx={{ position: 'relative' }}>
                             <img
                               src={photo.url}
                               alt={photo.name}
                               style={{
                                 width: '100%',
                                 height: 150,
                                 objectFit: 'cover'
                               }}
                             />
                             <IconButton
                               size="small"
                               onClick={() => handleDeletePhoto(photo.id)}
                               sx={{
                                 position: 'absolute',
                                 top: 8,
                                 right: 8,
                                 bgcolor: 'rgba(255,255,255,0.8)',
                                 '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                               }}
                               color="error"
                             >
                               <Delete fontSize="small" />
                             </IconButton>
                           </Box>
                           <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                             <Typography variant="caption" color="text.secondary">
                               {photo.name}
                             </Typography>
                           </CardContent>
                         </Card>
                       ))}
                     </Box>
                   ) : (
                     <Alert severity="info">
                       No hay fotos subidas para este vehículo.
                     </Alert>
                   )}
                 </Grid>
                
                {/* Divisor */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>
                
                {/* Sección de Gestión de Archivos */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    📁 Gestión de Archivos
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Sube y gestiona documentos digitales relacionados con el vehículo
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'grey.300',
                      borderRadius: 2,
                      p: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover'
                      }
                    }}
                    onClick={() => document.getElementById('file-upload').click()}
                  >
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    <Assignment sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                    <Typography variant="h6" gutterBottom>
                      Arrastra archivos aquí o haz clic para seleccionar
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Formatos soportados: PDF, DOC, DOCX, JPG, PNG
                    </Typography>
                  </Box>
                </Grid>
                {uploadingFile && (
                   <Grid item xs={12}>
                     <Alert severity="info">
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                         <Typography>Subiendo archivo...</Typography>
                         <LinearProgress sx={{ flexGrow: 1 }} />
                       </Box>
                     </Alert>
                   </Grid>
                 )}
                 <Grid item xs={12}>
                   <Typography variant="subtitle1" gutterBottom>
                     Archivos Existentes
                   </Typography>
                   {vehicleDocuments.length > 0 ? (
                     <Box sx={{ mt: 1 }}>
                       {vehicleDocuments.map((doc, index) => (
                         <Card key={doc.id || index} sx={{ mb: 1 }}>
                           <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                               <Box>
                                 <Typography variant="body2" fontWeight="medium">
                                   {doc.name}
                                 </Typography>
                                 <Typography variant="caption" color="text.secondary">
                                   Subido el {new Date(doc.uploadDate).toLocaleDateString()}
                                 </Typography>
                               </Box>
                               <Box sx={{ display: 'flex', gap: 1 }}>
                                 <IconButton
                                   size="small"
                                   onClick={() => window.open(doc.url, '_blank')}
                                   title="Ver documento"
                                 >
                                   <Visibility fontSize="small" />
                                 </IconButton>
                                 <IconButton
                                   size="small"
                                   onClick={() => handleDeleteDocument(doc.id)}
                                   title="Eliminar documento"
                                   color="error"
                                 >
                                   <Delete fontSize="small" />
                                 </IconButton>
                               </Box>
                             </Box>
                           </CardContent>
                         </Card>
                       ))}
                     </Box>
                   ) : (
                     <Alert severity="info">
                       No hay documentos subidos para este vehículo.
                     </Alert>
                   )}
                 </Grid>
              </Grid>
            )}
            
            {/* Tab 3: Archivos */}
            {tabValue === 3 && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Gestión de Archivos
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Sube y gestiona documentos relacionados con el vehículo
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'grey.300',
                      borderRadius: 2,
                      p: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover'
                      }
                    }}
                    onClick={() => document.getElementById('file-upload').click()}
                  >
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    <Assignment sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                    <Typography variant="h6" gutterBottom>
                      Arrastra archivos aquí o haz clic para seleccionar
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Formatos soportados: PDF, DOC, DOCX, JPG, PNG
                    </Typography>
                  </Box>
                </Grid>
                {uploadingFile && (
                   <Grid item xs={12}>
                     <Alert severity="info">
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                         <Typography>Subiendo archivo...</Typography>
                         <LinearProgress sx={{ flexGrow: 1 }} />
                       </Box>
                     </Alert>
                   </Grid>
                 )}
                 <Grid item xs={12}>
                   <Typography variant="subtitle1" gutterBottom>
                     Archivos Existentes
                   </Typography>
                   {vehicleDocuments.length > 0 ? (
                     <Box sx={{ mt: 1 }}>
                       {vehicleDocuments.map((doc, index) => (
                         <Card key={doc.id || index} sx={{ mb: 1 }}>
                           <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                               <Box>
                                 <Typography variant="body2" fontWeight="medium">
                                   {doc.name}
                                 </Typography>
                                 <Typography variant="caption" color="text.secondary">
                                   Subido el {new Date(doc.uploadDate).toLocaleDateString()}
                                 </Typography>
                               </Box>
                               <Box sx={{ display: 'flex', gap: 1 }}>
                                 <IconButton
                                   size="small"
                                   onClick={() => window.open(doc.url, '_blank')}
                                   title="Ver documento"
                                 >
                                   <Visibility fontSize="small" />
                                 </IconButton>
                                 <IconButton
                                   size="small"
                                   onClick={() => handleDeleteDocument(doc.id)}
                                   title="Eliminar documento"
                                   color="error"
                                 >
                                   <Delete fontSize="small" />
                                 </IconButton>
                               </Box>
                             </Box>
                           </CardContent>
                         </Card>
                       ))}
                     </Box>
                   ) : (
                     <Alert severity="info">
                       No hay documentos subidos para este vehículo.
                     </Alert>
                   )}
                 </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={saveVehicleMutation.isPending}
            >
              {saveVehicleMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog de actualizar kilometraje */}
      <Dialog open={mileageDialogOpen} onClose={() => setMileageDialogOpen(false)}>
        <form onSubmit={handleSubmitMileage(onSubmitMileage)}>
          <DialogTitle>Actualizar Kilometraje</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Kilometraje Actual"
                  type="number"
                  {...registerMileage('currentMileage', { 
                    required: 'El kilometraje es requerido', 
                    min: { value: selectedVehicle?.currentMileage || 0, message: 'No puede ser menor al kilometraje actual' }
                  })}
                  error={!!mileageErrors.currentMileage}
                  helperText={mileageErrors.currentMileage?.message || `Kilometraje actual: ${selectedVehicle?.currentMileage?.toLocaleString()} km`}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">km</InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notas (opcional)"
                  multiline
                  rows={2}
                  {...registerMileage('notes')}
                  placeholder="Ej: Actualización por mantenimiento, viaje, etc."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMileageDialogOpen(false)}>Cancelar</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={updateMileageMutation.isPending}
            >
              {updateMileageMutation.isPending ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog de alertas */}
      <Dialog open={alertsDialogOpen} onClose={() => setAlertsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Alertas de {selectedVehicle?.licensePlate}
        </DialogTitle>
        <DialogContent>
          {alertsData?.alerts?.length > 0 ? (
            <Box sx={{ mt: 1 }}>
              {alertsData.alerts.map((alert, index) => (
                <Alert 
                  key={index} 
                  severity={alert.priority === 'high' ? 'error' : alert.priority === 'medium' ? 'warning' : 'info'}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="subtitle2">{alert.title}</Typography>
                  <Typography variant="body2">{alert.message}</Typography>
                  {alert.dueDate && (
                    <Typography variant="caption" color="text.secondary">
                      Vence: {new Date(alert.dueDate).toLocaleDateString()}
                    </Typography>
                  )}
                </Alert>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h6">Sin alertas</Typography>
              <Typography color="text.secondary">
                Este vehículo no tiene alertas pendientes
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertsDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta acción no se puede deshacer.
          </Alert>
          <Typography>
            ¿Estás seguro de que deseas eliminar el vehículo <strong>{selectedVehicle?.licensePlate}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={deleteVehicleMutation.isPending}
          >
            {deleteVehicleMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de detalles del vehículo */}
      <Dialog open={detailsDialogOpen} onClose={() => { setDetailsDialogOpen(false); setSelectedVehicle(null); }} maxWidth="md" fullWidth>
        <DialogTitle>
          Detalles del Vehículo - {selectedVehicle?.plateNumber}
        </DialogTitle>
        <DialogContent>
          {selectedVehicle && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Información Básica</Typography>
                <Typography><strong>Placa:</strong> {selectedVehicle.plateNumber}</Typography>
                <Typography><strong>VIN:</strong> {selectedVehicle.vin || 'No especificado'}</Typography>
                <Typography><strong>Marca:</strong> {selectedVehicle.make}</Typography>
                <Typography><strong>Modelo:</strong> {selectedVehicle.model}</Typography>
                <Typography><strong>Año:</strong> {selectedVehicle.year}</Typography>
                <Typography><strong>Color:</strong> {selectedVehicle.color || 'No especificado'}</Typography>
                <Typography><strong>Tipo:</strong> {selectedVehicle.vehicleType}</Typography>
                <Typography><strong>Delegación:</strong> {selectedVehicle.branch?.name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Especificaciones Técnicas</Typography>
                <Typography><strong>Motor:</strong> {selectedVehicle.engine?.type || 'No especificado'}</Typography>
                <Typography><strong>Transmisión:</strong> {selectedVehicle.transmission || 'No especificado'}</Typography>
                <Typography><strong>Kilometraje:</strong> {selectedVehicle.odometer?.current?.toLocaleString() || 0} km</Typography>
                <Typography><strong>Estado:</strong> {selectedVehicle.status === 'activo' ? 'Activo' : selectedVehicle.status === 'mantenimiento' ? 'En Mantenimiento' : 'Inactivo'}</Typography>
                <Typography><strong>Condición:</strong> {selectedVehicle.condition === 'excellent' ? 'Excelente' : selectedVehicle.condition === 'good' ? 'Buena' : selectedVehicle.condition === 'fair' ? 'Regular' : 'Mala'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Documentos</Typography>
                <Typography><strong>Seguro - Póliza:</strong> {selectedVehicle.documents?.insurance?.policyNumber || 'No especificado'}</Typography>
                <Typography><strong>Seguro - Compañía:</strong> {selectedVehicle.documents?.insurance?.company || 'No especificado'}</Typography>
                <Typography><strong>Seguro - Vencimiento:</strong> {selectedVehicle.documents?.insurance?.expiryDate ? new Date(selectedVehicle.documents.insurance.expiryDate).toLocaleDateString() : 'No especificado'}</Typography>
                <Typography><strong>Registro:</strong> {selectedVehicle.documents?.registration?.number || 'No especificado'}</Typography>
                <Typography><strong>Registro - Vencimiento:</strong> {selectedVehicle.documents?.registration?.expiryDate ? new Date(selectedVehicle.documents.registration.expiryDate).toLocaleDateString() : 'No especificado'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Mantenimiento</Typography>
                <Typography><strong>Cambio de Aceite - Intervalo:</strong> {selectedVehicle.maintenanceSchedule?.oilChange?.intervalKm?.toLocaleString() || 'No especificado'} km</Typography>
                <Typography><strong>Cambio de Aceite - Último:</strong> {selectedVehicle.maintenanceSchedule?.oilChange?.lastKm?.toLocaleString() || 'No especificado'} km</Typography>
                <Typography><strong>Inspección - Intervalo:</strong> {selectedVehicle.maintenanceSchedule?.inspection?.intervalMonths || 'No especificado'} meses</Typography>
              </Grid>
              {selectedVehicle.notes && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Notas</Typography>
                  <Typography>{selectedVehicle.notes}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de historial de mantenimiento */}
      <Dialog open={maintenanceHistoryDialogOpen} onClose={() => setMaintenanceHistoryDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Historial de Mantenimiento - {selectedVehicle?.plateNumber}
        </DialogTitle>
        <DialogContent>
          {maintenanceHistory.length > 0 ? (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Orden de Trabajo</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Prioridad</TableCell>
                    <TableCell>Fecha Programada</TableCell>
                    <TableCell>Asignado a</TableCell>
                    <TableCell>Descripción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {maintenanceHistory.map((maintenance) => (
                    <TableRow key={maintenance.id}>
                      <TableCell>{maintenance.workOrderNumber}</TableCell>
                      <TableCell>
                        <Chip
                          label={maintenance.type}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={maintenance.status}
                          size="small"
                          color={
                            maintenance.status === 'completado' ? 'success' :
                            maintenance.status === 'en_proceso' ? 'warning' :
                            maintenance.status === 'programado' ? 'info' :
                            'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={maintenance.priority}
                          size="small"
                          color={
                            maintenance.priority === 'critica' ? 'error' :
                            maintenance.priority === 'alta' ? 'warning' :
                            maintenance.priority === 'media' ? 'info' :
                            'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(maintenance.scheduledDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {maintenance.assignedTo ? 
                          `${maintenance.assignedTo.name} ${maintenance.assignedTo.lastName}` : 
                          'No asignado'
                        }
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {maintenance.description}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              No hay historial de mantenimiento para este vehículo.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMaintenanceHistoryDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de gestión de documentos */}
      <Dialog open={documentsDialogOpen} onClose={() => setDocumentsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Gestión de Documentos - {selectedVehicle?.plateNumber}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Subir Nuevo Documento
              </Typography>
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: 'grey.300',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  mb: 3,
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover'
                  }
                }}
                onClick={() => document.getElementById('document-upload').click()}
              >
                <input
                  id="document-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                <Assignment sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Seleccionar documentos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  PDF, DOC, DOCX, JPG, PNG (máx. 10MB)
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
               <Typography variant="h6" gutterBottom>
                 Documentos Existentes
               </Typography>
               {uploadingFile && (
                 <Alert severity="info" sx={{ mb: 2 }}>
                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                     <Typography>Subiendo archivo...</Typography>
                     <LinearProgress sx={{ flexGrow: 1 }} />
                   </Box>
                 </Alert>
               )}
               {vehicleDocuments.length > 0 ? (
                 <Box sx={{ mt: 1 }}>
                   {vehicleDocuments.map((doc, index) => (
                     <Card key={doc.id || index} sx={{ mb: 2 }}>
                       <CardContent>
                         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                           <Box sx={{ flexGrow: 1 }}>
                             <Typography variant="h6" gutterBottom>
                               {doc.name}
                             </Typography>
                             <Typography variant="body2" color="text.secondary" gutterBottom>
                               Tipo: {doc.type === 'document' ? 'Documento' : doc.type === 'image' ? 'Imagen' : 'Otro'}
                             </Typography>
                             <Typography variant="caption" color="text.secondary">
                               Subido el {new Date(doc.uploadDate).toLocaleDateString()} a las {new Date(doc.uploadDate).toLocaleTimeString()}
                             </Typography>
                             {doc.uploadedBy && (
                               <Typography variant="caption" color="text.secondary" display="block">
                                 Por: {doc.uploadedBy.name || doc.uploadedBy.email}
                               </Typography>
                             )}
                           </Box>
                           <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                             <Button
                               variant="outlined"
                               size="small"
                               startIcon={<Visibility />}
                               onClick={() => window.open(doc.url, '_blank')}
                             >
                               Ver
                             </Button>
                             <Button
                               variant="outlined"
                               size="small"
                               startIcon={<Download />}
                               onClick={() => handleDownloadDocument(doc)}
                             >
                               Descargar
                             </Button>
                             <Button
                               variant="outlined"
                               size="small"
                               color="error"
                               startIcon={<Delete />}
                               onClick={() => handleDeleteDocument(doc.id)}
                             >
                               Eliminar
                             </Button>
                           </Box>
                         </Box>
                       </CardContent>
                     </Card>
                   ))}
                 </Box>
               ) : (
                 <Alert severity="info">
                   No hay documentos subidos para este vehículo.
                 </Alert>
               )}
             </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentsDialogOpen(false)}>Cerrar</Button>
          <Button variant="contained" disabled>
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Vehicles;