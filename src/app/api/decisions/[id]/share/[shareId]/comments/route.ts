import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string; shareId: string }> }

async function getAuthorizedShare(shareId: string, decisionId: string, dbUserId: string) {
  const share = await prisma.collaboratorShare.findFirst({
    where: { id: shareId, decisionId, isActive: true },
    include: { decision: true },
  })
  if (!share) return null
  // Allow owner or active collaborator
  if (share.ownerId !== dbUserId && share.collaboratorId !== dbUserId) return null
  return share
}

// GET /api/decisions/:id/share/:shareId/comments
export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, shareId } = await params
  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const share = await getAuthorizedShare(shareId, id, dbUser.id)
  if (!share) return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 })

  const comments = await prisma.collaboratorComment.findMany({
    where: { shareId },
    orderBy: { createdAt: 'asc' },
  })

  // Attach author info
  const authorIds = [...new Set(comments.map((c) => c.authorId))]
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, displayName: true, avatarUrl: true },
  })
  const authorMap = Object.fromEntries(authors.map((a) => [a.id, a]))

  return NextResponse.json(
    comments.map((c) => ({ ...c, author: authorMap[c.authorId] ?? null }))
  )
}

const CommentSchema = z.object({ content: z.string().min(1).max(2000) })

// POST /api/decisions/:id/share/:shareId/comments
export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, shareId } = await params
  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const share = await getAuthorizedShare(shareId, id, dbUser.id)
  if (!share) return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 })

  const body = await req.json()
  const parsed = CommentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Content required (max 2000 chars)' }, { status: 400 })
  }

  const comment = await prisma.collaboratorComment.create({
    data: { shareId, authorId: dbUser.id, content: parsed.data.content },
  })

  return NextResponse.json({ ...comment, author: { id: dbUser.id, displayName: dbUser.displayName, avatarUrl: dbUser.avatarUrl } }, { status: 201 })
}
