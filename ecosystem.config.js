module.exports = {
  apps: [{
    name: 'tractoreando',
    script: 'server.js',
    cwd: '/opt/tractoreando',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/opt/tractoreando/logs/err.log',
    out_file: '/opt/tractoreando/logs/out.log',
    log_file: '/opt/tractoreando/logs/combined.log',
    time: true
  }],

  deploy: {
    production: {
      user: 'root',
      host: '192.168.18.13',
      ref: 'origin/main',
      repo: 'git@github.com:tu-usuario/tractoreando.git', // Actualizar con tu repo
      path: '/opt/tractoreando',
      'pre-deploy-local': '',
      'post-deploy': 'npm install --production && cd frontend && npm install && npm run build && cd .. && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /opt/tractoreando/logs'
    }
  }
};