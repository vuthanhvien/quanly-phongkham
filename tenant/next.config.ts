import type { NextConfig } from 'next'
const config: NextConfig = {
  output: 'standalone',
  // Preserve the request URL. API clients receive a useful 400/405 response
  // instead of Next.js redirecting `/api/tenants/` with HTTP 308.
  skipTrailingSlashRedirect: true,
  serverExternalPackages: ['typeorm', 'mysql2', 'bcryptjs', 'jsonwebtoken'],
}
export default config
