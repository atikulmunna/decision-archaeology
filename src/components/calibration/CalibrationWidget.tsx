import { scoreLabel, scoreColor } from '@/lib/calibration'
import type { DomainTag } from '@prisma/client'

interface CalibrationData {
  score: number | null
  byDomain: Partial<Record<DomainTag, number | null>>
  closedDecisions: number
  totalDecisions: number
  minRequired: number
}

function ScoreGauge({ score }: { score: number | null }) {
  const display = score === null ? '–' : `${score}`
  const pct = score === null ? 0 : score

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-8 border-gray-100">
        <svg className="absolute inset-0" viewBox="0 0 144 144">
          <circle cx="72" cy="72" r="60" fill="none" stroke="#e5e7eb" strokeWidth="12" />
          {score !== null && (
            <circle
              cx="72"
              cy="72"
              r="60"
              fill="none"
              stroke={score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'}
              strokeWidth="12"
              strokeDasharray={`${(pct / 100) * 377} 377`}
              strokeLinecap="round"
              transform="rotate(-90 72 72)"
            />
          )}
        </svg>
        <div className="text-center">
          <p className={`text-2xl font-bold ${scoreColor(score)}`}>{display}</p>
          <p className="text-xs text-gray-400">/ 100</p>
        </div>
      </div>
      <p className={`text-sm font-medium ${scoreColor(score)}`}>{scoreLabel(score)}</p>
    </div>
  )
}

const DOMAIN_LABELS: Record<string, string> = {
  CAREER: 'Career', FINANCE: 'Finance', HEALTH: 'Health',
  RELATIONSHIPS: 'Relationships', CREATIVE: 'Creative', OTHER: 'Other',
}

export function CalibrationWidget({ data }: { data: CalibrationData }) {
  const domainEntries = Object.entries(data.byDomain) as [DomainTag, number | null][]

  return (
    <div className="flex flex-col gap-6">
      {/* Overall score */}
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Overall Calibration Score
        </h2>
        <ScoreGauge score={data.score} />
        <p className="text-center text-xs text-gray-400">
          Based on {data.closedDecisions} closed decision{data.closedDecisions !== 1 ? 's' : ''}
          {data.closedDecisions < data.minRequired && (
            <span className="block mt-1">
              ({data.minRequired - data.closedDecisions} more needed to show a score)
            </span>
          )}
        </p>
      </div>

      {/* Domain breakdown */}
      {domainEntries.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            By Domain
          </h2>
          <div className="flex flex-col gap-3">
            {domainEntries.map(([domain, score]) => {
              const barColor =
                score === null ? 'bg-gray-200'
                : score >= 80 ? 'bg-emerald-500'
                : score >= 60 ? 'bg-amber-500'
                : 'bg-red-500'

              return (
                <div key={domain}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {DOMAIN_LABELS[domain] ?? domain}
                    </span>
                    <span className={`font-semibold ${scoreColor(score)}`}>
                      {score === null ? 'No data' : `${score}`}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-2 rounded-full ${barColor} transition-all duration-500`}
                      style={{ width: `${score === null ? 0 : score}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Formula explanation */}
      <details className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500">
        <summary className="cursor-pointer font-medium text-gray-600">
          How is the score calculated?
        </summary>
        <div className="mt-3 space-y-2">
          <p><strong>Aligned:</strong> As expected, Slightly better, Slightly worse</p>
          <p><strong>Misaligned:</strong> Much better, Much worse</p>
          <p><strong>Excluded:</strong> Too early to tell</p>
          <p className="mt-2 font-mono bg-white border border-gray-200 rounded p-2">
            Score = Aligned / (Aligned + Misaligned) x 100
          </p>
          <p>Only decisions with a predicted outcome and a closed result count toward the score.</p>
        </div>
      </details>
    </div>
  )
}
