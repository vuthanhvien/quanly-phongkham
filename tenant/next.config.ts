import type { NextConfig } from 'next'
const config: NextConfig = { output: 'standalone', serverExternalPackages: ['typeorm', 'mysql2', 'bcryptjs', 'jsonwebtoken'] }
export default config
