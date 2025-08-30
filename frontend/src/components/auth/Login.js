import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Container
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const result = await login(data.email, data.password);
      if (result.success) {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 3
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            {/* Logo y título */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              {/* Logo de AutoCare Agro */}
              <Box sx={{ mb: 2 }}>
                <img 
                  src="/logo.svg" 
                  alt="AutoCare Agro Logo" 
                  style={{ width: '160px', height: '160px' }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Sistema de Gestión de Mantenimiento Vehicular
              </Typography>
            </Box>

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Email */}
              <TextField
                fullWidth
                label="Correo Electrónico"
                type="email"
                margin="normal"
                {...register('email', {
                  required: 'El correo electrónico es requerido',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Correo electrónico inválido'
                  }
                })}
                error={!!errors.email}
                helperText={errors.email?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  )
                }}
              />

              {/* Contraseña */}
              <TextField
                fullWidth
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                margin="normal"
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
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              {/* Botón de login */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>

              {/* Enlaces */}
              <Box sx={{ textAlign: 'center' }}>
                <Link
                  to="/forgot-password"
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    fontSize: '0.875rem'
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </Box>

              {/* Powered by */}
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Powered by{' '}
                  <Typography
                    component="a"
                    href="https://www.softreria.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="caption"
                    sx={{
                      fontWeight: 'bold',
                      color: 'primary.main',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Softreria SL
                  </Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  © {new Date().getFullYear()} Todos los derechos reservados
                </Typography>
              </Box>

            </form>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Login;