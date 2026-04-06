import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'CLERK_WEBHOOK_SECRET',
  'NEXT_PUBLIC_APP_URL',
] as const

export async function GET() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])

  try {
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      ok: missing.length === 0,
      database: 'connected',
      missingEnvVars: missing,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[health] database check failed:', error)

    return NextResponse.json(
      {
        ok: false,
        database: 'error',
        missingEnvVars: missing,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
