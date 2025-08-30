require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
});
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');

const app = express();

// Configuración para proxy (nginx)
app.set('trust proxy', true);

// Middleware de seguridad y CORS optimizado para producción
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, process.env.DOMAIN_URL].filter(Boolean)
    : true,
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Headers de seguridad para producción
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'API de Tractoreando funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check específico para Nginx Proxy Manager
app.get('/health-check', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'tractoreando-backend',
    port: process.env.PORT || 3002,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rutas de la API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/branches', require('./routes/branches'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reports', require('./routes/reports'));

// Servir archivos estáticos en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend/build')));
  
  // Solo capturar rutas que no sean de API
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
  });
}

// Conexión a la base de datos
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL conectado exitosamente');
    
    // Sincronizar modelos en desarrollo
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ force: false });
      console.log('✅ Modelos sincronizados con la base de datos.');
    }
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    process.exit(1);
  }
};

// Conectar a la base de datos
connectDB();

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

// Reinicio del servidor