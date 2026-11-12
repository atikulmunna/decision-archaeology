import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getOrCreateDbUser } from '@/lib/db-user'
import { isDecisionLocked } from '@/lib/locks'
import { resolutionBlock } from '@/lib/forecasting'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string; forecastId: string }> }

const ResolveSchema = z.object({ resolution: z.enum(['HAPPENED', 'DIDNT', 'VOID']).nullable() })

// PUT /api/decisions/:id/forecasts/:forecastId: resolve, change or reopen one forecast
export async function PUT(req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = ResolveSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const { id, forecastId } = await params
  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const record = await prisma.decisionRecord.findFirst({ where: { id, userId: dbUser.id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const forecast = await prisma.forecast.findFirst({ where: { id: forecastId, decisionId: record.id } })
  if (!forecast) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  // Imported records never lock, so they can be resolved straight away.
  if (record.isDraft || (!isDecisionLocked(record, now) && !record.isImported)) {
    return NextResponse.json({ error: 'Resolve forecasts once the decision is sealed.' }, { status: 409 })
  }

  const { resolution } = parsed.data
  const blocked = resolutionBlock(forecast.resolveBy, resolution, now)
  if (blocked) return NextResponse.json({ error: blocked }, { status: 409 })

  const updated = await prisma.forecast.update({
    where: { id: forecast.id },
    data: { resolution, resolvedAt: resolution === null ? null : now },
  })
  return NextResponse.json(updated)
}
