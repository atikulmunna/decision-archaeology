import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getDecision } from '@/lib/decisions'
import { DecisionDetail } from '@/components/decisions/DecisionDetail'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return {}
  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return {}
  const record = await getDecision(dbUser.id, id)
  return { title: record ? `${record.title} — Decision Archaeology` : 'Decision Not Found' }
}

export default async function DecisionDetailPage({ params }: Params) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return null

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return null

  const record = await getDecision(dbUser.id, id)
  if (!record) notFound()

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/decisions" className="hover:text-indigo-600 transition-colors">
          ← Decisions
        </Link>
        <span>/</span>
        <span className="text-gray-600 truncate max-w-xs">{record.title}</span>
      </nav>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <DecisionDetail decision={record} />
      </div>
    </div>
  )
}
