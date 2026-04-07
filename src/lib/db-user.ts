import { cache } from 'react'
import { Prisma, type User } from '@prisma/client'
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/observability'
import { createTimer } from '@/lib/timing'

function getPrimaryEmail(clerkUser: {
  primaryEmailAddressId?: string | null
  emailAddresses?: Array<{ id: string; emailAddress: string }>
}) {
  return (
    clerkUser.emailAddresses?.find((email) => email.id === clerkUser.primaryEmailAddressId)?.emailAddress
    ?? clerkUser.emailAddresses?.[0]?.emailAddress
    ?? null
  )
}

export const getOrCreateDbUser = cache(async (clerkUserId: string): Promise<User | null> => {
  const timer = createTimer('auth.getOrCreateDbUser', { clerkUserId })
  const existing = await prisma.user.findUnique({ where: { clerkId: clerkUserId } })
  if (existing) {
    timer.end({ source: 'db' })
    return existing
  }

  try {
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(clerkUserId)
    const email = getPrimaryEmail(clerkUser)

    if (!email) {
      await logError('[auth] Clerk user is missing an email address', new Error('Missing primary email'), { clerkUserId })
      timer.end({ source: 'clerk', outcome: 'missing_email' })
      return null
    }

    try {
      const user = await prisma.user.upsert({
        where: { clerkId: clerkUserId },
        create: {
          clerkId: clerkUserId,
          email,
          displayName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
          avatarUrl: clerkUser.imageUrl ?? null,
        },
        update: {
          email,
          displayName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
          avatarUrl: clerkUser.imageUrl ?? null,
        },
      })
      timer.end({ source: 'clerk', outcome: 'upserted' })
      return user
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } })
        timer.end({ source: 'db', outcome: 'race_recovered' })
        return user
      }

      throw error
    }
  } catch (error) {
    await logError('[auth] Failed to backfill app user from Clerk', error, { clerkUserId })
    timer.end({ outcome: 'failed' })
    return null
  }
})
