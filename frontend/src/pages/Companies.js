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
import api from '../utils/api';
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
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
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
      const response = await api.get('/companies', { params });
      return response.data;
    },
    enabled: isAuthenticated && !!user && !authLoading
  });

  // Mutación para crear/actualizar empresa
  const saveCompanyMutation = useMutation({
    mutationFn: async (data) => {
      if (editingCompany) {
        return api.put(`/companies/${editingCompany.id}`, data);
      } else {
        return api.post('/companies', data);
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
      return api.delete(`/companies/${id}`);
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
      return api.put(`/companies/${id}/activate`, { isActive });
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
    // Ensure details dialog is closed
    setDetailsDialogOpen(false);
    setEditingCompany(company);
    
    // Limpiar errores previos
    reset();
    
    if (company) {
      // Usar setTimeout para asegurar que el reset se complete antes de establecer nuevos valores
      setTimeout(() => {
        reset({
          name: company.name,
          cif: company.cif,
          'address.street': company.address?.street || '',
          'address.city': company.address?.city || '',
          'address.state': company.address?.state || '',
          'address.zipCode': company.address?.zipCode || '',
          'address.country': company.address?.country || 'España',
          'contact.phone': company.contact?.phone || '',
          'contact.email': company.contact?.email || '',
          'contact.website': company.contact?.website || '',
          maxUsers: company.settings?.subscription?.maxUsers || 10,
          maxVehicles: company.settings?.subscription?.maxVehicles || 25,
          maxBranches: company.settings?.subscription?.maxBranches || 5
        });
      }, 50);
    } else {
      setTimeout(() => {
        reset({
          'address.country': 'España',
          maxUsers: 10,
          maxVehicles: 25,
          maxBranches: 5
        });
      }, 50);
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
    setAnchorEl(null);
  };

  const handleViewDetails = () => {
    // Ensure edit dialog is closed
    setOpenDialog(false);
    setDetailsDialogOpen(true);
    // Close menu but keep selectedCompany
    setAnchorEl(null);
  };

  const handleCloseDetailsDialog = () => {
    setDetailsDialogOpen(false);
    setSelectedCompany(null);
  };

  const confirmDelete = () => {
    if (selectedCompany) {
      deleteCompanyMutation.mutate(selectedCompany.id);
    }
  };

  const handleToggleStatus = (company) => {
    toggleStatusMutation.mutate({
      id: company.id,
      isActive: !company.isActive
    });
  };

  const onSubmit = (data) => {
    const companyData = {
      name: data.name,
      cif: data.cif,
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
      },
      settings: {
        subscription: {
          maxUsers: parseInt(data.maxUsers) || 10,
          maxVehicles: parseInt(data.maxVehicles) || 25,
          maxBranches: parseInt(data.maxBranches) || 5
        }
      }
    };

    // Si es una nueva empresa, incluir datos del administrador
    if (!editingCompany) {
      companyData.adminData = {
        firstName: data.adminName,
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
                <TableCell>CIF</TableCell>
                <TableCell>Contacto</TableCell>
                <TableCell>Estadísticas</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCompanies.map((company) => (
                <TableRow key={company.id} hover>
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
                          {company.address ? 
                            [company.address.street, company.address.city, company.address.state]
                              .filter(Boolean)
                              .join(', ') || 'Sin dirección'
                            : 'Sin dirección'
                          }
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {company.cif}
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
          <MenuItem onClick={handleViewDetails}>
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
      <Dialog key="edit-dialog" open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
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
                  label="CIF"
                  {...register('cif', { required: 'El CIF es requerido' })}
                  error={!!errors.cif}
                  helperText={errors.cif?.message}
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
                  label="Provincia"
                  {...register('address.state', { required: 'La provincia es requerida' })}
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
              
              {/* Límites de la empresa */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Límites de la Empresa
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Máximo de Usuarios"
                  type="number"
                  {...register('maxUsers', { 
                    required: 'El límite de usuarios es requerido',
                    min: { value: 1, message: 'Debe ser al menos 1' }
                  })}
                  error={!!errors.maxUsers}
                  helperText={errors.maxUsers?.message}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Máximo de Vehículos"
                  type="number"
                  {...register('maxVehicles', { 
                    required: 'El límite de vehículos es requerido',
                    min: { value: 1, message: 'Debe ser al menos 1' }
                  })}
                  error={!!errors.maxVehicles}
                  helperText={errors.maxVehicles?.message}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Máximo de Delegaciones"
                  type="number"
                  {...register('maxBranches', { 
                    required: 'El límite de delegaciones es requerido',
                    min: { value: 1, message: 'Debe ser al menos 1' }
                  })}
                  error={!!errors.maxBranches}
                  helperText={errors.maxBranches?.message}
                  inputProps={{ min: 1 }}
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
                      {...register('adminName', { required: !editingCompany ? 'El nombre es requerido' : false })}
                      error={!!errors.adminName}
                      helperText={errors.adminName?.message}
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

      {/* Dialog de detalles de empresa */}
      <Dialog key="details-dialog" open={detailsDialogOpen} onClose={handleCloseDetailsDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Business color="primary" />
            <Typography variant="h6">
              Detalles de {selectedCompany?.name}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCompany && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Información básica */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Información Básica
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Nombre:</Typography>
                        <Typography variant="body1" fontWeight="medium">{selectedCompany.name}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">CIF:</Typography>
                        <Typography variant="body1" fontFamily="monospace">{selectedCompany.cif}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Estado:</Typography>
                        <Chip 
                          label={selectedCompany.isActive ? 'Activa' : 'Inactiva'}
                          color={selectedCompany.isActive ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Información de contacto */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Contacto
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Phone fontSize="small" color="action" />
                        <Typography variant="body2">{selectedCompany.contact?.phone || 'No especificado'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email fontSize="small" color="action" />
                        <Typography variant="body2">{selectedCompany.contact?.email || 'No especificado'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2">
                          {selectedCompany.address ? 
                            [selectedCompany.address.street, selectedCompany.address.city, selectedCompany.address.state]
                              .filter(Boolean)
                              .join(', ') || 'No especificada'
                            : 'No especificada'
                          }
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Estadísticas */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Estadísticas
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                          <Store sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                          <Typography variant="h4" color="primary.main" fontWeight="bold">
                            {selectedCompany.stats?.branches || selectedCompany.branchCount || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Delegaciones
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                          <DirectionsCar sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                          <Typography variant="h4" color="success.main" fontWeight="bold">
                            {selectedCompany.stats?.vehicles || selectedCompany.vehicleCount || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Vehículos
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                          <People sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                          <Typography variant="h4" color="info.main" fontWeight="bold">
                            {selectedCompany.stats?.users || selectedCompany.userCount || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Usuarios
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Configuración de suscripción */}
              {selectedCompany.settings?.subscription && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Límites de Suscripción
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">Máximo Usuarios</Typography>
                            <Typography variant="h6" color="primary">
                              {selectedCompany.settings.subscription.maxUsers || 'Ilimitado'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">Máximo Vehículos</Typography>
                            <Typography variant="h6" color="primary">
                              {selectedCompany.settings.subscription.maxVehicles || 'Ilimitado'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">Máximo Delegaciones</Typography>
                            <Typography variant="h6" color="primary">
                              {selectedCompany.settings.subscription.maxBranches || 'Ilimitado'}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailsDialog}>Cerrar</Button>
          {hasPermission('companies', 'update') && (
            <Button 
              variant="contained" 
              onClick={() => {
                handleCloseDetailsDialog();
                setTimeout(() => {
                  handleOpenDialog(selectedCompany);
                }, 100);
              }}
            >
              Editar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Companies;