import { scoreLabel, scoreColor, scoreStroke, type CalibrationData } from '@/lib/calibration'
import type { DomainTag } from '@prisma/client'
import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'

function ScoreGauge({ score }: { score: number | null }) {
  const display = score === null ? '?' : `${score}`
  const pct = score === null ? 0 : score

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex h-36 w-36 items-center justify-center">
        <svg className="absolute inset-0" viewBox="0 0 144 144" aria-hidden="true">
          <circle cx="72" cy="72" r="60" fill="none" className="stroke-rule" strokeWidth="6" />
          {score !== null && (
            <circle
              cx="72"
              cy="72"
              r="60"
              fill="none"
              className={scoreStroke(score)}
              strokeWidth="6"
              strokeDasharray={`${(pct / 100) * 377} 377`}
              transform="rotate(-90 72 72)"
            />
          )}
        </svg>
        <div className="text-center">
          <p className={`font-display text-[44px] leading-none ${scoreColor(score)}`}>{display}</p>
          <p className="mt-1 font-mono text-[11px] text-muted">/ 100</p>
        </div>
      </div>
      <p className={`font-mono text-[11px] uppercase tracking-[0.09em] ${scoreColor(score)}`}>{scoreLabel(score)}</p>
    </div>
  )
}

const DOMAIN_LABELS: Record<string, string> = {
  CAREER: 'Career',
  FINANCE: 'Finance',
  HEALTH: 'Health',
  RELATIONSHIPS: 'Relationships',
  CREATIVE: 'Creative',
  OTHER: 'Other',
}

export function CalibrationWidget({ data }: { data: CalibrationData }) {
  const domainEntries = Object.entries(data.byDomain) as [DomainTag, number | null][]

  return (
    <div className="flex flex-col gap-6">
      <Card as="section" className="flex flex-col items-center gap-3 p-6">
        <Eyebrow>Overall calibration score</Eyebrow>
        <ScoreGauge score={data.score} />
        <p className="text-center text-xs text-muted">
          Based on {data.closedDecisions} closed decision{data.closedDecisions !== 1 ? 's' : ''}
          {data.closedDecisions < data.minRequired && (
            <span className="mt-1 block">({data.minRequired - data.closedDecisions} more needed to show a score)</span>
          )}
        </p>
      </Card>

      {domainEntries.length > 0 && (
        <Card as="section" className="p-5">
          <Eyebrow className="mb-4">By domain</Eyebrow>
          <ul className="flex flex-col gap-4">
            {domainEntries.map(([domain, score]) => (
              <li key={domain}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-ink-2">{DOMAIN_LABELS[domain] ?? domain}</span>
                  <span className={`font-mono text-sm ${scoreColor(score)}`}>{score === null ? 'No data' : `${score}`}</span>
                </div>
                <div className="h-px w-full bg-rule">
                  <div
                    className={`h-px transition-[width] duration-500 ${score === null ? '' : score >= 60 ? 'bg-ink' : 'bg-danger'}`}
                    style={{ width: `${score === null ? 0 : score}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <details className="rounded-sm border border-rule bg-surface p-4 text-xs text-ink-2">
        <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
          How is the score calculated?
        </summary>
        <div className="mt-3 space-y-2">
          <p>
            <strong className="text-ink">Aligned:</strong> As expected, Slightly better, Slightly worse
          </p>
          <p>
            <strong className="text-ink">Misaligned:</strong> Much better, Much worse
          </p>
          <p>
            <strong className="text-ink">Excluded:</strong> Too early to tell
          </p>
          <p className="mt-2 rounded-sm border border-rule bg-sunken p-2 font-mono text-ink">
            Score = Aligned / (Aligned + Misaligned) x 100
          </p>
          <p>Only decisions with a predicted outcome and a closed result count toward the score.</p>
        </div>
      </details>
    </div>
  )
}
