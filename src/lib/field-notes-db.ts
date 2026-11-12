import 'server-only'
import { prisma } from '@/lib/prisma'
import { formatCatalogNumber } from '@/lib/catalog'
import { NOTES_PAGE_SIZE, toFieldNoteView, type FieldNoteView } from '@/lib/field-notes'

/** One page of the owner's notes, newest first, with a cursor to the next older page when this one is full. */
export async function listNotes(
  userId: string,
  options: { before: Date | null; decisionHref: (id: string) => string }
): Promise<{ notes: FieldNoteView[]; olderCursor: string | null }> {
  const rows = await prisma.fieldNote.findMany({
    where: { userId, ...(options.before ? { createdAt: { lt: options.before } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: NOTES_PAGE_SIZE,
    include: { decision: { select: { id: true, catalogNumber: true, title: true } } },
  })
  const last = rows[rows.length - 1]
  return {
    notes: rows.map((row) => toFieldNoteView(row, options.decisionHref)),
    olderCursor: rows.length === NOTES_PAGE_SIZE && last ? last.createdAt.toISOString() : null,
  }
}

/** The owner's sealed decisions, newest first, for the "Link to a decision" picker. */
export async function listDecisionOptions(userId: string): Promise<Array<{ id: string; label: string }>> {
  const decisions = await prisma.decisionRecord.findMany({
    where: { userId, isDraft: false },
    select: { id: true, catalogNumber: true, title: true },
    orderBy: { createdAt: 'desc' },
  })
  return decisions.map((decision) => ({
    id: decision.id,
    label: `${decision.catalogNumber === null ? 'Uncatalogued' : formatCatalogNumber(decision.catalogNumber)} · ${decision.title}`,
  }))
}
