import type { Band } from '@/lib/forecasting'

// Plot area: x from 40 to 240 (you said), y from 210 to 10 (it happened), both 0 to 100 percent.
const x = (percent: number) => 40 + percent * 2
const y = (percent: number) => 210 - percent * 2
const TICKS = [0, 50, 100]
const FADED_BELOW = 3

/**
 * The reliability curve: one point per probability band at (how sure you were,
 * how often it happened), sized by how many forecasts it holds, against the
 * diagonal of perfect calibration. A hidden table gives screen readers the numbers.
 */
export function ReliabilityCurve({ bands, enabled, scored }: { bands: Band[]; enabled: boolean; scored: number }) {
  const shown = enabled ? bands : []
  const label = enabled
    ? `Reliability curve: ${bands.length} bands from ${scored} scored forecasts, compared with perfect calibration.`
    : 'Reliability curve: not enough resolved forecasts yet.'

  return (
    <div>
      <svg viewBox="0 0 250 240" role="img" aria-label={label} className="h-auto w-full max-w-[280px]">
        <rect x={40} y={10} width={200} height={200} className="fill-none stroke-rule" />
        <line x1={40} y1={110} x2={240} y2={110} className="stroke-rule" strokeDasharray="2 3" />
        <line x1={140} y1={10} x2={140} y2={210} className="stroke-rule" strokeDasharray="2 3" />
        <line x1={x(0)} y1={y(0)} x2={x(100)} y2={y(100)} className="stroke-muted" strokeDasharray="4 4" />
        {shown.length > 1 && (
          <polyline
            points={shown.map((band) => `${x(band.meanStated)},${y(band.shareHappened)}`).join(' ')}
            className="fill-none stroke-ink"
            strokeWidth={1.5}
          />
        )}
        {shown.map((band) => (
          <circle
            key={band.band}
            data-band={band.band}
            cx={x(band.meanStated)}
            cy={y(band.shareHappened)}
            r={3 + 1.5 * Math.sqrt(band.count)}
            className={`fill-signal stroke-ink ${band.count < FADED_BELOW ? 'opacity-40' : ''}`}
          />
        ))}
        <g className="fill-muted font-mono" fontSize={9}>
          {TICKS.map((tick) => (
            <text key={`y${tick}`} x={36} y={y(tick) + 3} textAnchor="end">
              {tick}
            </text>
          ))}
          {TICKS.map((tick) => (
            <text key={`x${tick}`} x={x(tick)} y={224} textAnchor="middle">
              {tick}
            </text>
          ))}
          <text x={140} y={236} textAnchor="middle">
            YOU SAID (%)
          </text>
          <text x={10} y={110} textAnchor="middle" transform="rotate(-90 10 110)">
            IT HAPPENED (%)
          </text>
        </g>
      </svg>
      {enabled && (
        <table className="sr-only">
          <caption>Reliability by band</caption>
          <thead>
            <tr>
              <th scope="col">You said</th>
              <th scope="col">It happened</th>
              <th scope="col">Forecasts</th>
            </tr>
          </thead>
          <tbody>
            {bands.map((band) => (
              <tr key={band.band}>
                <td>{`${Math.round(band.meanStated)}%`}</td>
                <td>{`${Math.round(band.shareHappened)}%`}</td>
                <td>{band.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
