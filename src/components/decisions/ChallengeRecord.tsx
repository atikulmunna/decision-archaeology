import type { ChallengeOutcome } from '@prisma/client'

const sectionLabel = 'mb-3 font-mono text-[11px] uppercase tracking-[0.09em] text-muted'
const mono = 'font-mono text-[11px] uppercase tracking-[0.09em] text-muted'

/**
 * What the Devil's Advocate asked before sealing, with the answers as sealed. No hooks and no
 * client code, so it renders on the server (shared page) and inside client views (Then) alike.
 */
export function ChallengeRecord({
  outcome,
  model,
  questions,
}: {
  outcome: ChallengeOutcome | null
  model: string | null
  questions: Array<{ position: number; question: string; answer: string | null }>
}) {
  if (!outcome) return null
  const ordered = [...questions].sort((a, b) => a.position - b.position)

  return (
    <section>
      <h2 className={sectionLabel}>Questions before sealing</h2>
      {outcome === 'ASKED' ? (
        <div className="flex flex-col gap-3 rounded-sm border border-rule bg-surface p-4">
          <ol className="flex flex-col gap-4">
            {ordered.map((item, index) => (
              <li key={item.position} className="flex flex-col gap-1">
                <p className="break-words font-display text-[17px] leading-relaxed text-ink">
                  <span className="mr-2 font-mono text-[12px] text-muted">{index + 1}.</span>
                  {item.question}
                </p>
                {item.answer ? (
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-2">{item.answer}</p>
                ) : (
                  <p className="text-sm text-muted">Left unanswered</p>
                )}
              </li>
            ))}
          </ol>
          {model && <p className={mono}>Asked by {model} via OpenRouter Auto Router</p>}
        </div>
      ) : (
        <p className="text-sm text-ink-2">
          {outcome === 'SKIPPED' ? 'Sealed without questions.' : 'The AI could not be reached before sealing.'}
        </p>
      )}
    </section>
  )
}
