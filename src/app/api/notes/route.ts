import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notFound, ownsDecision, readJson, requireOwner, WITH_DECISION } from '@/lib/field-note-access'
import { CreateNoteSchema } from '@/lib/validations/field-note'

export const dynamic = 'force-dynamic'

// POST /api/notes: write a field note, optionally linked to one of the owner's decisions
export async function POST(req: NextRequest) {
  const owner = await requireOwner()
  if (!owner.ok) return owner.response

  const parsed = CreateNoteSchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }
  const { body, mood, energy, decisionId } = parsed.data
  if (decisionId && !(await ownsDecision(owner.userId, decisionId))) return notFound()

  const created = await prisma.fieldNote.create({
    data: { userId: owner.userId, body, mood: mood ?? null, energy: energy ?? null, decisionId: decisionId ?? null },
    include: WITH_DECISION,
  })
  return NextResponse.json(created, { status: 201 })
}
