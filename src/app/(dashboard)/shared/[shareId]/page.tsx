import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { CommentThread } from '@/components/sharing/CommentThread'

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
      decision: true,
      owner: { select: { displayName: true } },
      comments: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!share) notFound()

  const d = share.decision

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

      {/* Comment thread */}
      <CommentThread
        decisionId={d.id}
        shareId={shareId}
        initialComments={share.comments.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt.toISOString(),
          author: null, // enriched client-side on new posts; server-side would need join
        }))}
        currentUserId={dbUser.id}
        isCollaborator={true}
      />
    </div>
  )
}
