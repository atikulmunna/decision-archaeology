import type { SealForecast } from '@/lib/seal'
import { FORECAST_DATE_MESSAGE, type ForecastInput } from '@/lib/validations/decision'

/** Form forecasts as the rows a write stores and seals: positions by order, dates at UTC midnight. */
export function toForecastRows(input: ForecastInput[]): SealForecast[] {
  return input.map((forecast, position) => ({
    position,
    statement: forecast.statement.trim(),
    probability: forecast.probability,
    resolveBy: new Date(`${forecast.resolveBy}T00:00:00.000Z`),
  }))
}

/**
 * Issues for stored forecasts whose resolve-by day is not after today in UTC, shaped like Zod issues.
 * Finalize checks these when the body leaves the stored draft forecasts in place.
 */
export function staleForecastIssues(
  forecasts: Array<{ resolveBy: Date }>,
  now: Date
): Array<{ path: Array<string | number>; message: string }> {
  const today = now.toISOString().slice(0, 10)
  return forecasts.flatMap((forecast, index) =>
    new Date(forecast.resolveBy).toISOString().slice(0, 10) > today
      ? []
      : [{ path: ['forecasts', index, 'resolveBy'], message: FORECAST_DATE_MESSAGE }]
  )
}

/** Stored forecasts back into form values, for restoring a draft. Accepts Dates or ISO strings. */
export function toForecastInputs(
  rows: Array<{ statement: string; probability: number; resolveBy: Date | string }>
): ForecastInput[] {
  return rows.map((row) => ({
    statement: row.statement,
    probability: row.probability,
    resolveBy: new Date(row.resolveBy).toISOString().slice(0, 10),
  }))
}
