import type { User } from '@prisma/client'
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

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

export async function getOrCreateDbUser(clerkUserId: string): Promise<User | null> {
  const existing = await prisma.user.findUnique({ where: { clerkId: clerkUserId } })
  if (existing) return existing

  try {
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(clerkUserId)
    const email = getPrimaryEmail(clerkUser)

    if (!email) {
      console.error('[auth] Clerk user is missing an email address:', clerkUserId)
      return null
    }

    return await prisma.user.upsert({
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
  } catch (error) {
    console.error('[auth] Failed to backfill app user from Clerk:', error)
    return null
  }
}
