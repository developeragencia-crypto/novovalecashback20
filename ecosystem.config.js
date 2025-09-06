module.exports = {
  apps: [{
    name: 'valecashback',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    cwd: '/var/www/valecashback',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/valecashback/err.log',
    out_file: '/var/log/valecashback/out.log',
    log_file: '/var/log/valecashback/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '*.log'],
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};