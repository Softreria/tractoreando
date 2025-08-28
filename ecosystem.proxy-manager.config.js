module.exports = {
  apps: [{
    name: 'tractoreando-backend',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    
    // Variables de entorno específicas para Proxy Manager
    env: {
      NODE_ENV: 'development',
      PORT: 3002
    },
    
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002,
      MONGODB_URI: 'mongodb://localhost:27017/tractoreando',
      
      // Configuración específica para Proxy Manager
      TRUST_PROXY: 'true',
      PROXY_HEADERS: 'true',
      CORS_ORIGIN: '*',
      CORS_CREDENTIALS: 'true',
      
      // Configuración de seguridad
      JWT_SECRET: 'tu_jwt_secret_muy_seguro_aqui_cambiar_en_produccion',
      JWT_EXPIRES_IN: '24h',
      SESSION_SECRET: 'tu_session_secret_muy_seguro_aqui_cambiar_en_produccion',
      
      // Configuración de archivos
      UPLOAD_PATH: './uploads',
      MAX_FILE_SIZE: '50MB',
      
      // Configuración de logs
      LOG_LEVEL: 'info',
      LOG_FILE: './logs/app.log'
    },
    
    // Configuración de PM2
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads', 'backups'],
    
    // Configuración de logs
    log_file: './logs/pm2-combined.log',
    out_file: './logs/pm2-out.log',
    error_file: './logs/pm2-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Configuración de reinicio
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
    
    // Configuración de cluster (deshabilitado para este caso)
    instances: 1,
    exec_mode: 'fork',
    
    // Variables específicas para entorno con proxy
    node_args: '--max-old-space-size=512',
    
    // Configuración de monitoreo
    monitoring: false,
    
    // Configuración de merge logs
    merge_logs: true,
    
    // Configuración de tiempo
    kill_timeout: 5000,
    listen_timeout: 8000,
    
    // Configuración específica para proxy manager
    env_file: '.env.proxy-manager'
  }]
};