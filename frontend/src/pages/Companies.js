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
  Tooltip
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Search,
  FilterList,
  Business,
  Phone,
  Email,
  LocationOn,
  Visibility,
  VisibilityOff,
  Store,
  DirectionsCar,
  People
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const Companies = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showAdminConfirmPassword, setShowAdminConfirmPassword] = useState(false);
  
  const { hasPermission, user, isAuthenticated, authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors }
  } = useForm();

  // Consulta de empresas
  const { data: companiesData, isLoading } = useQuery({
    queryKey: ['companies', page, rowsPerPage, searchTerm, filterStatus],
    queryFn: async () => {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
        status: filterStatus !== 'all' ? filterStatus : undefined
      };
      const response = await axios.get('/companies', { params });
      return response.data;
    },
    enabled: isAuthenticated && !!user && !authLoading
  });

  // Mutación para crear/actualizar empresa
  const saveCompanyMutation = useMutation({
    mutationFn: async (data) => {
      if (editingCompany) {
        return axios.put(`/companies/${editingCompany._id}`, data);
      } else {
        return axios.post('/companies', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      toast.success(editingCompany ? 'Empresa actualizada' : 'Empresa creada');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al guardar empresa');
    }
  });

  // Mutación para eliminar empresa
  const deleteCompanyMutation = useMutation({
    mutationFn: async (id) => {
      return axios.delete(`/api/companies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      toast.success('Empresa eliminada');
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar empresa');
    }
  });

  // Mutación para cambiar estado
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      return axios.patch(`/api/companies/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      toast.success('Estado actualizado');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar estado');
    }
  });

  const handleOpenDialog = (company = null) => {
    setEditingCompany(company);
    if (company) {
      reset({
        name: company.name,
        rfc: company.rfc,
        'address.street': company.address?.street || '',
        'address.city': company.address?.city || '',
        'address.state': company.address?.state || '',
        'address.zipCode': company.address?.zipCode || '',
        'address.country': company.address?.country || 'España',
        'contact.phone': company.contact?.phone || '',
        'contact.email': company.contact?.email || '',
        'contact.website': company.contact?.website || '',
        subscriptionPlan: company.subscription?.plan || 'basic',
        maxVehicles: company.subscription?.maxVehicles || 10,
        maxUsers: company.subscription?.maxUsers || 5,
        maxBranches: company.subscription?.maxBranches || 1
      });
    } else {
      reset({
        subscriptionPlan: 'basic',
        'address.country': 'España',
        maxVehicles: 10,
        maxUsers: 5,
        maxBranches: 1
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCompany(null);
    reset();
  };

  const handleMenuOpen = (event, company) => {
    setAnchorEl(event.currentTarget);
    setSelectedCompany(company);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCompany(null);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = () => {
    if (selectedCompany) {
      deleteCompanyMutation.mutate(selectedCompany._id);
    }
  };

  const handleToggleStatus = (company) => {
    toggleStatusMutation.mutate({
      id: company._id,
      isActive: !company.isActive
    });
  };

  const onSubmit = (data) => {
    const companyData = {
      name: data.name,
      rfc: data.rfc,
      address: {
        street: data['address.street'] || '',
        city: data['address.city'] || '',
        state: data['address.state'] || '',
        zipCode: data['address.zipCode'] || '',
        country: data['address.country'] || 'España'
      },
      contact: {
        phone: data['contact.phone'] || '',
        email: data['contact.email'] || '',
        website: data['contact.website'] || ''
      }
    };

    // Solo incluir subscription si es super_admin
    if (hasPermission('companies', 'manage_subscription')) {
      companyData.subscription = {
        plan: data.subscriptionPlan || 'basic',
        maxVehicles: parseInt(data.maxVehicles) || 10,
        maxUsers: parseInt(data.maxUsers) || 5,
        maxBranches: parseInt(data.maxBranches) || 1
      };
    }

    // Si es una nueva empresa, incluir datos del administrador
    if (!editingCompany) {
      companyData.adminData = {
        firstName: data.adminFirstName,
        lastName: data.adminLastName,
        email: data.adminEmail,
        phone: data.adminPhone || '',
        password: data.adminPassword
      };
    }

    saveCompanyMutation.mutate(companyData);
  };

  const filteredCompanies = companiesData?.companies || [];
  const totalCount = companiesData?.total || 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Gestión de Empresas
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Administra las empresas registradas en el sistema
          </Typography>
        </Box>
        {hasPermission('companies', 'create') && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Nueva Empresa
          </Button>
        )}
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Buscar empresas..."
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
            <Grid item xs={12} md={3}>
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

      {/* Tabla de empresas */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Empresa</TableCell>
                <TableCell>RFC</TableCell>
                <TableCell>Contacto</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Estadísticas</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCompanies.map((company) => (
                <TableRow key={company._id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        <Business />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {company.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {company.address}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {company.rfc}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Phone sx={{ fontSize: 16, mr: 0.5 }} />
                        {company.phone}
                      </Typography>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                        <Email sx={{ fontSize: 16, mr: 0.5 }} />
                        {company.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        company.subscriptionPlan === 'basic' ? 'Básico' :
                        company.subscriptionPlan === 'premium' ? 'Premium' : 'Enterprise'
                      }
                      color={
                        company.subscriptionPlan === 'basic' ? 'default' :
                        company.subscriptionPlan === 'premium' ? 'primary' : 'secondary'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Delegaciones">
                        <Chip
                          icon={<Store />}
                          label={company.branchCount || 0}
                          size="small"
                          variant="outlined"
                        />
                      </Tooltip>
                      <Tooltip title="Vehículos">
                        <Chip
                          icon={<DirectionsCar />}
                          label={company.vehicleCount || 0}
                          size="small"
                          variant="outlined"
                        />
                      </Tooltip>
                      <Tooltip title="Usuarios">
                        <Chip
                          icon={<People />}
                          label={company.userCount || 0}
                          size="small"
                          variant="outlined"
                        />
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={company.isActive}
                          onChange={() => handleToggleStatus(company)}
                          disabled={!hasPermission('companies', 'update')}
                        />
                      }
                      label={company.isActive ? 'Activo' : 'Inactivo'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, company)}
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
        {hasPermission('companies', 'read') && (
          <MenuItem onClick={() => { /* Ver detalles */ handleMenuClose(); }}>
            <ListItemIcon>
              <Visibility fontSize="small" />
            </ListItemIcon>
            <ListItemText>Ver Detalles</ListItemText>
          </MenuItem>
        )}
        {hasPermission('companies', 'update') && (
          <MenuItem onClick={() => { handleOpenDialog(selectedCompany); handleMenuClose(); }}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        )}
        <Divider />
        {hasPermission('companies', 'delete') && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Delete fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Eliminar</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Dialog de crear/editar empresa */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nombre de la Empresa"
                  {...register('name', { required: 'El nombre es requerido' })}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="RFC"
                  {...register('rfc', { required: 'El RFC es requerido' })}
                  error={!!errors.rfc}
                  helperText={errors.rfc?.message}
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Calle"
                  {...register('address.street', { required: 'La calle es requerida' })}
                  error={!!errors['address.street']}
                  helperText={errors['address.street']?.message}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Ciudad"
                  {...register('address.city', { required: 'La ciudad es requerida' })}
                  error={!!errors['address.city']}
                  helperText={errors['address.city']?.message}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Estado"
                  {...register('address.state', { required: 'El estado es requerido' })}
                  error={!!errors['address.state']}
                  helperText={errors['address.state']?.message}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Código Postal"
                  {...register('address.zipCode', { required: 'El código postal es requerido' })}
                  error={!!errors['address.zipCode']}
                  helperText={errors['address.zipCode']?.message}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="País"
                  {...register('address.country')}
                  defaultValue="España"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  {...register('contact.phone', { required: 'El teléfono es requerido' })}
                  error={!!errors['contact.phone']}
                  helperText={errors['contact.phone']?.message}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  {...register('contact.email', { required: 'El email es requerido' })}
                  error={!!errors['contact.email']}
                  helperText={errors['contact.email']?.message}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Sitio Web"
                  {...register('contact.website')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="subscriptionPlan"
                  control={control}
                  rules={{ required: 'El plan es requerido' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.subscriptionPlan}>
                      <InputLabel>Plan de Suscripción</InputLabel>
                      <Select {...field} label="Plan de Suscripción">
                        <MenuItem value="basic">Básico</MenuItem>
                        <MenuItem value="premium">Premium</MenuItem>
                        <MenuItem value="enterprise">Enterprise</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              
              {/* Datos del Administrador - Solo para nuevas empresas */}
              {!editingCompany && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Datos del Administrador
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Nombre"
                      {...register('adminFirstName', { required: !editingCompany ? 'El nombre es requerido' : false })}
                      error={!!errors.adminFirstName}
                      helperText={errors.adminFirstName?.message}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Apellidos"
                      {...register('adminLastName', { required: !editingCompany ? 'Los apellidos son requeridos' : false })}
                      error={!!errors.adminLastName}
                      helperText={errors.adminLastName?.message}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Email del Administrador"
                      type="email"
                      {...register('adminEmail', { 
                        required: !editingCompany ? 'El email es requerido' : false,
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Email inválido'
                        }
                      })}
                      error={!!errors.adminEmail}
                      helperText={errors.adminEmail?.message}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Teléfono del Administrador"
                      {...register('adminPhone')}
                      error={!!errors.adminPhone}
                      helperText={errors.adminPhone?.message}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Contraseña"
                      type={showAdminPassword ? 'text' : 'password'}
                      {...register('adminPassword', { 
                        required: !editingCompany ? 'La contraseña es requerida' : false,
                        minLength: {
                          value: 6,
                          message: 'La contraseña debe tener al menos 6 caracteres'
                        }
                      })}
                      error={!!errors.adminPassword}
                      helperText={errors.adminPassword?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowAdminPassword(!showAdminPassword)}
                              edge="end"
                            >
                              {showAdminPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Confirmar Contraseña"
                      type={showAdminConfirmPassword ? 'text' : 'password'}
                      {...register('adminPasswordConfirm', { 
                        required: !editingCompany ? 'Confirma la contraseña' : false,
                        validate: (value) => {
                          const password = watch('adminPassword');
                          return !editingCompany && value !== password ? 'Las contraseñas no coinciden' : true;
                        }
                      })}
                      error={!!errors.adminPasswordConfirm}
                      helperText={errors.adminPasswordConfirm?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowAdminConfirmPassword(!showAdminConfirmPassword)}
                              edge="end"
                            >
                              {showAdminConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                </>
              )}

              {/* Límites */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Límites de la Suscripción
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Máximo Vehículos"
                  type="number"
                  {...register('maxVehicles', { required: 'Requerido', min: 1 })}
                  error={!!errors.maxVehicles}
                  helperText={errors.maxVehicles?.message}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Máximo Usuarios"
                  type="number"
                  {...register('maxUsers', { required: 'Requerido', min: 1 })}
                  error={!!errors.maxUsers}
                  helperText={errors.maxUsers?.message}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Máximo Delegaciones"
                  type="number"
                  {...register('maxBranches', { required: 'Requerido', min: 1 })}
                  error={!!errors.maxBranches}
                  helperText={errors.maxBranches?.message}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={saveCompanyMutation.isPending}
            >
              {saveCompanyMutation.isPending ? 'Guardando...' : 'Guardar'}
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
            ¿Estás seguro de que deseas eliminar la empresa <strong>{selectedCompany?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={deleteCompanyMutation.isPending}
          >
            {deleteCompanyMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Companies;