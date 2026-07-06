module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: '/app/backend',
      script: 'npm',
      args: 'run start:dev',
      interpreter: 'none',
      env: {
        NODE_ENV: 'development',
        PORT: process.env.BACKEND_PORT || '3001',
        CHOKIDAR_USEPOLLING: process.env.CHOKIDAR_USEPOLLING || 'true',
      },
    },
    {
      name: 'cms',
      cwd: '/app/cms',
      script: 'npm',
      args: 'run dev -- --host 0.0.0.0 --port 3003 --strictPort',
      interpreter: 'none',
      env: {
        NODE_ENV: 'development',
        VITE_API_URL: process.env.VITE_API_URL || '/api',
        VITE_BASE_PATH: process.env.VITE_BASE_PATH || '/admin/',
        CHOKIDAR_USEPOLLING: process.env.CHOKIDAR_USEPOLLING || 'true',
      },
    },
    {
      name: 'landing',
      cwd: '/app/landing',
      script: 'npm',
      args: 'run dev -- --hostname 0.0.0.0 --port 3002',
      interpreter: 'none',
      env: {
        NODE_ENV: 'development',
        PORT: process.env.LANDING_PORT || '3002',
        HOSTNAME: '0.0.0.0',
        LANDING_API_URL:
          process.env.LANDING_API_URL || 'http://127.0.0.1:3001/api',
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
        CHOKIDAR_USEPOLLING: process.env.CHOKIDAR_USEPOLLING || 'true',
      },
    },
    {
      name: 'gateway',
      cwd: '/app',
      script: 'node',
      args: 'docker/gateway.cjs',
      env: {
        NODE_ENV: 'development',
        NODE_PATH: '/opt/runtime/node_modules',
        PORT: process.env.PORT || '9999',
        BACKEND_URL: process.env.BACKEND_URL || 'http://127.0.0.1:3001',
        CMS_URL: process.env.CMS_URL || 'http://127.0.0.1:3003',
        LANDING_URL: process.env.LANDING_URL || 'http://127.0.0.1:3002',
      },
    },
  ],
};
