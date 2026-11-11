import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { normalizeAssumption, splitAssumptions } from '@/lib/assumptions'
import { getOrCreateDbUser } from '@/lib/db-user'
import { isDecisionLocked } from '@/lib/locks'
import { computeSealHash } from '@/lib/seal'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

const NOTE_MAX = 280

const ItemSchema = z.object({ itemText: z.string().min(1) })
const ReviewSchema = ItemSchema.extend({
  verdict: z.enum(['HELD', 'PARTLY', 'DIDNT']),
  note: z.string().nullable().optional(),
})

type Resolved =
  | { ok: false; response: NextResponse }
  | { ok: true; decisionId: string; itemText: string; itemHash: string; body: unknown }

/**
 * Shared checks for both verbs: signed in, the owner's finalized decision, sealed
 * (or imported, which never locks), and, when `mustBeCurrent`, the text is one of
 * its split assumptions.
 */
async function resolveItem(
  req: NextRequest,
  { params }: Params,
  { mustBeCurrent }: { mustBeCurrent: boolean }
): Promise<Resolved> {
  const { userId } = await auth()
  if (!userId) return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const body: unknown = await req.json().catch(() => null)
  const parsed = ItemSchema.safeParse(body)
  if (!parsed.success) {
    return { ok: false, response: NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 }) }
  }

  const { id } = await params
  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return { ok: false, response: NextResponse.json({ error: 'User not found' }, { status: 404 }) }

  const record = await prisma.decisionRecord.findFirst({ where: { id, userId: dbUser.id } })
  if (!record) return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) }

  if (record.isDraft || (!isDecisionLocked(record) && !record.isImported)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Review assumptions once the decision is sealed.' }, { status: 409 }),
    }
  }

  const itemText = normalizeAssumption(parsed.data.itemText)
  if (mustBeCurrent && !splitAssumptions(record.uncertainties).map(normalizeAssumption).includes(itemText)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "That is not one of this decision's assumptions." }, { status: 422 }),
    }
  }

  return { ok: true, decisionId: record.id, itemText, itemHash: await computeSealHash(itemText), body }
}

// PUT /api/decisions/:id/assumptions: set or update one assumption's verdict
export async function PUT(req: NextRequest, context: Params) {
  const resolved = await resolveItem(req, context, { mustBeCurrent: true })
  if (!resolved.ok) return resolved.response

  const parsed = ReviewSchema.safeParse(resolved.body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }
  const note = parsed.data.note?.trim() || null
  if (note && note.length > NOTE_MAX) {
    return NextResponse.json({ error: `Notes can be at most ${NOTE_MAX} characters.` }, { status: 400 })
  }

  const { decisionId, itemText, itemHash } = resolved
  const review = await prisma.assumptionReview.upsert({
    where: { decisionId_itemHash: { decisionId, itemHash } },
    create: { decisionId, itemHash, itemText, verdict: parsed.data.verdict, note },
    update: { itemText, verdict: parsed.data.verdict, note },
  })
  return NextResponse.json(review)
}

// DELETE /api/decisions/:id/assumptions: clear a verdict (succeeds when there was none)
// The item check is skipped so a review left over from an earlier split (an orphan)
// can still be cleared; the delete stays scoped to this owner's decision.
export async function DELETE(req: NextRequest, context: Params) {
  const resolved = await resolveItem(req, context, { mustBeCurrent: false })
  if (!resolved.ok) return resolved.response

  await prisma.assumptionReview.deleteMany({ where: { decisionId: resolved.decisionId, itemHash: resolved.itemHash } })
  return NextResponse.json({ cleared: true })
}
