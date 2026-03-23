import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { CommentThread } from '@/components/sharing/CommentThread'
import { OutcomeHistory } from '@/components/decisions/OutcomeHistory'
import { OUTCOME_COLORS, OUTCOME_LABELS } from '@/lib/decisions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Shared Decision — Decision Archaeology' }

type Params = { params: Promise<{ shareId: string }> }

export default async function SharedDecisionPage({ params }: Params) {
  const { shareId } = await params
  const { userId } = await auth()
  if (!userId) return null

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return null

  const share = await prisma.collaboratorShare.findFirst({
    where: { id: shareId, collaboratorId: dbUser.id, isActive: true },
    include: {
      decision: {
        include: {
          outcomes: { orderBy: { createdAt: 'asc' } },
        },
      },
      owner: { select: { displayName: true } },
      comments: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!share) notFound()

  const d = share.decision
  const latestOutcome = d.outcomes[d.outcomes.length - 1] ?? null
  const authorIds = [...new Set(share.comments.map((comment) => comment.authorId))]
  const authors = authorIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, displayName: true, avatarUrl: true },
      })
    : []
  const authorMap = Object.fromEntries(authors.map((author) => [author.id, author]))

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-400 mb-1">
          Shared by <strong>{share.owner.displayName ?? 'someone'}</strong>
        </p>
        <h1 className="text-2xl font-bold text-gray-900">{d.title}</h1>
        <p className="text-xs text-gray-400 mt-1">
          {new Date(d.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          {d.domainTag && ` · ${d.domainTag}`}
        </p>
      </div>

      {latestOutcome && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-emerald-900">
              Latest update from the owner
            </p>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${OUTCOME_COLORS[latestOutcome.outcomeRating]}`}>
              {OUTCOME_LABELS[latestOutcome.outcomeRating]}
            </span>
            <span className="text-xs text-emerald-700">
              {new Date(latestOutcome.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          <p className="mt-2 text-sm text-emerald-950">{latestOutcome.whatHappened}</p>
        </div>
      )}

      {/* Locked fields — read-only */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col gap-5">
        {[
          { label: 'Summary', value: d.summary },
          { label: 'Context', value: d.context },
          { label: 'Alternatives considered', value: d.alternatives },
          { label: 'Chosen option', value: d.chosenOption },
          { label: 'Reasoning', value: d.reasoning },
          d.predictedOutcome ? { label: 'Predicted outcome', value: d.predictedOutcome } : null,
          d.uncertainties ? { label: 'Uncertainties', value: d.uncertainties } : null,
        ]
          .filter(Boolean)
          .map((field) => (
            <div key={field!.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                {field!.label}
              </p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{field!.value}</p>
            </div>
          ))}

        {d.confidenceLevel && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Confidence</p>
            <p className="text-sm text-gray-800">{d.confidenceLevel}/10</p>
          </div>
        )}
      </div>

      {/* Supplementary notes (if any) */}
      {d.supplementaryNotes && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-400 mb-1">Owner notes</p>
          <p className="text-sm text-blue-800">{d.supplementaryNotes}</p>
        </div>
      )}

      <OutcomeHistory
        outcomes={d.outcomes}
        title="Outcome History"
        description="Every owner update stays visible here in chronological order so you can follow how the decision evolved."
        emptyMessage="No outcome updates yet. You can request one if the expected timeframe has already passed."
      />

      {/* Comment thread */}
      <CommentThread
        decisionId={d.id}
        shareId={shareId}
        initialComments={share.comments.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt.toISOString(),
          author: authorMap[c.authorId] ?? null,
        }))}
        currentUserId={dbUser.id}
        isCollaborator={true}
      />
    </div>
  )
}
