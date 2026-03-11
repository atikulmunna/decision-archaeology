import type { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy getter — Prisma is NOT instantiated at module load time.
// It is only created when first accessed at request time.
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    // Dynamic require to avoid Turbopack evaluating this at build time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require('@prisma/client')
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }
  return globalForPrisma.prisma!
}

// Convenience proxy export — keeps all existing code working without changes
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
