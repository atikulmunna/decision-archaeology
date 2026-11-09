import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { CommentThread } from '@/components/sharing/CommentThread'
import { OutcomeHistory } from '@/components/decisions/OutcomeHistory'
import { Lock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Callout } from '@/components/ui/Callout'
import { Card } from '@/components/ui/Card'
import { CatalogNumber } from '@/components/ui/CatalogNumber'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { PageHeader } from '@/components/ui/PageHeader'
import { OUTCOME_LABELS, OUTCOME_TONES } from '@/lib/outcomes'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Shared Decision | Decision Archaeology' }

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

  const fields = [
    { label: 'Summary', value: d.summary },
    { label: 'Context', value: d.context },
    { label: 'Alternatives considered', value: d.alternatives },
    { label: 'Chosen option', value: d.chosenOption },
    { label: 'Reasoning', value: d.reasoning },
    d.predictedOutcome ? { label: 'Predicted outcome', value: d.predictedOutcome } : null,
    d.uncertainties ? { label: 'Uncertainties', value: d.uncertainties } : null,
  ].filter((field): field is { label: string; value: string } => Boolean(field))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={`Shared by ${share.owner.displayName ?? 'someone'}`}
        title={d.title}
        meta={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <CatalogNumber value={d.catalogNumber} />
            <span>{new Date(d.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            {d.domainTag && <span>{d.domainTag}</span>}
            {d.confidenceLevel && <span>Confidence {d.confidenceLevel}/10</span>}
          </span>
        }
      />

      {latestOutcome && (
        <Callout tone="success" title="Latest update from the owner">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={OUTCOME_TONES[latestOutcome.outcomeRating]}>{OUTCOME_LABELS[latestOutcome.outcomeRating]}</Badge>
              <span className="font-mono text-[11px] text-muted">
                {new Date(latestOutcome.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <p className="whitespace-pre-wrap break-words">{latestOutcome.whatHappened}</p>
          </div>
        </Callout>
      )}

      <Card as="section" className="flex flex-col gap-5 p-6">
        <div className="flex items-center gap-2 text-muted">
          <Lock aria-hidden="true" size={14} strokeWidth={1.5} />
          <Eyebrow>Sealed record</Eyebrow>
        </div>
        {fields.map((field) => (
          <div key={field.label}>
            <Eyebrow>{field.label}</Eyebrow>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{field.value}</p>
          </div>
        ))}
      </Card>

      {d.supplementaryNotes && (
        <Card as="section" className="p-4">
          <Eyebrow>Owner notes</Eyebrow>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-2">{d.supplementaryNotes}</p>
        </Card>
      )}

      <OutcomeHistory
        outcomes={d.outcomes}
        title="Outcome History"
        description="Every owner update stays visible here in chronological order so you can follow how the decision evolved."
        emptyMessage="No outcome updates yet. You can request one if the expected timeframe has already passed."
      />

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
