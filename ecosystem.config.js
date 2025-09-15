module.exports = {
  apps: [
    {
      name: 'tractoreando-backend',
      script: 'server.js',
      cwd: process.cwd(),
      instances: 1, // Usar solo una instancia para evitar conflictos de puerto
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
        DB_NAME: 'tractoreando_prod',
        DB_USER: 'tractoreando_user',
        DB_PASSWORD: 'CHANGE_THIS_SECURE_PASSWORD',
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        JWT_SECRET: 'CHANGE_THIS_JWT_SECRET_IN_PRODUCTION_MINIMUM_32_CHARS',
        JWT_EXPIRES_IN: '24h',
        BCRYPT_ROUNDS: 12,
        UPLOAD_PATH: './uploads',
        MAX_FILE_SIZE: '10mb',
        ALLOWED_FILE_TYPES: 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx',
        CORS_ORIGIN: 'https://tractoreando.softreria.com',
        RATE_LIMIT_WINDOW: '15',
        RATE_LIMIT_MAX: '100',
        LOG_LEVEL: 'warn'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 8001,
        DB_NAME: 'tractoreando_dev',
        DB_USER: 'postgres',
        DB_PASSWORD: 'postgres',
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        LOG_LEVEL: 'debug'
      },
      // Configuración de logs
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Configuración de reinicio automático optimizada
      max_memory_restart: '1G',
      restart_delay: 2000,
      max_restarts: 5,
      min_uptime: '30s',
      exp_backoff_restart_delay: 100,
      
      // Configuración de monitoreo
      watch: false, // No usar watch en producción
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      
      // Configuración de cluster optimizada
      kill_timeout: 3000,
      listen_timeout: 5000,
      shutdown_with_message: true,
      
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