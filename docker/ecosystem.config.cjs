module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: '/app/backend',
      script: 'node',
      args: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.BACKEND_PORT || '3001',
      },
    },
    {
      name: 'landing',
      cwd: '/app/landing',
      script: 'node',
      args: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.LANDING_PORT || '3002',
        HOSTNAME: '0.0.0.0',
        LANDING_API_URL:
          process.env.LANDING_API_URL || 'http://127.0.0.1:3001/api',
        LANDING_REVALIDATE_SECRET: process.env.LANDING_REVALIDATE_SECRET || process.env.JWT_SECRET,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
      },
    },
    {
      name: 'cms',
      cwd: '/app',
      script: '/opt/runtime/node_modules/.bin/serve',
      args: '-s cms-dist -l 3003',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'gateway',
      cwd: '/app',
      script: 'node',
      args: 'docker/gateway.cjs',
      env: {
        NODE_ENV: 'production',
        NODE_PATH: '/opt/runtime/node_modules',
        PORT: process.env.PORT || '80',
        BACKEND_URL: process.env.BACKEND_URL || 'http://127.0.0.1:3001',
        CMS_URL: process.env.CMS_URL || 'http://127.0.0.1:3003',
        LANDING_URL: process.env.LANDING_URL || 'http://127.0.0.1:3002',
      },
    },
  ],
};
