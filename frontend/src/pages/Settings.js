import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Business,
  Notifications,
  Security,
  Backup,
  Email,
  Sms,
  Save,
  Refresh,
  Delete,
  Edit,
  Add,
  ExpandMore,
  Warning,
  Info,
  CheckCircle,
  Error,
  Schedule,
  Storage,
  CloudUpload,
  Download,
  Upload,
  Language,
  Palette,
  AccessTime,
  AttachMoney,
  Build,
  DirectionsCar
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Settings = () => {
  const [tabValue, setTabValue] = useState(0);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDataDialogOpen, setDeleteDataDialogOpen] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState(null);
  const [restoreMode, setRestoreMode] = useState('merge');
  
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

  // Consulta de configuraciones
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await api.get('/settings');
      return response.data;
    },
    enabled: hasPermission('settings', 'read')
  });

  // Consulta de estadísticas del sistema
  const { data: systemStats } = useQuery({
    queryKey: ['system-stats'],
    queryFn: async () => {
      const response = await api.get('/settings/stats');
      return response.data;
    },
    enabled: hasRole('super_admin')
  });

  // Mutación para actualizar configuraciones
  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      return api.put('/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['system-settings']);
      toast.success('Configuraciones actualizadas');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar configuraciones');
    }
  });

  // Mutación para crear backup
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/settings/backup', {}, {
        responseType: 'blob'
      });
      return response;
    },
    onSuccess: (response) => {
      toast.success('Backup creado exitosamente');
      // Descargar el archivo de backup
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setBackupDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al crear backup');
    }
  });

  // Mutación para limpiar datos
  const cleanDataMutation = useMutation({
    mutationFn: async (type) => {
      return api.delete(`/settings/clean/${type}`);
    },
    onSuccess: () => {
      toast.success('Datos limpiados exitosamente');
      queryClient.invalidateQueries(['system-stats']);
      setDeleteDataDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al limpiar datos');
    }
  });

  // Mutación para restaurar backup
  const restoreBackupMutation = useMutation({
    mutationFn: async ({ backupData, mode }) => {
      return api.post('/settings/restore', { backupData, mode });
    },
    onSuccess: (response) => {
      toast.success('Backup restaurado exitosamente');
      queryClient.invalidateQueries(['system-settings']);
      queryClient.invalidateQueries(['system-stats']);
      queryClient.invalidateQueries(['companies']);
      queryClient.invalidateQueries(['branches']);
      queryClient.invalidateQueries(['users']);
      queryClient.invalidateQueries(['vehicles']);
      queryClient.invalidateQueries(['maintenance']);
      setRestoreDialogOpen(false);
      setSelectedBackupFile(null);
      setRestoreMode('merge');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al restaurar backup');
    }
  });

  const onSubmit = (data) => {
    updateSettingsMutation.mutate(data);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle />;
      case 'warning': return <Warning />;
      case 'error': return <Error />;
      default: return <Info />;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Configuraciones del Sistema
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestiona las configuraciones y preferencias del sistema
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => queryClient.invalidateQueries(['system-settings'])}
          >
            Actualizar
          </Button>
          {hasRole('super_admin') && (
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSubmit(onSubmit)}
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab icon={<Business />} label="General" />
          <Tab icon={<Notifications />} label="Notificaciones" />
          <Tab icon={<Security />} label="Seguridad" />
          <Tab icon={<Backup />} label="Respaldo" />
          {hasRole('super_admin') && (
            <Tab icon={<Storage />} label="Sistema" />
          )}
        </Tabs>
      </Box>

      {/* Tab 0: Configuraciones Generales */}
      {tabValue === 0 && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Información de la Empresa
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Nombre de la Empresa"
                        {...register('companyName')}
                        defaultValue={settingsData?.companyName || ''}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Dirección"
                        multiline
                        rows={2}
                        {...register('companyAddress')}
                        defaultValue={settingsData?.companyAddress || ''}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Teléfono"
                        {...register('companyPhone')}
                        defaultValue={settingsData?.companyPhone || ''}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        {...register('companyEmail')}
                        defaultValue={settingsData?.companyEmail || ''}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Configuraciones de Mantenimiento
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Intervalo de Cambio de Aceite (km)"
                        type="number"
                        {...register('oilChangeInterval')}
                        defaultValue={settingsData?.oilChangeInterval || 5000}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Intervalo de Inspección (días)"
                        type="number"
                        {...register('inspectionInterval')}
                        defaultValue={settingsData?.inspectionInterval || 90}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Días de Alerta Anticipada"
                        type="number"
                        {...register('alertDays')}
                        defaultValue={settingsData?.alertDays || 7}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Controller
                            name="autoScheduleMaintenance"
                            control={control}
                            defaultValue={settingsData?.autoScheduleMaintenance || false}
                            render={({ field }) => (
                              <Switch
                                checked={field.value}
                                onChange={field.onChange}
                              />
                            )}
                          />
                        }
                        label="Programar mantenimiento automáticamente"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Configuraciones de la Aplicación
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Controller
                        name="defaultLanguage"
                        control={control}
                        defaultValue={settingsData?.defaultLanguage || 'es'}
                        render={({ field }) => (
                          <FormControl fullWidth>
                            <InputLabel>Idioma por Defecto</InputLabel>
                            <Select {...field} label="Idioma por Defecto">
                              <MenuItem value="es">Español</MenuItem>
                              <MenuItem value="en">English</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Controller
                        name="defaultCurrency"
                        control={control}
                        defaultValue={settingsData?.defaultCurrency || 'EUR'}
                        render={({ field }) => (
                          <FormControl fullWidth>
                            <InputLabel>Moneda por Defecto</InputLabel>
                            <Select {...field} label="Moneda por Defecto">
                              <MenuItem value="EUR">Euro (EUR)</MenuItem>
                              <MenuItem value="USD">Dólar Americano (USD)</MenuItem>
                              <MenuItem value="EUR">Euro (EUR)</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Controller
                        name="defaultTimezone"
                        control={control}
                        defaultValue={settingsData?.defaultTimezone || 'Europe/Madrid'}
                        render={({ field }) => (
                          <FormControl fullWidth>
                            <InputLabel>Zona Horaria</InputLabel>
                            <Select {...field} label="Zona Horaria">
                              <MenuItem value="Europe/Madrid">Madrid (Península)</MenuItem>
                              <MenuItem value="Atlantic/Canary">Canarias</MenuItem>
                              <MenuItem value="America/Cancun">Cancún</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </form>
      )}

      {/* Tab 1: Notificaciones */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configuración de Email
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  La configuración SMTP se gestiona a nivel de sistema por el administrador.
                  Las notificaciones por email se envían automáticamente según la configuración del servidor.
                </Alert>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Tipos de Notificaciones
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Build />
                    </ListItemIcon>
                    <ListItemText
                      primary="Mantenimientos Vencidos"
                      secondary="Notificar cuando un mantenimiento esté vencido"
                    />
                    <ListItemSecondaryAction>
                      <Controller
                        name="notifyOverdueMaintenance"
                        control={control}
                        defaultValue={settingsData?.notifyOverdueMaintenance || true}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <DirectionsCar />
                    </ListItemIcon>
                    <ListItemText
                      primary="Documentos por Vencer"
                      secondary="Alertar sobre documentos de vehículos próximos a vencer"
                    />
                    <ListItemSecondaryAction>
                      <Controller
                        name="notifyDocumentExpiry"
                        control={control}
                        defaultValue={settingsData?.notifyDocumentExpiry || true}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <AttachMoney />
                    </ListItemIcon>
                    <ListItemText
                      primary="Costos Elevados"
                      secondary="Notificar cuando los costos excedan el presupuesto"
                    />
                    <ListItemSecondaryAction>
                      <Controller
                        name="notifyHighCosts"
                        control={control}
                        defaultValue={settingsData?.notifyHighCosts || false}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Seguridad */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Políticas de Contraseña
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Longitud Mínima"
                      type="number"
                      {...register('passwordMinLength')}
                      defaultValue={settingsData?.passwordMinLength || 6}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Días para Expiración"
                      type="number"
                      {...register('passwordExpiryDays')}
                      defaultValue={settingsData?.passwordExpiryDays || 90}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Controller
                          name="requireSpecialChars"
                          control={control}
                          defaultValue={settingsData?.requireSpecialChars || false}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      }
                      label="Requerir caracteres especiales"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Controller
                          name="requireNumbers"
                          control={control}
                          defaultValue={settingsData?.requireNumbers || false}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      }
                      label="Requerir números"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configuraciones de Sesión
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Tiempo de Sesión (minutos)"
                      type="number"
                      {...register('sessionTimeout')}
                      defaultValue={settingsData?.sessionTimeout || 60}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Máximo de Intentos de Login"
                      type="number"
                      {...register('maxLoginAttempts')}
                      defaultValue={settingsData?.maxLoginAttempts || 5}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Controller
                          name="enableTwoFactor"
                          control={control}
                          defaultValue={settingsData?.enableTwoFactor || false}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      }
                      label="Habilitar autenticación de dos factores"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Controller
                          name="logUserActivity"
                          control={control}
                          defaultValue={settingsData?.logUserActivity || true}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      }
                      label="Registrar actividad de usuarios"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Respaldo */}
      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Crear Respaldo
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Crea una copia de seguridad de todos los datos del sistema
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<CloudUpload />}
                  onClick={() => setBackupDialogOpen(true)}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Crear Respaldo
                </Button>
                <Alert severity="info">
                  El respaldo incluirá todos los datos de empresas, delegaciones, vehículos, mantenimientos y usuarios.
                </Alert>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Restaurar Datos
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Restaura los datos desde un archivo de respaldo
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Upload />}
                  onClick={() => setRestoreDialogOpen(true)}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Restaurar desde Archivo
                </Button>
                <Alert severity="warning">
                  La restauración reemplazará todos los datos actuales. Esta acción no se puede deshacer.
                </Alert>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configuración Automática
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Controller
                          name="autoBackup"
                          control={control}
                          defaultValue={settingsData?.autoBackup || false}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      }
                      label="Respaldo Automático"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Controller
                      name="backupFrequency"
                      control={control}
                      defaultValue={settingsData?.backupFrequency || 'weekly'}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Frecuencia</InputLabel>
                          <Select {...field} label="Frecuencia">
                            <MenuItem value="daily">Diario</MenuItem>
                            <MenuItem value="weekly">Semanal</MenuItem>
                            <MenuItem value="monthly">Mensual</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Retener Respaldos (días)"
                      type="number"
                      {...register('backupRetentionDays')}
                      defaultValue={settingsData?.backupRetentionDays || 30}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 4: Sistema (Solo Super Admin) */}
      {tabValue === 4 && hasRole('super_admin') && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Estadísticas del Sistema
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {systemStats?.totalUsers || 0}
                      </Typography>
                      <Typography variant="body2">Usuarios Totales</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {systemStats?.totalVehicles || 0}
                      </Typography>
                      <Typography variant="body2">Vehículos Totales</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {systemStats?.totalMaintenances || 0}
                      </Typography>
                      <Typography variant="body2">Mantenimientos</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main">
                        {formatBytes(systemStats?.databaseSize || 0)}
                      </Typography>
                      <Typography variant="body2">Tamaño BD</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Mantenimiento del Sistema
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Delete color="error" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Limpiar Logs Antiguos"
                      secondary="Eliminar registros de actividad mayores a 90 días"
                    />
                    <ListItemSecondaryAction>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => setDeleteDataDialogOpen(true)}
                      >
                        Limpiar
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemIcon>
                      <Storage color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Optimizar Base de Datos"
                      secondary="Reorganizar y optimizar las tablas de la base de datos"
                    />
                    <ListItemSecondaryAction>
                      <Button variant="outlined" color="warning">
                        Optimizar
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemIcon>
                      <Refresh color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Reiniciar Servicios"
                      secondary="Reiniciar los servicios del sistema"
                    />
                    <ListItemSecondaryAction>
                      <Button variant="outlined" color="info">
                        Reiniciar
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Dialog de crear backup */}
      <Dialog open={backupDialogOpen} onClose={() => setBackupDialogOpen(false)}>
        <DialogTitle>Crear Respaldo</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Se creará un archivo de respaldo con todos los datos del sistema.
          </Alert>
          <Typography variant="body2">
            El proceso puede tomar varios minutos dependiendo del tamaño de los datos.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={() => createBackupMutation.mutate()} 
            variant="contained"
            disabled={createBackupMutation.isPending}
          >
            {createBackupMutation.isPending ? 'Creando...' : 'Crear Respaldo'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de restaurar backup */}
      <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Restaurar desde Respaldo</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            La restauración reemplazará todos los datos actuales. Esta acción no se puede deshacer.
          </Alert>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Seleccionar archivo de respaldo
            </Typography>
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const backupData = JSON.parse(event.target.result);
                      setSelectedBackupFile({ file, data: backupData });
                    } catch (error) {
                      toast.error('Archivo de respaldo inválido');
                      e.target.value = '';
                    }
                  };
                  reader.readAsText(file);
                }
              }}
              style={{ display: 'none' }}
              id="backup-file-input"
            />
            <label htmlFor="backup-file-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<Upload />}
                fullWidth
                sx={{ mb: 2 }}
              >
                Seleccionar Archivo
              </Button>
            </label>
            
            {selectedBackupFile && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Archivo seleccionado: {selectedBackupFile.file.name}
                <br />
                Fecha de creación: {selectedBackupFile.data.metadata?.createdAt ? 
                  new Date(selectedBackupFile.data.metadata.createdAt).toLocaleString() : 'No disponible'}
                <br />
                Registros: {Object.entries(selectedBackupFile.data.metadata?.records || {}).map(([key, value]) => 
                  `${key}: ${value}`).join(', ')}
              </Alert>
            )}
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Modo de restauración
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Modo</InputLabel>
              <Select
                value={restoreMode}
                onChange={(e) => setRestoreMode(e.target.value)}
                label="Modo"
              >
                <MenuItem value="merge">Combinar (mantener datos existentes)</MenuItem>
                <MenuItem value="overwrite">Sobrescribir (reemplazar datos existentes)</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            • <strong>Combinar:</strong> Los nuevos datos se agregarán sin eliminar los existentes
            <br />
            • <strong>Sobrescribir:</strong> Los datos existentes serán reemplazados por los del respaldo
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRestoreDialogOpen(false);
            setSelectedBackupFile(null);
            setRestoreMode('merge');
          }}>Cancelar</Button>
          <Button 
            onClick={() => {
              if (selectedBackupFile) {
                restoreBackupMutation.mutate({
                  backupData: selectedBackupFile.data,
                  mode: restoreMode
                });
              }
            }}
            variant="contained"
            color="warning"
            disabled={!selectedBackupFile || restoreBackupMutation.isPending}
          >
            {restoreBackupMutation.isPending ? 'Restaurando...' : 'Restaurar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de limpiar datos */}
      <Dialog open={deleteDataDialogOpen} onClose={() => setDeleteDataDialogOpen(false)}>
        <DialogTitle>Limpiar Datos del Sistema</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta acción eliminará permanentemente los logs antiguos del sistema.
          </Alert>
          <Typography variant="body2">
            Se eliminarán todos los registros de actividad mayores a 90 días.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDataDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={() => cleanDataMutation.mutate('logs')} 
            color="error" 
            variant="contained"
            disabled={cleanDataMutation.isPending}
          >
            {cleanDataMutation.isPending ? 'Limpiando...' : 'Limpiar Datos'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;