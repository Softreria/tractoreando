import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  Event,
  Build,
  Warning,
  CheckCircle,
  Schedule
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const MaintenanceCalendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterBranch, setFilterBranch] = useState('');
  const [viewMode, setViewMode] = useState('month'); // month, week, day

  // Obtener rango de fechas para la consulta
  const getDateRange = () => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  };

  // Consulta para obtener eventos del calendario
  const { data: eventsData, isLoading, error } = useQuery({
    queryKey: ['maintenance-calendar', currentDate.getMonth(), currentDate.getFullYear(), filterBranch],
    queryFn: async () => {
      const { start, end } = getDateRange();
      const params = { start, end };
      if (filterBranch) params.branch = filterBranch;
      
      const response = await api.get('/maintenance/calendar/events', { params });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Consulta para obtener delegaciones
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
    }
  });

  const events = eventsData?.events || [];

  // Funciones de navegación
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Obtener color según el estado
  const getStatusColor = (status) => {
    switch (status) {
      case 'completado': return '#4caf50';
      case 'en_proceso': return '#ff9800';
      case 'programado': return '#2196f3';
      case 'cancelado': return '#f44336';
      case 'pausado': return '#9e9e9e';
      default: return '#757575';
    }
  };

  // Obtener icono según el estado
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completado': return <CheckCircle />;
      case 'en_proceso': return <Build />;
      case 'programado': return <Schedule />;
      case 'cancelado': return <Warning />;
      default: return <Event />;
    }
  };

  // Generar días del mes
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      days.push(new Date(date));
    }
    
    return days;
  };

  // Obtener eventos para un día específico
  const getEventsForDay = (date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= dayStart && eventDate <= dayEnd;
    });
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  if (error) {
    return (
      <Alert severity="error">
        Error al cargar el calendario: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header del calendario */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h2">
              Calendario de Mantenimientos
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Delegación</InputLabel>
                <Select
                  value={filterBranch}
                  label="Delegación"
                  onChange={(e) => setFilterBranch(e.target.value)}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {branchesData?.map((branch) => (
                    <MenuItem key={branch._id} value={branch._id}>
                      {branch.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          
          {/* Navegación del calendario */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={goToPreviousMonth}>
                <ChevronLeft />
              </IconButton>
              <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center' }}>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Typography>
              <IconButton onClick={goToNextMonth}>
                <ChevronRight />
              </IconButton>
            </Box>
            <Button
              variant="outlined"
              startIcon={<Today />}
              onClick={goToToday}
            >
              Hoy
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Calendario */}
      <Card>
        <CardContent>
          {/* Encabezados de días */}
          <Grid container spacing={0} sx={{ mb: 1 }}>
            {dayNames.map((day) => (
              <Grid item xs key={day} sx={{ textAlign: 'center', py: 1, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {day}
                </Typography>
              </Grid>
            ))}
          </Grid>

          {/* Días del calendario */}
          <Grid container spacing={0}>
            {calendarDays.map((day, index) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <Grid 
                  item 
                  xs 
                  key={index} 
                  sx={{ 
                    minHeight: 120,
                    border: 1,
                    borderColor: 'divider',
                    p: 1,
                    backgroundColor: isToday ? 'action.selected' : 'transparent',
                    opacity: isCurrentMonth ? 1 : 0.5
                  }}
                >
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: isToday ? 'bold' : 'normal',
                      color: isToday ? 'primary.main' : 'text.primary'
                    }}
                  >
                    {day.getDate()}
                  </Typography>
                  
                  {/* Eventos del día */}
                  <Box sx={{ mt: 1 }}>
                    {dayEvents.slice(0, 3).map((event, eventIndex) => (
                      <Chip
                        key={eventIndex}
                        label={event.title}
                        size="small"
                        sx={{
                          mb: 0.5,
                          width: '100%',
                          backgroundColor: getStatusColor(event.extendedProps.status),
                          color: 'white',
                          fontSize: '0.7rem',
                          height: 20,
                          cursor: 'pointer',
                          '& .MuiChip-label': {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }
                        }}
                        onClick={() => handleEventClick(event)}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        +{dayEvents.length - 3} más
                      </Typography>
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* Dialog de detalles del evento */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {selectedEvent && getStatusIcon(selectedEvent.extendedProps.status)}
          Detalles del Mantenimiento
        </DialogTitle>
        <DialogContent>
          {selectedEvent && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6">{selectedEvent.title}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Orden de Trabajo:</Typography>
                <Typography variant="body1">{selectedEvent.extendedProps.workOrderNumber}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Estado:</Typography>
                <Chip 
                  label={selectedEvent.extendedProps.status}
                  size="small"
                  sx={{ backgroundColor: getStatusColor(selectedEvent.extendedProps.status), color: 'white' }}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Prioridad:</Typography>
                <Chip 
                  label={selectedEvent.extendedProps.priority}
                  size="small"
                  color={
                    selectedEvent.extendedProps.priority === 'critica' ? 'error' :
                    selectedEvent.extendedProps.priority === 'alta' ? 'warning' :
                    selectedEvent.extendedProps.priority === 'media' ? 'info' : 'default'
                  }
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Fecha Programada:</Typography>
                <Typography variant="body1">
                  {new Date(selectedEvent.start).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>
              </Grid>
              {selectedEvent.extendedProps.vehicle && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Vehículo:</Typography>
                  <Typography variant="body1">
                    {selectedEvent.extendedProps.vehicle.plateNumber} - 
                    {selectedEvent.extendedProps.vehicle.make} {selectedEvent.extendedProps.vehicle.model}
                  </Typography>
                </Grid>
              )}
              {selectedEvent.extendedProps.branch && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Delegación:</Typography>
                  <Typography variant="body1">{selectedEvent.extendedProps.branch.name}</Typography>
                </Grid>
              )}
              {selectedEvent.extendedProps.assignedTo && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Asignado a:</Typography>
                  <Typography variant="body1">
                    {selectedEvent.extendedProps.assignedTo.firstName} {selectedEvent.extendedProps.assignedTo.lastName}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cerrar</Button>
          <Button variant="contained" onClick={() => {
            // Aquí podrías navegar a la página de detalles del mantenimiento
            toast.info('Funcionalidad de edición pendiente');
          }}>
            Ver Detalles
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaintenanceCalendar;