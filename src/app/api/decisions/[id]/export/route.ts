import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import {
  buildDecisionMarkdown,
  getDecisionFilename,
  toPortableDecision,
} from '@/lib/portability'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const format = req.nextUrl.searchParams.get('format')
  if (format !== 'json' && format !== 'markdown') {
    return NextResponse.json({ error: 'Unsupported export format.' }, { status: 400 })
  }

  const record = await prisma.decisionRecord.findFirst({
    where: { id, userId: dbUser.id, isDraft: false },
    include: { outcomes: { orderBy: { createdAt: 'asc' } } },
  })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = format === 'json'
    ? JSON.stringify(toPortableDecision(record), null, 2)
    : buildDecisionMarkdown(record)

  return new NextResponse(body, {
    headers: {
      'Content-Type': format === 'json' ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${getDecisionFilename(record.title, format)}"`,
    },
  })
}
