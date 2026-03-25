import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import {
  assertImportTier,
  getImportErrorMessage,
  importPortableDecisions,
  normalizeCsvImport,
  parseCsv,
  parseImportPayload,
} from '@/lib/portability'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (!assertImportTier(dbUser.tier)) {
    return NextResponse.json(
      { error: 'Bulk import is currently available for Power users only.' },
      { status: 403 }
    )
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Please upload a JSON or CSV file.' }, { status: 400 })
  }

  try {
    const text = await file.text()
    const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv'
    const parsed = isCsv
      ? parseImportPayload({ decisions: normalizeCsvImport(parseCsv(text)), schemaVersion: '1.0.0', exportedAt: new Date().toISOString() })
      : parseImportPayload(JSON.parse(text))

    const data = await importPortableDecisions(dbUser, parsed.decisions)
    await prisma.$transaction(
      data.map((decision) =>
        prisma.decisionRecord.create({
          data: decision,
        })
      )
    )

    return NextResponse.json({ imported: parsed.decisions.length }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: getImportErrorMessage(error) }, { status: 422 })
  }
}
