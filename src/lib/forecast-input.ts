import type { SealForecast } from '@/lib/seal'
import type { ForecastInput } from '@/lib/validations/decision'

/** Form forecasts as the rows a write stores and seals: positions by order, dates at UTC midnight. */
export function toForecastRows(input: ForecastInput[]): SealForecast[] {
  return input.map((forecast, position) => ({
    position,
    statement: forecast.statement.trim(),
    probability: forecast.probability,
    resolveBy: new Date(`${forecast.resolveBy}T00:00:00.000Z`),
  }))
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
