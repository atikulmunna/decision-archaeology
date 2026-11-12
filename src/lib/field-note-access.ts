import 'server-only'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateDbUser } from '@/lib/db-user'

type Failure = { ok: false; response: NextResponse }

/** The signed-in owner, or the 401 or 404 response to return. */
export async function requireOwner(): Promise<{ ok: true; userId: string } | Failure> {
  const { userId } = await auth()
  if (!userId) return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return { ok: false, response: NextResponse.json({ error: 'User not found' }, { status: 404 }) }
  return { ok: true, userId: dbUser.id }
}

export const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 })

/** Whether a decision (draft or sealed) belongs to the owner. A foreign one reads as not found. */
export async function ownsDecision(userId: string, decisionId: string): Promise<boolean> {
  const decision = await prisma.decisionRecord.findFirst({ where: { id: decisionId, userId }, select: { id: true } })
  return decision !== null
}

/** The owner's note, or null for a missing or foreign one. */
export function findOwnNote(userId: string, id: string) {
  return prisma.fieldNote.findFirst({ where: { id, userId } })
}

export async function readJson(req: Request): Promise<unknown> {
  return req.json().catch(() => null)
}
