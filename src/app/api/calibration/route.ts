import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { summarizeCalibration } from '@/lib/calibration'
import { getOrCreateDbUser } from '@/lib/db-user'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Fetch all records with outcomes that have predictions
  const records = await prisma.decisionRecord.findMany({
    where: { userId: dbUser.id, isDraft: false },
    include: { outcomes: true, forecasts: { orderBy: { position: 'asc' } } },
  })

  return NextResponse.json(summarizeCalibration(records, new Date()))
}
