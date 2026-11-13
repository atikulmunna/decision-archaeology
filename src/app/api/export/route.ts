import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { SEALED_RELATIONS } from '@/lib/seal'
import {
  buildArchiveExport,
  buildArchiveMarkdown,
  getArchiveFilename,
} from '@/lib/portability'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const format = req.nextUrl.searchParams.get('format')
  if (format !== 'json' && format !== 'markdown') {
    return NextResponse.json({ error: 'Unsupported export format.' }, { status: 400 })
  }

  const records = await prisma.decisionRecord.findMany({
    where: { userId: dbUser.id, isDraft: false },
    include: { outcomes: { orderBy: { createdAt: 'asc' } }, assumptionReviews: { orderBy: { createdAt: 'asc' } }, ...SEALED_RELATIONS, fieldNotes: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  })
  // Notes on no decision, or on an unfinished draft (drafts are not exported), travel at the top level.
  const freeNotes = await prisma.fieldNote.findMany({
    where: { userId: dbUser.id, OR: [{ decisionId: null }, { decision: { isDraft: true } }] },
    orderBy: { createdAt: 'asc' },
  })

  const body = format === 'json'
    ? JSON.stringify(buildArchiveExport(records, freeNotes), null, 2)
    : buildArchiveMarkdown(records)

  return new NextResponse(body, {
    headers: {
      'Content-Type': format === 'json' ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${getArchiveFilename(format)}"`,
    },
  })
}
