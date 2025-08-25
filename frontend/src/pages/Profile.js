import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Avatar,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  Business,
  LocationOn,
  Edit,
  Save,
  Cancel,
  Lock,
  Visibility,
  VisibilityOff,
  History,
  Security,
  Notifications,
  Language,
  Palette,
  AdminPanelSettings,
  Engineering,
  ManageAccounts,
  SupervisorAccount,
  Schedule,
  CheckCircle,
  Warning,
  Error
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const Profile = () => {
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activityPage, setActivityPage] = useState(0);
  const [activityRowsPerPage, setActivityRowsPerPage] = useState(10);
  
  const { user, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || ''
    }
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    watch: watchPassword,
    formState: { errors: passwordErrors }
  } = useForm();

  // Consulta del historial de actividad
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['user-activity', activityPage, activityRowsPerPage],
    queryFn: async () => {
      const response = await axios.get('/users/activity', {
        params: {
          page: activityPage + 1,
          limit: activityRowsPerPage
        }
      });
      return response.data;
    },
    enabled: tabValue === 2
  });

  // Mutación para actualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      return axios.put('/users/profile', data);
    },
    onSuccess: (response) => {
      updateProfile(response.data.user);
      toast.success('Perfil actualizado exitosamente');
      setEditMode(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar perfil');
    }
  });

  // Mutación para cambiar contraseña
  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      return axios.patch('/users/change-password', data);
    },
    onSuccess: () => {
      toast.success('Contraseña actualizada exitosamente');
      setPasswordDialogOpen(false);
      resetPassword();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al cambiar contraseña');
    }
  });

  const handleEditToggle = () => {
    if (editMode) {
      // Cancelar edición
      reset({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || ''
      });
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  };

  const onSubmitProfile = (data) => {
    updateProfileMutation.mutate(data);
  };

  const onSubmitPassword = (data) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    });
  };

  const getRoleInfo = (role) => {
    const roleConfig = {
      super_admin: {
        label: 'Super Administrador',
        icon: <AdminPanelSettings />,
        color: 'error',
        description: 'Acceso completo al sistema'
      },
      admin: {
        label: 'Administrador',
        icon: <ManageAccounts />,
        color: 'warning',
        description: 'Gestión de empresa y delegaciones'
      },
      manager: {
        label: 'Gerente',
        icon: <SupervisorAccount />,
        color: 'info',
        description: 'Supervisión de operaciones'
      },
      mechanic: {
        label: 'Mecánico',
        icon: <Engineering />,
        color: 'success',
        description: 'Ejecución de mantenimientos'
      },
      user: {
        label: 'Usuario',
        icon: <Person />,
        color: 'default',
        description: 'Acceso básico al sistema'
      }
    };
    return roleConfig[role] || roleConfig.user;
  };

  const getActivityIcon = (action) => {
    switch (action) {
      case 'login': return <CheckCircle color="success" />;
      case 'logout': return <Schedule color="info" />;
      case 'create': return <CheckCircle color="primary" />;
      case 'update': return <Edit color="warning" />;
      case 'delete': return <Error color="error" />;
      default: return <History />;
    }
  };

  const getActivityDescription = (activity) => {
    const actions = {
      login: 'Inicio de sesión',
      logout: 'Cierre de sesión',
      create: 'Creación',
      update: 'Actualización',
      delete: 'Eliminación'
    };
    
    const modules = {
      vehicles: 'vehículo',
      maintenance: 'mantenimiento',
      users: 'usuario',
      branches: 'delegación',
      companies: 'empresa'
    };
    
    const action = actions[activity.action] || activity.action;
    const module = modules[activity.module] || activity.module;
    
    if (activity.action === 'login' || activity.action === 'logout') {
      return action;
    }
    
    return `${action} de ${module}`;
  };

  const roleInfo = getRoleInfo(user?.role);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Mi Perfil
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestiona tu información personal y configuración
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {tabValue === 0 && (
            <Button
              variant={editMode ? "outlined" : "contained"}
              startIcon={editMode ? <Cancel /> : <Edit />}
              onClick={handleEditToggle}
            >
              {editMode ? 'Cancelar' : 'Editar'}
            </Button>
          )}
          {tabValue === 0 && editMode && (
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSubmit(onSubmitProfile)}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab icon={<Person />} label="Información Personal" />
          <Tab icon={<Security />} label="Seguridad" />
          <Tab icon={<History />} label="Actividad" />
          <Tab icon={<Notifications />} label="Preferencias" />
        </Tabs>
      </Box>

      {/* Tab 0: Información Personal */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Avatar
                  sx={{ 
                    width: 120, 
                    height: 120, 
                    mx: 'auto', 
                    mb: 2,
                    bgcolor: `${roleInfo.color}.main`,
                    fontSize: '3rem'
                  }}
                >
                  {roleInfo.icon}
                </Avatar>
                <Typography variant="h5" gutterBottom>
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Chip
                  icon={roleInfo.icon}
                  label={roleInfo.label}
                  color={roleInfo.color}
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {roleInfo.description}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Información de la Cuenta
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Person fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="ID de Usuario"
                        secondary={user?._id?.slice(-8)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Schedule fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Miembro desde"
                        secondary={new Date(user?.createdAt).toLocaleDateString()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Último acceso"
                        secondary={user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Nunca'}
                      />
                    </ListItem>
                    {user?.branch && (
                      <ListItem>
                        <ListItemIcon>
                          <LocationOn fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Delegación"
                          secondary={user.branch.name}
                        />
                      </ListItem>
                    )}
                    {user?.company && (
                      <ListItem>
                        <ListItemIcon>
                          <Business fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Empresa"
                          secondary={user.company.name}
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Información Personal
                </Typography>
                <form onSubmit={handleSubmit(onSubmitProfile)}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Nombre"
                        {...register('firstName', { required: 'El nombre es requerido' })}
                        error={!!errors.firstName}
                        helperText={errors.firstName?.message}
                        disabled={!editMode}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Apellido"
                        {...register('lastName', { required: 'El apellido es requerido' })}
                        error={!!errors.lastName}
                        helperText={errors.lastName?.message}
                        disabled={!editMode}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        {...register('email', { 
                          required: 'El email es requerido',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Email inválido'
                          }
                        })}
                        error={!!errors.email}
                        helperText={errors.email?.message}
                        disabled={!editMode}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Email />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Teléfono"
                        {...register('phone')}
                        disabled={!editMode}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Phone />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                  </Grid>
                </form>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Seguridad */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Cambiar Contraseña
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Mantén tu cuenta segura con una contraseña fuerte
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Lock />}
                  onClick={() => setPasswordDialogOpen(true)}
                  fullWidth
                >
                  Cambiar Contraseña
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Estado de Seguridad
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Contraseña segura"
                      secondary="Tu contraseña cumple con los requisitos de seguridad"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Email verificado"
                      secondary="Tu dirección de email ha sido verificada"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Warning color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Autenticación de dos factores"
                      secondary="Considera habilitar 2FA para mayor seguridad"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Actividad */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Historial de Actividad
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Registro de tus acciones en el sistema
            </Typography>
            
            {activityLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <Typography>Cargando actividad...</Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Acción</TableCell>
                        <TableCell>Descripción</TableCell>
                        <TableCell>IP</TableCell>
                        <TableCell>Fecha</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(activityData?.activities || []).map((activity) => (
                        <TableRow key={activity._id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getActivityIcon(activity.action)}
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                {getActivityDescription(activity)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {activity.details || 'Sin detalles'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {activity.ipAddress || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(activity.createdAt).toLocaleString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={activityData?.total || 0}
                  rowsPerPage={activityRowsPerPage}
                  page={activityPage}
                  onPageChange={(e, newPage) => setActivityPage(newPage)}
                  onRowsPerPageChange={(e) => {
                    setActivityRowsPerPage(parseInt(e.target.value, 10));
                    setActivityPage(0);
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Preferencias */}
      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Notificaciones
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Notifications />
                    </ListItemIcon>
                    <ListItemText
                      primary="Notificaciones por email"
                      secondary="Recibir notificaciones importantes por correo"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Warning />
                    </ListItemIcon>
                    <ListItemText
                      primary="Alertas de mantenimiento"
                      secondary="Notificar sobre mantenimientos vencidos"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Apariencia
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Language />
                    </ListItemIcon>
                    <ListItemText
                      primary="Idioma"
                      secondary="Español (España)"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Palette />
                    </ListItemIcon>
                    <ListItemText
                      primary="Tema"
                      secondary="Claro"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Dialog de cambiar contraseña */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmitPassword(onSubmitPassword)}>
          <DialogTitle>Cambiar Contraseña</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 3 }}>
              Tu nueva contraseña debe tener al menos 6 caracteres
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Contraseña Actual"
                  type={showCurrentPassword ? 'text' : 'password'}
                  {...registerPassword('currentPassword', { 
                    required: 'La contraseña actual es requerida'
                  })}
                  error={!!passwordErrors.currentPassword}
                  helperText={passwordErrors.currentPassword?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          edge="end"
                        >
                          {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nueva Contraseña"
                  type={showNewPassword ? 'text' : 'password'}
                  {...registerPassword('newPassword', { 
                    required: 'La nueva contraseña es requerida',
                    minLength: {
                      value: 6,
                      message: 'La contraseña debe tener al menos 6 caracteres'
                    }
                  })}
                  error={!!passwordErrors.newPassword}
                  helperText={passwordErrors.newPassword?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          edge="end"
                        >
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Confirmar Nueva Contraseña"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...registerPassword('confirmPassword', { 
                    required: 'Confirma tu nueva contraseña',
                    validate: (value) => {
                      const newPassword = watchPassword('newPassword');
                      return value === newPassword || 'Las contraseñas no coinciden';
                    }
                  })}
                  error={!!passwordErrors.confirmPassword}
                  helperText={passwordErrors.confirmPassword?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordDialogOpen(false)}>Cancelar</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? 'Cambiando...' : 'Cambiar Contraseña'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Profile;