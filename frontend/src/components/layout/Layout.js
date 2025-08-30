import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Business,
  Store,
  DirectionsCar,
  Build,
  People,
  Assessment,
  Settings,
  Logout,
  Person,
  Notifications,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const drawerWidth = 280;

const menuItems = [
  {
    text: 'Dashboard',
    icon: <Dashboard />,
    path: '/dashboard',
    roles: ['super_admin', 'company_admin', 'branch_manager', 'mechanic', 'operator', 'viewer']
  },
  {
    text: 'Empresas',
    icon: <Business />,
    path: '/companies',
    roles: ['super_admin']
  },
  {
    text: 'Delegaciones',
    icon: <Store />,
    path: '/branches',
    roles: ['super_admin', 'company_admin', 'branch_manager']
  },
  {
    text: 'Vehículos',
    icon: <DirectionsCar />,
    path: '/vehicles',
    roles: ['super_admin', 'company_admin', 'branch_manager', 'mechanic', 'operator', 'viewer']
  },
  {
    text: 'Mantenimiento',
    icon: <Build />,
    path: '/maintenance',
    roles: ['super_admin', 'company_admin', 'branch_manager', 'mechanic', 'operator']
  },
  {
    text: 'Usuarios',
    icon: <People />,
    path: '/users',
    roles: ['super_admin', 'company_admin', 'branch_manager']
  },
  {
    text: 'Reportes',
    icon: <Assessment />,
    path: '/reports',
    roles: ['super_admin', 'company_admin', 'branch_manager', 'viewer']
  }
];

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setDrawerOpen(!drawerOpen);
    }
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      toast.error('Error al cerrar sesión');
    }
    handleProfileMenuClose();
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.some(role => hasRole(role))
  );

  const drawer = (
    <Box>
      {/* Logo y título */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: drawerOpen ? 'flex-start' : 'center',
          px: drawerOpen ? 2 : 1,
          py: 2,
          minHeight: 64
        }}
      >
        {/* Logo de AutoCare Agro */}
        <Box sx={{ mr: drawerOpen ? 1 : 0 }}>
          <img 
            src="/logo.svg" 
            alt="AutoCare Agro Logo" 
            style={{ width: '40px', height: '40px' }}
          />
        </Box>
        {drawerOpen && (
          <Box>
            <Typography variant="h6" noWrap component="div" sx={{ color: '#2E7D32', fontWeight: 'bold', lineHeight: 1 }}>
              AutoCare
            </Typography>
            <Typography variant="caption" noWrap component="div" sx={{ color: '#FF9800', fontWeight: 'bold', lineHeight: 1 }}>
              Agro
            </Typography>
          </Box>
        )}
      </Box>
      
      <Divider />
      
      {/* Información del usuario */}
      {drawerOpen && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Avatar
            sx={{ width: 56, height: 56, mx: 'auto', mb: 1 }}
            src={user?.avatar}
          >
            {user?.name?.[0]}{user?.lastName?.[0]}
          </Avatar>
          <Typography variant="subtitle2" noWrap>
            {user?.name} {user?.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user?.company?.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {user?.role === 'super_admin' ? 'Super Admin' :
             user?.role === 'company_admin' ? 'Admin Empresa' :
             user?.role === 'branch_manager' ? 'Gerente Delegación' :
             user?.role === 'mechanic' ? 'Mecánico' :
             user?.role === 'operator' ? 'Operador' : 'Visualizador'}
          </Typography>
        </Box>
      )}
      
      <Divider />
      
      {/* Menú de navegación */}
      <List>
        {filteredMenuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding>
              <Tooltip title={!drawerOpen ? item.text : ''} placement="right">
                <ListItemButton
                  selected={isActive}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    minHeight: 48,
                    justifyContent: drawerOpen ? 'initial' : 'center',
                    px: 2.5,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.dark'
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText'
                      }
                    }
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: drawerOpen ? 3 : 'auto',
                      justifyContent: 'center'
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {drawerOpen && <ListItemText primary={item.text} />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerOpen ? drawerWidth : 64}px)` },
          ml: { md: `${drawerOpen ? drawerWidth : 64}px` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen
          })
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            {isMobile ? <MenuIcon /> : (drawerOpen ? <ChevronLeft /> : <ChevronRight />)}
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {filteredMenuItems.find(item => item.path === location.pathname)?.text || 'AutoCare Agro'}
          </Typography>
          
          {/* Notificaciones */}
          <IconButton color="inherit" sx={{ mr: 1 }}>
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          
          {/* Menú de usuario */}
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="primary-search-account-menu"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar
              sx={{ width: 32, height: 32 }}
              src={user?.avatar}
            >
              {user?.name?.[0]}{user?.lastName?.[0]}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>
      
      {/* Menú desplegable del usuario */}
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
      >
        <MenuItem onClick={() => { handleNavigation('/profile'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          Mi Perfil
        </MenuItem>
        <MenuItem onClick={() => { handleNavigation('/settings'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          Configuración
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Cerrar Sesión
        </MenuItem>
      </Menu>
      
      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerOpen ? drawerWidth : 64 }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth
            }
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerOpen ? drawerWidth : 64,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen
              }),
              overflowX: 'hidden'
            }
          }}
          open={drawerOpen}
        >
          {drawer}
        </Drawer>
      </Box>
      
      {/* Contenido principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerOpen ? drawerWidth : 64}px)` },
          mt: 8
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;