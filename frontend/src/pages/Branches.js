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
  Store,
  Phone,
  Email,
  LocationOn,
  Visibility,
  Schedule,
  DirectionsCar,
  Build,
  Business
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Branches = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCompany, setFilterCompany] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const { user, hasPermission, hasRole } = useAuth();
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors }
  } = useForm();

  // Consulta de delegaciones
  const { data: branchesData, isLoading } = useQuery({
    queryKey: ['branches', page, rowsPerPage, searchTerm, filterStatus, filterCompany],
    queryFn: async () => {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        company: filterCompany || undefined
      };
      const response = await api.get('/branches', { params });
      return response.data;
    }
  });

  // Consulta de empresas para el filtro
  const { data: companiesData } = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const response = await api.get('/companies', { params: { limit: 100 } });
      return response.data.companies;
    },
    enabled: hasRole('super_admin')
  });

  // Mutación para crear/actualizar delegación
  const saveBranchMutation = useMutation({
    mutationFn: async (data) => {
      if (editingBranch) {
        return api.put(`/branches/${editingBranch._id}`, data);
      } else {
        return api.post('/branches', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['branches']);
      toast.success(editingBranch ? 'Delegación actualizada' : 'Delegación creada');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al guardar delegación');
    }
  });

  // Mutación para eliminar delegación
  const deleteBranchMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['branches']);
      toast.success('Delegación eliminada');
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar delegación');
    }
  });

  // Mutación para cambiar estado
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      return api.patch(`/branches/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['branches']);
      toast.success('Estado actualizado');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar estado');
    }
  });

  const handleOpenDialog = (branch = null) => {
    setEditingBranch(branch);
    if (branch) {
      reset({
        name: branch.name,
        code: branch.code,
        company: branch.company._id,
        address: {
          street: branch.address?.street || '',
          city: branch.address?.city || '',
          state: branch.address?.state || '',
          zipCode: branch.address?.zipCode || '',
          country: branch.address?.country || 'España'
        },
        contact: {
          phone: branch.contact?.phone || branch.phone || '',
          email: branch.contact?.email || branch.email || '',
          manager: branch.contact?.manager || branch.manager || ''
        },
        operatingHours: {
          monday: branch.operatingHours?.monday || { open: '08:00', close: '17:00', closed: false },
          tuesday: branch.operatingHours?.tuesday || { open: '08:00', close: '17:00', closed: false },
          wednesday: branch.operatingHours?.wednesday || { open: '08:00', close: '17:00', closed: false },
          thursday: branch.operatingHours?.thursday || { open: '08:00', close: '17:00', closed: false },
          friday: branch.operatingHours?.friday || { open: '08:00', close: '17:00', closed: false },
          saturday: branch.operatingHours?.saturday || { open: '08:00', close: '12:00', closed: false },
          sunday: branch.operatingHours?.sunday || { open: '08:00', close: '12:00', closed: true }
        },

      });
    } else {
      reset({
        company: hasRole('super_admin') ? '' : user.company._id,
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'España'
        },
        contact: {
          phone: '',
          email: '',
          manager: ''
        },
        operatingHours: {
          monday: { open: '08:00', close: '17:00', closed: false },
          tuesday: { open: '08:00', close: '17:00', closed: false },
          wednesday: { open: '08:00', close: '17:00', closed: false },
          thursday: { open: '08:00', close: '17:00', closed: false },
          friday: { open: '08:00', close: '17:00', closed: false },
          saturday: { open: '08:00', close: '12:00', closed: false },
          sunday: { open: '08:00', close: '12:00', closed: true }
        },

      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingBranch(null);
    reset();
  };

  const handleMenuOpen = (event, branch) => {
    setAnchorEl(event.currentTarget);
    setSelectedBranch(branch);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBranch(null);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = () => {
    if (selectedBranch) {
      deleteBranchMutation.mutate(selectedBranch._id);
    }
  };

  const handleToggleStatus = (branch) => {
    toggleStatusMutation.mutate({
      id: branch._id,
      isActive: !branch.isActive
    });
  };

  const onSubmit = (data) => {
    const branchData = {
      name: data.name,
      code: data.code,
      company: data.company,
      address: {
        street: data.address?.street || '',
        city: data.address?.city || '',
        state: data.address?.state || '',
        zipCode: data.address?.zipCode || '',
        country: data.address?.country || 'España'
      },
      contact: {
        phone: data.contact?.phone || '',
        email: data.contact?.email || '',
        manager: data.contact?.manager || ''
      },
      operatingHours: data.operatingHours || {
        monday: { open: '08:00', close: '17:00', closed: false },
        tuesday: { open: '08:00', close: '17:00', closed: false },
        wednesday: { open: '08:00', close: '17:00', closed: false },
        thursday: { open: '08:00', close: '17:00', closed: false },
        friday: { open: '08:00', close: '17:00', closed: false },
        saturday: { open: '08:00', close: '12:00', closed: false },
        sunday: { open: '08:00', close: '12:00', closed: true }
      },

    };
    saveBranchMutation.mutate(branchData);
  };

  const filteredBranches = branchesData?.branches || [];
  const totalCount = branchesData?.total || 0;



  const daysOfWeek = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Gestión de Delegaciones
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Administra las delegaciones de {hasRole('super_admin') ? 'todas las empresas' : 'tu empresa'}
          </Typography>
        </Box>
        {hasPermission('branches', 'create') && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Nueva Delegación
          </Button>
        )}
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar delegaciones..."
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
            {hasRole('super_admin') && (
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Empresa</InputLabel>
                  <Select
                    value={filterCompany}
                    label="Empresa"
                    onChange={(e) => setFilterCompany(e.target.value)}
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {companiesData?.map((company) => (
                      <MenuItem key={company._id} value={company._id}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} md={hasRole('super_admin') ? 3 : 4}>
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
            <Grid item xs={12} md={hasRole('super_admin') ? 2 : 4}>
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

      {/* Tabla de delegaciones */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Delegación</TableCell>
                {hasRole('super_admin') && <TableCell>Empresa</TableCell>}
                <TableCell>Contacto</TableCell>
                <TableCell>Horario</TableCell>
                <TableCell>Estadísticas</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBranches.map((branch) => (
                <TableRow key={branch._id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>
                        <Store />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {branch.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Código: {branch.code}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {branch.address ? 
                            `${branch.address.street}, ${branch.address.city}` :
                            'Sin dirección'
                          }
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  {hasRole('super_admin') && (
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Business sx={{ fontSize: 16, mr: 0.5 }} />
                        <Typography variant="body2">
                          {branch.company?.name}
                        </Typography>
                      </Box>
                    </TableCell>
                  )}
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Phone sx={{ fontSize: 16, mr: 0.5 }} />
                        {branch.contact?.phone || 'Sin teléfono'}
                      </Typography>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                        <Email sx={{ fontSize: 16, mr: 0.5 }} />
                        {branch.contact?.email || 'Sin email'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Schedule sx={{ fontSize: 16, mr: 0.5 }} />
                      <Typography variant="body2">
                        {branch.isOpen ? 'Abierto' : 'Cerrado'}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      L-V: 8:00-17:00
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Vehículos">
                        <Chip
                          icon={<DirectionsCar />}
                          label={branch.vehicleCount || 0}
                          size="small"
                          variant="outlined"
                        />
                      </Tooltip>
                      <Tooltip title="Mantenimientos Activos">
                        <Chip
                          icon={<Build />}
                          label={branch.activeMaintenanceCount || 0}
                          size="small"
                          variant="outlined"
                          color="info"
                        />
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={branch.isActive}
                          onChange={() => handleToggleStatus(branch)}
                          disabled={!hasPermission('branches', 'update')}
                        />
                      }
                      label={branch.isActive ? 'Activo' : 'Inactivo'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, branch)}
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
        {hasPermission('branches', 'read') && (
          <MenuItem onClick={() => { /* Ver detalles */ handleMenuClose(); }}>
            <ListItemIcon>
              <Visibility fontSize="small" />
            </ListItemIcon>
            <ListItemText>Ver Detalles</ListItemText>
          </MenuItem>
        )}
        {hasPermission('branches', 'update') && (
          <MenuItem onClick={() => { handleOpenDialog(selectedBranch); handleMenuClose(); }}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        )}
        <Divider />
        {hasPermission('branches', 'delete') && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Delete fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Eliminar</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Dialog de crear/editar delegación */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingBranch ? 'Editar Delegación' : 'Nueva Delegación'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Información básica */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Información Básica
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nombre de la Delegación"
                  {...register('name', { required: 'El nombre es requerido' })}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Código de Delegación"
                  {...register('code', { required: 'El código es requerido' })}
                  error={!!errors.code}
                  helperText={errors.code?.message}
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
              </Grid>
              {hasRole('super_admin') && (
                <Grid item xs={12} md={6}>
                  <Controller
                    name="company"
                    control={control}
                    rules={{ required: 'La empresa es requerida' }}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.company}>
                        <InputLabel>Empresa</InputLabel>
                        <Select {...field} label="Empresa">
                          {companiesData?.map((company) => (
                            <MenuItem key={company._id} value={company._id}>
                              {company.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              )}
              {/* Dirección */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Dirección
                </Typography>
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Calle y Número"
                  {...register('address.street', { required: 'La calle es requerida' })}
                  error={!!errors.address?.street}
                  helperText={errors.address?.street?.message}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Código Postal"
                  {...register('address.zipCode', { required: 'El código postal es requerido' })}
                  error={!!errors.address?.zipCode}
                  helperText={errors.address?.zipCode?.message}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Ciudad"
                  {...register('address.city', { required: 'La ciudad es requerida' })}
                  error={!!errors.address?.city}
                  helperText={errors.address?.city?.message}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Estado"
                  {...register('address.state', { required: 'El estado es requerido' })}
                  error={!!errors.address?.state}
                  helperText={errors.address?.state?.message}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="País"
                  defaultValue="España"
                  {...register('address.country')}
                />
              </Grid>
              
              {/* Información de contacto */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Información de Contacto
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  {...register('contact.phone')}
                  error={!!errors.contact?.phone}
                  helperText={errors.contact?.phone?.message}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  {...register('contact.email')}
                  error={!!errors.contact?.email}
                  helperText={errors.contact?.email?.message}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Gerente/Encargado"
                  {...register('contact.manager')}
                />
              </Grid>

            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={saveBranchMutation.isPending}
            >
              {saveBranchMutation.isPending ? 'Guardando...' : 'Guardar'}
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
            ¿Estás seguro de que deseas eliminar la delegación <strong>{selectedBranch?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={deleteBranchMutation.isPending}
          >
            {deleteBranchMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Branches;