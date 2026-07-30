module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: '/app/backend',
      script: 'node',
      args: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.API_PORT || '9998',
      },
    },
    {
      name: 'landing',
      cwd: '/app/landing',
      script: 'node',
      args: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.LANDING_PORT || '9997',
        HOSTNAME: '0.0.0.0',
        LANDING_API_URL:
          process.env.LANDING_API_URL || 'http://127.0.0.1:9998/api',
        LANDING_REVALIDATE_SECRET: process.env.LANDING_REVALIDATE_SECRET || process.env.JWT_SECRET,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
      },
    },
    {
      name: 'cms',
      cwd: '/app',
      script: '/opt/runtime/node_modules/.bin/serve',
      args: `-s cms-dist -l ${process.env.CMS_PORT || '9999'}`,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
