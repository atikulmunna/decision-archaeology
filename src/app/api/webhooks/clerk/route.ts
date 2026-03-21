import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type ClerkEmailAddress = {
  id: string
  email_address: string
}

type ClerkUserPayload = {
  id: string
  email_addresses?: ClerkEmailAddress[]
  primary_email_address_id?: string | null
  first_name?: string | null
  last_name?: string | null
  image_url?: string | null
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing CLERK_WEBHOOK_SECRET' }, { status: 500 })
  }

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent
  try {
    evt = wh.verify(body, { 'svix-id': svix_id, 'svix-timestamp': svix_timestamp, 'svix-signature': svix_signature }) as WebhookEvent
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  const { id } = evt.data
  const type = evt.type

  if (type === 'user.created' || type === 'user.updated') {
    const userData = evt.data as ClerkUserPayload
    const { id: clerkId, email_addresses, first_name, last_name, image_url } = userData
    const primaryEmail = email_addresses?.find(
      (email) => email.id === userData.primary_email_address_id
    )?.email_address

    await prisma.user.upsert({
      where: { clerkId },
      create: {
        clerkId,
        email: primaryEmail ?? '',
        displayName: [first_name, last_name].filter(Boolean).join(' ') || null,
        avatarUrl: image_url ?? null,
      },
      update: {
        email: primaryEmail ?? undefined,
        displayName: [first_name, last_name].filter(Boolean).join(' ') || null,
        avatarUrl: image_url ?? null,
      },
    })
  }

  if (type === 'user.deleted') {
    if (id) {
      await prisma.user.deleteMany({ where: { clerkId: id } })
    }
  }

  return NextResponse.json({ received: true })
}
