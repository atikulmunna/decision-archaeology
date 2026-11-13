import { prisma } from '@/lib/prisma'

/** The free tier keeps up to this many finished decisions. */
export const FREE_RECORD_LIMIT = 20
export const FREE_LIMIT_MESSAGE = 'Free tier limit reached. Upgrade to Pro for unlimited records.'

/** Whether a free user already holds as many finished decisions as the tier allows, so no new record may start. */
export async function atFreeRecordLimit(user: { id: string; tier: string }): Promise<boolean> {
  if (user.tier !== 'FREE') return false
  const count = await prisma.decisionRecord.count({ where: { userId: user.id, isDraft: false } })
  return count >= FREE_RECORD_LIMIT
}
