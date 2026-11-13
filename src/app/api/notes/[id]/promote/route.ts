import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { promotedTitle } from '@/lib/field-notes'
import { findOwnNote, notFound, requireOwner } from '@/lib/field-note-access'
import { atFreeRecordLimit, FREE_LIMIT_MESSAGE } from '@/lib/record-limit'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

class AlreadyLinked extends Error {}

const alreadyLinked = () => NextResponse.json({ error: 'This note is already linked to a decision.' }, { status: 409 })

// POST /api/notes/:id/promote: turn a free-standing note into a decision draft, linked as its origin
export async function POST(_req: NextRequest, { params }: Params) {
  const owner = await requireOwner()
  if (!owner.ok) return owner.response

  const { id } = await params
  const note = await findOwnNote(owner.userId, id)
  if (!note) return notFound()
  if (note.decisionId) return alreadyLinked()
  // A draft is a new record, so the free tier's limit applies as it does to starting one by hand.
  if (await atFreeRecordLimit({ id: owner.userId, tier: owner.tier })) {
    return NextResponse.json({ error: FREE_LIMIT_MESSAGE }, { status: 403 })
  }

  try {
    const draftId = await prisma.$transaction(async (tx) => {
      const draft = await tx.decisionRecord.create({
        data: {
          userId: owner.userId,
          isDraft: true,
          title: promotedTitle(note.body),
          summary: '',
          context: note.body,
          alternatives: '',
          chosenOption: '',
          reasoning: '',
          customTags: [],
        },
        select: { id: true },
      })
      // Link only a note that is still free-standing. A second promote racing this one finds it
      // taken once the first commits, and throwing rolls its draft back.
      const linked = await tx.fieldNote.updateMany({
        where: { id: note.id, userId: owner.userId, decisionId: null },
        data: { decisionId: draft.id, promoted: true },
      })
      if (linked.count === 0) throw new AlreadyLinked()
      return draft.id
    })
    return NextResponse.json({ draftId }, { status: 201 })
  } catch (error) {
    if (error instanceof AlreadyLinked) return alreadyLinked()
    throw error
  }
}
