import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getDecision } from '@/lib/decisions'
import { DecisionDetail } from '@/components/decisions/DecisionDetail'
import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { buttonClasses } from '@/components/ui/Button'
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
  return { title: record ? `${record.title} | Decision Archaeology` : 'Decision Not Found' }
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          prefetch
          href="/decisions"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.09em] text-muted hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" size={12} strokeWidth={1.5} />
          Archive
        </Link>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/decisions/${record.id}/export?format=json`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Download aria-hidden="true" size={12} strokeWidth={1.5} />
            JSON
          </a>
          <a
            href={`/api/decisions/${record.id}/export?format=markdown`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Download aria-hidden="true" size={12} strokeWidth={1.5} />
            Markdown
          </a>
        </div>
      </div>

      <div>
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
