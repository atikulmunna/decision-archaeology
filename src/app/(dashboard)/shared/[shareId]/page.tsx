import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { CommentThread } from '@/components/sharing/CommentThread'
import { OutcomeHistory } from '@/components/decisions/OutcomeHistory'
import { LatestOutcomeNotice } from '@/components/decisions/LatestOutcomeNotice'
import { Lock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { CatalogNumber } from '@/components/ui/CatalogNumber'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { PageHeader } from '@/components/ui/PageHeader'
import { SealBadge } from '@/components/seal/SealBadge'
import { SealPanel } from '@/components/seal/SealPanel'
import { normalizeDecisionLockState } from '@/lib/locks'
import { isRetroactiveSeal, SEALED_RELATIONS, toSealRecord } from '@/lib/seal'
import { forecastSentence } from '@/lib/forecasting'
import { ChallengeRecord } from '@/components/decisions/ChallengeRecord'

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
          // Sealed fields: shown, and needed to verify a v2 or v3 seal. Forecast resolutions are never rendered.
          ...SEALED_RELATIONS,
        },
      },
      owner: { select: { displayName: true } },
      comments: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!share) notFound()

  // isLocked is only persisted when the owner's countdown fires, so derive it here.
  const d = normalizeDecisionLockState(share.decision)
  const sealedForecasts = d.forecasts ?? []
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
        actions={
          d.sealHash && d.isLocked ? (
            <SealBadge hash={d.sealHash} catalogNumber={d.catalogNumber} retroactive={isRetroactiveSeal(d)} />
          ) : undefined
        }
        meta={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <CatalogNumber value={d.catalogNumber} />
            <span>{new Date(d.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            {d.domainTag && <span>{d.domainTag}</span>}
            {d.confidenceLevel && <span>Confidence {d.confidenceLevel}/10</span>}
          </span>
        }
      />

      {/* A client component: pass only the sealed fields, never attachments or other owner data. */}
      <SealPanel record={toSealRecord(d)} />

      {latestOutcome && <LatestOutcomeNotice outcome={latestOutcome} />}

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
        {sealedForecasts.length > 0 && (
          <div>
            <Eyebrow>Forecasts</Eyebrow>
            <ul className="mt-1 flex flex-col gap-1 text-sm leading-relaxed text-ink">
              {sealedForecasts.map((forecast) => (
                <li key={forecast.position} className="break-words">
                  {forecastSentence(forecast)}
                </li>
              ))}
            </ul>
          </div>
        )}
        <ChallengeRecord outcome={d.challengeOutcome ?? null} model={d.challengeModel ?? null} questions={d.challengeQuestions ?? []} />
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
