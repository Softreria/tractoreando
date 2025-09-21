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
  Switch,
  FormControlLabel,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  InputAdornment,
  Tooltip,
  Badge,
  Tabs,
  Tab,
  FormGroup,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemSecondaryAction,
  Collapse
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Search,
  FilterList,
  Person,
  Email,
  Phone,
  Business,
  LocationOn,
  Visibility,
  VisibilityOff,
  Lock,
  LockOpen,
  AdminPanelSettings,
  Engineering,
  ManageAccounts,
  SupervisorAccount,
  ExpandLess,
  ExpandMore,
  Security
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Users = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBranch, setFilterBranch] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [expandedPermissions, setExpandedPermissions] = useState({});
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  
  const { user, hasPermission, hasRole, isAuthenticated, authLoading } = useAuth();
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

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors }
  } = useForm();

  // Consulta de usuarios
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', page, rowsPerPage, searchTerm, filterRole, filterStatus, filterBranch],
    queryFn: async () => {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
        role: filterRole || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        branch: filterBranch || undefined
      };
      const response = await api.get('/users', { params });
      return response.data;
    },
    enabled: isAuthenticated && !!user && !authLoading
  });

  // Consulta de roles disponibles
  const { } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const response = await api.get('/users/roles');
      return response.data;
    },
    enabled: isAuthenticated && !!user && !authLoading
  });

  // Observar la empresa seleccionada para filtrar delegaciones
  const selectedCompany = watch('company');

  // Limpiar delegaciones cuando cambie la empresa
  React.useEffect(() => {
    if (hasRole('super_admin') && selectedCompany) {
      setValue('branch', '');
    }
  }, [selectedCompany, hasRole, setValue]);

  // Consulta de delegaciones para el filtro
  const { data: branchesData } = useQuery({
    queryKey: ['branches-list', selectedCompany],
    queryFn: async () => {
      const params = { limit: 100 };
      if (hasRole('super_admin') && selectedCompany) {
        params.company = selectedCompany;
      } else if (!hasRole('super_admin')) {
        params.company = user?.company?.id;
      }
      const response = await api.get('/branches', { params });
      return response.data.branches;
    },
    enabled: isAuthenticated && !!user && !authLoading
  });

  // Consulta de empresas (solo para superadministradores)
  const { data: companiesData } = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const response = await api.get('/companies', { params: { limit: 100 } });
      return response.data.companies;
    },
    enabled: isAuthenticated && !!user && !authLoading && hasRole('super_admin')
  });

  // Mutación para crear/actualizar usuario
  const saveUserMutation = useMutation({
    mutationFn: async (data) => {
      if (editingUser) {
        return api.put(`/users/${editingUser.id}`, data);
      } else {
        return api.post('/users', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success(editingUser ? 'Usuario actualizado' : 'Usuario creado');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al guardar usuario');
    }
  });

  // Mutación para eliminar usuario
  const deleteUserMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('Usuario eliminado');
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar usuario');
    }
  });

  // Mutación para cambiar estado
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      return api.patch(`/users/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('Estado actualizado');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar estado');
    }
  });

  // Mutación para cambiar contraseña
  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      return api.patch(`/users/${selectedUser.id}/password`, data);
    },
    onSuccess: () => {
      toast.success('Contraseña actualizada');
      setPasswordDialogOpen(false);
      resetPassword();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al cambiar contraseña');
    }
  });

  const handleOpenDialog = (user = null) => {
    setEditingUser(user);
    if (user) {
      reset({
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        company: user.company?.id || '',
        branch: user.branch?.id || '',
        permissions: user.permissions || {},
        vehicleTypeAccess: user.vehicleTypeAccess || [],
        isActive: user.isActive
      });
    } else {
      reset({
        role: 'mechanic',
        isActive: true,
        company: '',
        branch: '',
        permissions: {},
        vehicleTypeAccess: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    reset();
    setTabValue(0);
  };

  const handleMenuOpen = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    setAnchorEl(null);
  };

  const confirmDelete = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  const handleToggleStatus = (user) => {
    toggleStatusMutation.mutate({
      id: user.id,
      isActive: !user.isActive
    });
  };

  const handleChangePassword = () => {
    resetPassword();
    setPasswordDialogOpen(true);
    handleMenuClose();
  };

  const handleViewDetails = () => {
    setUserDetails(selectedUser);
    setDetailsDialogOpen(true);
    handleMenuClose();
  };

  const onSubmit = (data) => {
    const userData = {
      name: data.name,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || '',
      role: data.role,
      company: data.company || user?.company?.id,
      branch: data.branch || '',
      permissions: data.permissions || {},
      preferences: data.preferences || {},
      vehicleTypeAccess: data.vehicleTypeAccess || [],
      isActive: data.isActive !== false
    };

    // Solo incluir contraseña si es un nuevo usuario
    if (!editingUser) {
      userData.password = data.password;
    }

    saveUserMutation.mutate(userData);
  };

  const onSubmitPassword = (data) => {
    changePasswordMutation.mutate({
      newPassword: data.newPassword
    });
  };

  const handlePermissionToggle = (module, action) => {
    const currentPermissions = watch('permissions') || {};
    const modulePermissions = currentPermissions[module] || {};
    
    const updatedPermissions = {
      ...currentPermissions,
      [module]: {
        ...modulePermissions,
        [action]: !modulePermissions[action]
      }
    };
    
    reset({ ...watch(), permissions: updatedPermissions });
  };

  const togglePermissionExpansion = (module) => {
    setExpandedPermissions(prev => ({
      ...prev,
      [module]: !prev[module]
    }));
  };

  const filteredUsers = usersData?.users || [];
  const totalCount = usersData?.total || 0;

  const roleLabels = {
    super_admin: 'Super Administrador',
    company_admin: 'Administrador de Empresa',
    admin: 'Administrador',
    manager: 'Gerente',
    mechanic: 'Mecánico',
    user: 'Usuario'
  };

  const roleIcons = {
    super_admin: <AdminPanelSettings />,
    company_admin: <Business />,
    admin: <ManageAccounts />,
    manager: <SupervisorAccount />,
    mechanic: <Engineering />,
    user: <Person />
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return 'error';
      case 'company_admin': return 'secondary';
      case 'admin': return 'warning';
      case 'manager': return 'info';
      case 'mechanic': return 'success';
      case 'user': return 'default';
      default: return 'default';
    }
  };

  const permissionModules = [
    {
      name: 'companies',
      label: 'Empresas',
      actions: ['create', 'read', 'update', 'delete']
    },
    {
      name: 'branches',
      label: 'Delegaciones',
      actions: ['create', 'read', 'update', 'delete']
    },
    {
      name: 'vehicles',
      label: 'Vehículos',
      actions: ['create', 'read', 'update', 'delete']
    },
    {
      name: 'maintenance',
      label: 'Mantenimiento',
      actions: ['create', 'read', 'update', 'delete']
    },
    {
      name: 'users',
      label: 'Usuarios',
      actions: ['create', 'read', 'update', 'delete']
    },
    {
      name: 'reports',
      label: 'Reportes',
      actions: ['read', 'export']
    }
  ];

  const actionLabels = {
    create: 'Crear',
    read: 'Ver',
    update: 'Editar',
    delete: 'Eliminar',
    export: 'Exportar'
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Gestión de Usuarios
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Administra los usuarios y sus permisos en el sistema
          </Typography>
        </Box>
        {hasPermission('users', 'create') && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Nuevo Usuario
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
                placeholder="Buscar usuarios..."
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
                <InputLabel>Rol</InputLabel>
                <Select
                  value={filterRole}
                  label="Rol"
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filterStatus}
                  label="Estado"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="active">Activos</MenuItem>
                  <MenuItem value="inactive">Inactivos</MenuItem>
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

      {/* Tabla de usuarios */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Usuario</TableCell>
                <TableCell>Contacto</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Delegación</TableCell>
                <TableCell>Último Acceso</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((userItem) => (
                <TableRow key={userItem.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, bgcolor: getRoleColor(userItem.role) + '.main' }}>
                        {roleIcons[userItem.role] || <Person />}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {userItem.name} {userItem.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {userItem.id.slice(-8)}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          Creado: {new Date(userItem.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Email sx={{ fontSize: 16, mr: 0.5 }} />
                        {userItem.email}
                      </Typography>
                      {userItem.phone && (
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                          <Phone sx={{ fontSize: 16, mr: 0.5 }} />
                          {userItem.phone}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={roleIcons[userItem.role]}
                      label={roleLabels[userItem.role]}
                      color={getRoleColor(userItem.role)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {userItem.branch ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocationOn sx={{ fontSize: 16, mr: 0.5 }} />
                        <Typography variant="body2">
                          {userItem.branch.name}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Sin asignar
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {userItem.lastLogin 
                        ? new Date(userItem.lastLogin).toLocaleDateString()
                        : 'Nunca'
                      }
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {userItem.lastLogin 
                        ? new Date(userItem.lastLogin).toLocaleTimeString()
                        : ''
                      }
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={userItem.isActive}
                          onChange={() => handleToggleStatus(userItem)}
                          disabled={!hasPermission('users', 'update') || userItem.id === user.id}
                        />
                      }
                      label={userItem.isActive ? 'Activo' : 'Inactivo'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, userItem)}
                    >
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
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
        {hasPermission('users', 'read') && (
          <MenuItem onClick={handleViewDetails}>
            <ListItemIcon>
              <Visibility fontSize="small" />
            </ListItemIcon>
            <ListItemText>Ver Detalles</ListItemText>
          </MenuItem>
        )}
        {hasPermission('users', 'update') && (
          <MenuItem onClick={() => { handleOpenDialog(selectedUser); handleMenuClose(); }}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        )}
        {hasPermission('users', 'update') && (
          <MenuItem onClick={handleChangePassword}>
            <ListItemIcon>
              <Lock fontSize="small" />
            </ListItemIcon>
            <ListItemText>Cambiar Contraseña</ListItemText>
          </MenuItem>
        )}
        <Divider />
        {hasPermission('users', 'delete') && selectedUser?.id !== user.id && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Delete fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Eliminar</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Dialog de crear/editar usuario */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab label="Información Personal" />
                <Tab label="Permisos" />
              </Tabs>
            </Box>
            
            {/* Tab 0: Información Personal */}
            {tabValue === 0 && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nombre"
                    {...register('name', { required: 'El nombre es requerido' })}
                        error={!!errors.name}
                        helperText={errors.name?.message}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Apellido"
                    {...register('lastName', { required: 'El apellido es requerido' })}
                    error={!!errors.lastName}
                    helperText={errors.lastName?.message}
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
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Teléfono"
                    {...register('phone')}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="role"
                    control={control}
                    rules={{ required: 'El rol es requerido' }}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.role}>
                        <InputLabel>Rol</InputLabel>
                        <Select {...field} label="Rol">
                          {Object.entries(roleLabels).map(([value, label]) => (
                            <MenuItem key={value} value={value}>
                              {label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                {hasRole('super_admin') && (
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="company"
                      control={control}
                      rules={{ required: hasRole('super_admin') ? 'La empresa es requerida' : false }}
                      render={({ field }) => (
                        <FormControl fullWidth error={!!errors.company}>
                          <InputLabel>Empresa</InputLabel>
                          <Select {...field} label="Empresa">
                            <MenuItem value="">Seleccionar empresa</MenuItem>
                            {companiesData?.map((company) => (
                              <MenuItem key={company.id} value={company.id}>
                                {company.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.company && (
                            <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                              {errors.company.message}
                            </Typography>
                          )}
                        </FormControl>
                      )}
                    />
                  </Grid>
                )}
                <Grid item xs={12} md={6}>
                  <Controller
                    name="branch"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.branch}>
                        <InputLabel>Delegación</InputLabel>
                        <Select 
                          {...field} 
                          label="Delegación"
                          value={field.value || ''}
                        >
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
                <Grid item xs={12}>
                  <Controller
                    name="vehicleTypeAccess"
                    control={control}
                    render={({ field }) => {
                      const vehicleTypes = [
                        { value: 'Coche', label: 'Coche', category: 'Vehículos' },
                        { value: 'Furgoneta', label: 'Furgoneta', category: 'Vehículos' },
                        { value: 'Camión', label: 'Camión', category: 'Vehículos' },
                        { value: 'Motocicleta', label: 'Motocicleta', category: 'Vehículos' },
                        { value: 'Tractor', label: 'Tractor', category: 'Maquinaria' },
                        { value: 'Remolque', label: 'Remolque', category: 'Maquinaria' },
                        { value: 'Maquinaria', label: 'Maquinaria', category: 'Maquinaria' },
                        { value: 'Otro', label: 'Otro', category: 'Especiales' }
                      ];
                      
                      const groupedTypes = vehicleTypes.reduce((acc, type) => {
                        if (!acc[type.category]) {
                          acc[type.category] = [];
                        }
                        acc[type.category].push(type);
                        return acc;
                      }, {});
                      
                      return (
                        <FormControl fullWidth error={!!errors.vehicleTypeAccess}>
                          <InputLabel>Tipos de Vehículos Autorizados</InputLabel>
                          <Select
                            {...field}
                            label="Tipos de Vehículos Autorizados"
                            multiple
                            value={field.value || []}
                            renderValue={(selected) => {
                              if (selected.length === 0) return 'Seleccionar tipos de vehículos';
                              if (selected.length === vehicleTypes.length) return 'Todos los tipos';
                              return `${selected.length} tipos seleccionados`;
                            }}
                          >
                            <MenuItem value="all" onClick={(e) => {
                              e.preventDefault();
                              const allValues = vehicleTypes.map(type => type.value);
                              const currentValues = field.value || [];
                              if (currentValues.length === allValues.length) {
                                field.onChange([]);
                              } else {
                                field.onChange(allValues);
                              }
                            }}>
                              <Checkbox 
                                checked={field.value?.length === vehicleTypes.length}
                                indeterminate={field.value?.length > 0 && field.value?.length < vehicleTypes.length}
                              />
                              <strong>Seleccionar Todos</strong>
                            </MenuItem>
                            <Divider />
                            {Object.entries(groupedTypes).map(([category, types]) => [
                              <MenuItem key={`category-${category}`} disabled>
                                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold' }}>
                                  {category}
                                </Typography>
                              </MenuItem>,
                              ...types.map((type) => (
                                <MenuItem key={type.value} value={type.value}>
                                  <Checkbox checked={(field.value || []).includes(type.value)} />
                                  <Box sx={{ ml: 2 }}>
                                    {type.label}
                                  </Box>
                                </MenuItem>
                              ))
                            ]).flat()}
                          </Select>
                          {errors.vehicleTypeAccess && (
                            <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                              {errors.vehicleTypeAccess.message}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
                            Selecciona los tipos de vehículos que este usuario podrá ver y gestionar
                          </Typography>
                        </FormControl>
                      );
                    }}
                  />
                </Grid>
                {!editingUser && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Contraseña"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password', { 
                        required: 'La contraseña es requerida',
                        minLength: {
                          value: 6,
                          message: 'La contraseña debe tener al menos 6 caracteres'
                        }
                      })}
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={field.value}
                            onChange={field.onChange}
                          />
                        }
                        label="Usuario Activo"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            )}
            
            {/* Tab 1: Permisos */}
            {tabValue === 1 && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Los permisos se asignan por módulo y acción. Los super administradores tienen acceso completo.
                </Alert>
                <List>
                  {permissionModules.map((module) => {
                    const currentPermissions = watch('permissions') || {};
                    const modulePermissions = currentPermissions[module.name] || {};
                    const hasAnyPermission = module.actions.some(action => modulePermissions[action]);
                    
                    return (
                      <Box key={module.name}>
                        <ListItem>
                          <ListItemButton onClick={() => togglePermissionExpansion(module.name)}>
                            <ListItemIcon>
                              <Security />
                            </ListItemIcon>
                            <ListItemText 
                              primary={module.label}
                              secondary={hasAnyPermission ? 'Tiene permisos' : 'Sin permisos'}
                            />
                            {expandedPermissions[module.name] ? <ExpandLess /> : <ExpandMore />}
                          </ListItemButton>
                        </ListItem>
                        <Collapse in={expandedPermissions[module.name]} timeout="auto" unmountOnExit>
                          <Box sx={{ pl: 4 }}>
                            <FormGroup>
                              {module.actions.map((action) => (
                                <FormControlLabel
                                  key={action}
                                  control={
                                    <Checkbox
                                      checked={modulePermissions[action] || false}
                                      onChange={() => handlePermissionToggle(module.name, action)}
                                    />
                                  }
                                  label={actionLabels[action]}
                                />
                              ))}
                            </FormGroup>
                          </Box>
                        </Collapse>
                        <Divider />
                      </Box>
                    );
                  })}
                </List>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={saveUserMutation.isPending}
            >
              {saveUserMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog de cambiar contraseña */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)}>
        <form onSubmit={handleSubmitPassword(onSubmitPassword)}>
          <DialogTitle>Cambiar Contraseña</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Cambiando contraseña para: <strong>{selectedUser?.name} {selectedUser?.lastName}</strong>
                </Alert>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nueva Contraseña"
                  type={showPassword ? 'text' : 'password'}
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
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
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

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta acción no se puede deshacer.
          </Alert>
          <Typography>
            ¿Estás seguro de que deseas eliminar al usuario <strong>{selectedUser?.name} {selectedUser?.lastName}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={deleteUserMutation.isPending}
          >
            {deleteUserMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de detalles de usuario */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalles del Usuario
        </DialogTitle>
        <DialogContent>
          {userDetails && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                    <Person />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {userDetails.firstName} {userDetails.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {userDetails.role}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Email sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography>{userDetails.email}</Typography>
                </Box>
                {userDetails.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography>{userDetails.phone}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Business sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography>{userDetails.company?.name || 'N/A'}</Typography>
                </Box>
                {userDetails.branches && userDetails.branches.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                    <LocationOn sx={{ mr: 1, color: 'text.secondary', mt: 0.5 }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">Delegaciones:</Typography>
                      {userDetails.branches.map((branch, index) => (
                        <Chip
                          key={branch.id || index}
                          label={branch.name}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Estado y Permisos
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Chip
                    label={userDetails.isActive ? 'Activo' : 'Inactivo'}
                    color={userDetails.isActive ? 'success' : 'error'}
                    sx={{ mr: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Creado: {new Date(userDetails.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                {userDetails.permissions && userDetails.permissions.length > 0 && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Permisos:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {userDetails.permissions.map((permission, index) => (
                        <Chip
                          key={index}
                          label={`${permission.resource}: ${permission.actions.join(', ')}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;