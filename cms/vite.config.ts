import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const defaultAllowedHosts = ['cms.quanly-phongkham.orb.local'];

const envAllowedHosts = (process.env.VITE_ALLOWED_HOSTS || '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: [...new Set([...defaultAllowedHosts, ...envAllowedHosts])],
  },
});