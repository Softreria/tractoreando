import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  Container,
  Alert
} from '@mui/material';
import {
  Email,
  ArrowBack,
  Business
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { forgotPassword } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await forgotPassword(data.email);
      setEmailSent(true);
      toast.success('Correo de recuperación enviado');
    } catch (error) {
      toast.error(error.message || 'Error al enviar el correo de recuperación');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
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
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Business sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              
              <Typography variant="h5" component="h1" gutterBottom>
                Correo Enviado
              </Typography>
              
              <Alert severity="success" sx={{ mb: 3 }}>
                Hemos enviado un enlace de recuperación a <strong>{getValues('email')}</strong>
              </Alert>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
                Si no recibes el correo en unos minutos, revisa tu carpeta de spam.
              </Typography>
              
              <Button
                component={Link}
                to="/login"
                variant="contained"
                fullWidth
                startIcon={<ArrowBack />}
              >
                Volver al Login
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

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
              <Business sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" component="h1" gutterBottom>
                Recuperar Contraseña
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
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

              {/* Botón de envío */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {isLoading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
              </Button>

              {/* Enlace de regreso */}
              <Box sx={{ textAlign: 'center' }}>
                <Button
                  component={Link}
                  to="/login"
                  variant="text"
                  startIcon={<ArrowBack />}
                >
                  Volver al Login
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default ForgotPassword;