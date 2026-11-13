import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findOwnNote, notFound, ownsDecision, readJson, requireOwner, WITH_DECISION } from '@/lib/field-note-access'
import { UpdateNoteSchema } from '@/lib/validations/field-note'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/notes/:id: edit, link or unlink a note at any time (notes never lock)
export async function PATCH(req: NextRequest, { params }: Params) {
  const owner = await requireOwner()
  if (!owner.ok) return owner.response

  const parsed = UpdateNoteSchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const { id } = await params
  const note = await findOwnNote(owner.userId, id)
  if (!note) return notFound()

  const { decisionId, ...fields } = parsed.data
  if (decisionId && !(await ownsDecision(owner.userId, decisionId))) return notFound()

  // Only promoting marks a note as where a decision started; linking it elsewhere or unlinking it clears that.
  const link = decisionId === undefined ? {} : { decisionId, promoted: false }
  const updated = await prisma.fieldNote.update({ where: { id: note.id }, data: { ...fields, ...link }, include: WITH_DECISION })
  return NextResponse.json(updated)
}

// DELETE /api/notes/:id: delete a note permanently
export async function DELETE(_req: NextRequest, { params }: Params) {
  const owner = await requireOwner()
  if (!owner.ok) return owner.response

  const { id } = await params
  const note = await findOwnNote(owner.userId, id)
  if (!note) return notFound()

  await prisma.fieldNote.delete({ where: { id: note.id } })
  return NextResponse.json({ deleted: true })
}
