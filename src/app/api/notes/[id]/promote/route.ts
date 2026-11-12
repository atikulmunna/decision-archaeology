import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { promotedTitle } from '@/lib/field-notes'
import { findOwnNote, notFound, requireOwner } from '@/lib/field-note-access'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

// POST /api/notes/:id/promote: turn a free-standing note into a decision draft, linked as its origin
export async function POST(_req: NextRequest, { params }: Params) {
  const owner = await requireOwner()
  if (!owner.ok) return owner.response

  const { id } = await params
  const note = await findOwnNote(owner.userId, id)
  if (!note) return notFound()
  if (note.decisionId) {
    return NextResponse.json({ error: 'This note is already linked to a decision.' }, { status: 409 })
  }

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
    await tx.fieldNote.update({ where: { id: note.id }, data: { decisionId: draft.id, promoted: true } })
    return draft.id
  })

  return NextResponse.json({ draftId }, { status: 201 })
}
