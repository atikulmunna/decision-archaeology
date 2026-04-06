import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getDecision } from '@/lib/decisions'
import { DecisionDetail } from '@/components/decisions/DecisionDetail'
import Link from 'next/link'
import { getOrCreateDbUser } from '@/lib/db-user'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return {}
  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return {}
  const record = await getDecision(dbUser.id, id)
  return { title: record ? `${record.title} — Decision Archaeology` : 'Decision Not Found' }
}

export default async function DecisionDetailPage({ params }: Params) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return null

  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return null

  const [record, shares] = await Promise.all([
    getDecision(dbUser.id, id),
    prisma.collaboratorShare.findMany({
      where: { decisionId: id, ownerId: dbUser.id, isActive: true },
      include: {
        collaborator: {
          select: { id: true, email: true, displayName: true, avatarUrl: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { sharedAt: 'asc' },
    }),
  ])
  if (!record) notFound()

  const authorIds = [...new Set(shares.flatMap((share) => share.comments.map((comment) => comment.authorId)))]
  const authors = authorIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, displayName: true, avatarUrl: true },
      })
    : []
  const authorMap = Object.fromEntries(authors.map((author) => [author.id, author]))

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400">
        <Link prefetch href="/decisions" className="hover:text-indigo-600 transition-colors">
          ← Decisions
        </Link>
        <span>/</span>
        <span className="text-gray-600 truncate max-w-xs">{record.title}</span>
      </nav>

      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/decisions/${record.id}/export?format=json`}
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Export JSON
        </a>
        <a
          href={`/api/decisions/${record.id}/export?format=markdown`}
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Export Markdown
        </a>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <DecisionDetail
          decision={record}
          collaboration={{
            currentUserId: dbUser.id,
            shares: shares.map((share) => ({
              id: share.id,
              shareId: share.id,
              collaborator: share.collaborator,
            })),
            discussions: shares.map((share) => ({
              shareId: share.id,
              collaboratorName: share.collaborator.displayName ?? share.collaborator.email,
              comments: share.comments.map((comment) => ({
                id: comment.id,
                content: comment.content,
                createdAt: comment.createdAt.toISOString(),
                author: authorMap[comment.authorId] ?? null,
              })),
            })),
          }}
        />
      </div>
    </div>
  )
}
