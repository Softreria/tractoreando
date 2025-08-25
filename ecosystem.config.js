module.exports = {
  apps: [
    {
      name: 'tractoreando-backend',
      script: 'server.js',
      cwd: process.cwd(),
      instances: 'max', // Usar todos los cores disponibles
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
        MONGODB_URI: 'mongodb://localhost:27017/tractoreando_prod',
        JWT_SECRET: 'your-super-secret-jwt-key-change-this',
        JWT_EXPIRE: '7d',
        BCRYPT_ROUNDS: 12,
        UPLOAD_PATH: './uploads',
        MAX_FILE_SIZE: '10mb',
        ALLOWED_FILE_TYPES: 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx',
        CORS_ORIGIN: 'http://localhost',
        RATE_LIMIT_WINDOW: '15',
        RATE_LIMIT_MAX: '100',
        LOG_LEVEL: 'info'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 8000,
        MONGODB_URI: 'mongodb://localhost:27017/tractoreando_dev',
        LOG_LEVEL: 'debug'
      },
      // Configuración de logs
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Configuración de reinicio automático
      max_memory_restart: '500M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Configuración de monitoreo
      watch: false, // No usar watch en producción
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      
      // Configuración de cluster
      kill_timeout: 5000,
      listen_timeout: 8000,
      
      // Variables de entorno específicas
      source_map_support: false,
      
      // Configuración de autorestart
      autorestart: true,
      
      // Configuración de cron para restart automático (opcional)
      // cron_restart: '0 2 * * *', // Reiniciar todos los días a las 2 AM
      
      // Configuración de merge logs
      merge_logs: true,
      combine_logs: true,
      
      // Configuración de tiempo
      time: true,
      
      // Configuración adicional de monitoreo
      wait_ready: true,
      env_file: './.env'
    }
  ],
  
  // Configuración de deployment (opcional)
  deploy: {
    production: {
      user: 'tractoreando',
      host: ['your-server-ip'], // Cambiar por la IP del servidor
      ref: 'origin/main',
      repo: 'https://github.com/tu-usuario/tractoreando.git', // Cambiar por tu repositorio
      path: '/opt/tractoreando',
      'post-deploy': 'npm install --production && cd frontend && npm install && npm run build && cd .. && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y'
    },
    
    staging: {
      user: 'tractoreando',
      host: ['staging-server-ip'],
      ref: 'origin/develop',
      repo: 'https://github.com/tu-usuario/tractoreando.git',
      path: '/opt/tractoreando-staging',
      'post-deploy': 'npm install && cd frontend && npm install && npm run build && cd .. && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
        PORT: 5000
      }
    }
  }
};