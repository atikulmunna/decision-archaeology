import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import {
  ATTACHMENT_LIMITS,
  AttachmentSummary,
  buildAttachmentKey,
  canAddMoreAttachments,
  getAttachmentDisplayName,
  validateAttachment,
} from '@/lib/attachments'
import { deleteFile, getSignedDownloadUrl, uploadFile } from '@/lib/storage'
import { getOrCreateDbUser } from '@/lib/db-user'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

async function getOwnedDecision(clerkUserId: string, decisionId: string) {
  const dbUser = await getOrCreateDbUser(clerkUserId)
  if (!dbUser) return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) }

  const decision = await prisma.decisionRecord.findFirst({
    where: { id: decisionId, userId: dbUser.id },
  })

  if (!decision) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }

  return { dbUser, decision }
}

async function summarizeAttachments(keys: string[]): Promise<AttachmentSummary[]> {
  return Promise.all(
    keys.map(async (key) => ({
      key,
      name: getAttachmentDisplayName(key),
      url: await getSignedDownloadUrl(key),
    }))
  )
}

// GET /api/decisions/:id/attachments
export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const result = await getOwnedDecision(userId, id)
  if ('error' in result) return result.error

  const attachments = await summarizeAttachments(result.decision.attachments)
  return NextResponse.json({ attachments })
}

// POST /api/decisions/:id/attachments
export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const result = await getOwnedDecision(userId, id)
  if ('error' in result) return result.error

  const { decision } = result
  if (!canAddMoreAttachments(decision.attachments.length)) {
    return NextResponse.json(
      { error: `Maximum ${ATTACHMENT_LIMITS.maxAttachments} attachments allowed.` },
      { status: 422 }
    )
  }

  const formData = await req.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'A file is required.' }, { status: 400 })
  }

  const validationError = validateAttachment(file)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const key = buildAttachmentKey(decision.id, file.name)
  const bytes = new Uint8Array(await file.arrayBuffer())

  await uploadFile(key, bytes, file.type)

  const updated = await prisma.decisionRecord.update({
    where: { id: decision.id },
    data: { attachments: [...decision.attachments, key] },
  })

  const attachment = {
    key,
    name: getAttachmentDisplayName(key),
    url: await getSignedDownloadUrl(key),
  }

  return NextResponse.json(
    { attachment, count: updated.attachments.length },
    { status: 201 }
  )
}

// DELETE /api/decisions/:id/attachments?key=...
export async function DELETE(req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const result = await getOwnedDecision(userId, id)
  if ('error' in result) return result.error

  const key = new URL(req.url).searchParams.get('key')
  if (!key) {
    return NextResponse.json({ error: 'Attachment key is required.' }, { status: 400 })
  }

  if (!result.decision.attachments.includes(key)) {
    return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 })
  }

  await deleteFile(key)

  const updated = await prisma.decisionRecord.update({
    where: { id: result.decision.id },
    data: { attachments: result.decision.attachments.filter((attachmentKey) => attachmentKey !== key) },
  })

  return NextResponse.json({ removed: true, count: updated.attachments.length })
}
