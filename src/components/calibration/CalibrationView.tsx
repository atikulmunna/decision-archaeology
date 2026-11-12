import { BrierCard } from '@/components/calibration/BrierCard'
import { CalibrationWidget, DOMAIN_LABELS } from '@/components/calibration/CalibrationWidget'
import { DueForecasts } from '@/components/calibration/DueForecasts'
import { ReliabilityCurve } from '@/components/calibration/ReliabilityCurve'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { PageHeader } from '@/components/ui/PageHeader'
import type { CalibrationData } from '@/lib/calibration'
import type { AppRoutes } from '@/lib/routes'

/** The calibration page body, shared by the signed-in app and the public demo. */
export function CalibrationView({ eyebrow, data, routes }: { eyebrow: string; data: CalibrationData; routes: AppRoutes }) {
  const summary = data.forecasts
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={eyebrow} title="Calibration" meta="How often your forecasts came true, against how sure you were" />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <BrierCard summary={summary} />
        <section className="min-w-0 rounded-sm border border-rule bg-surface p-5">
          <Eyebrow className="mb-2">Reliability</Eyebrow>
          <ReliabilityCurve bands={summary.bands} enabled={summary.brier !== null} scored={summary.scored} />
        </section>
      </div>

      {(summary.dueList.length > 0 || summary.byDomain.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <DueForecasts dueList={summary.dueList} routes={routes} />
          {summary.byDomain.length > 0 && (
            <section aria-label="By domain" className="min-w-0 rounded-sm border border-rule bg-surface p-5 sm:min-w-[240px]">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">By domain (Brier)</h2>
              <ul className="mt-2 flex flex-col">
                {summary.byDomain.map(({ domain, brier, count }) => (
                  <li key={domain} className="flex justify-between gap-4 border-b border-rule py-2 text-sm last:border-b-0">
                    <span className="text-ink-2">{DOMAIN_LABELS[domain] ?? domain}</span>
                    <span className="font-mono text-ink">{`${brier.toFixed(2)} · ${count}`}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <CalibrationWidget data={data} />
    </div>
  )
}
