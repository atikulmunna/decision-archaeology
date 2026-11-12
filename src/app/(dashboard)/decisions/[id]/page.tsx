import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getDecision } from '@/lib/decisions'
import { DecisionDetail } from '@/components/decisions/DecisionDetail'
import { DecisionPageBar } from '@/components/decisions/DecisionPageBar'
import { getOrCreateDbUser } from '@/lib/db-user'
import { APP_ROUTES } from '@/lib/routes'
import { defaultDetailView, parseDetailView } from '@/lib/detail-view'
import { splitAroundSeal } from '@/lib/field-notes'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }
type PageProps = Params & { searchParams?: Promise<{ view?: string | string[] }> }

export async function generateMetadata({ params }: Params) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return {}
  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return {}
  const record = await getDecision(dbUser.id, id)
  return { title: record ? `${record.title} | Decision Archaeology` : 'Decision Not Found' }
}

export default async function DecisionDetailPage({ params, searchParams }: PageProps) {
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

  // Read on the server so the first paint shows the right view and saved verdicts.
  const initialView = parseDetailView(
    (await searchParams)?.view,
    defaultDetailView(
      record.outcomes.length > 0,
      record.assumptionReviews.length > 0,
      (record.forecasts ?? []).some((forecast) => forecast.resolution !== null),
      splitAroundSeal(record.fieldNotes ?? [], record.createdAt).after.length > 0
    )
  )

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
      <DecisionPageBar backHref={APP_ROUTES.archive} exportId={record.id} />

      <div>
        <DecisionDetail
          decision={record}
          now={new Date()}
          reviews={record.assumptionReviews}
          initialView={initialView}
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
