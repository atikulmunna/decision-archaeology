import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Prevent Turbopack from trying to bundle Prisma's Wasm engines
  serverExternalPackages: ['@prisma/client', 'prisma'],
}

export default nextConfig
