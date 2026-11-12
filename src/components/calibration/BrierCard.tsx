import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'
import type { ForecastSummary, Verdict } from '@/lib/forecasting'

const VERDICT_TONES: Record<Verdict, BadgeTone> = {
  Overconfident: 'outline',
  Underconfident: 'outline',
  'Well calibrated': 'signal',
}

/** The Brier score with its reference, the plain finding and the forecast counts. */
export function BrierCard({ summary }: { summary: ForecastSummary }) {
  const { brier, finding, needed } = summary
  return (
    <Card as="section" className="flex flex-col gap-3 p-5">
      <Eyebrow>Brier score</Eyebrow>
      <p className={`font-display text-[44px] leading-none ${brier === null ? 'text-muted' : 'text-ink'}`}>
        {brier === null ? '?' : brier.toFixed(2)}
      </p>
      <p className="text-sm text-ink-2">Lower is better. Always saying 50% scores 0.25.</p>
      {brier === null && (
        <p className="text-sm text-ink-2">{`Resolve ${needed} more forecast${needed === 1 ? '' : 's'} to see your Brier score.`}</p>
      )}
      {finding && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm font-medium leading-relaxed text-ink">{finding.sentence}</p>
          <Badge tone={VERDICT_TONES[finding.verdict]}>{finding.verdict}</Badge>
        </div>
      )}
      <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
        {`${summary.resolved} resolved · ${summary.open} open · ${summary.due} due`}
      </p>
    </Card>
  )
}
