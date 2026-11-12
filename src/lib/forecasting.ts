/**
 * Forecasts: yes or no claims with a probability and a resolve-by date. This
 * module holds the scoring math (Brier score, reliability bands, the plain
 * finding) and the date rule for resolving. It is pure and safe on the client.
 */

export type ForecastResolution = 'HAPPENED' | 'DIDNT' | 'VOID'

export const RESOLUTION_LABELS: Record<ForecastResolution, string> = {
  HAPPENED: 'Happened',
  DIDNT: "Didn't happen",
  VOID: "Can't tell",
}

export type ForecastLike = { probability: number; resolveBy: Date; resolution: ForecastResolution | null }

/** Scored forecasts needed before the Brier score and curve appear. */
export const MIN_SCORED = 5
/** Scored forecasts a domain needs before it gets its own Brier score. */
export const MIN_DOMAIN_SCORED = 3

const DAY_MS = 24 * 60 * 60 * 1000
const END_MIN = 5
const CONFIDENT_FROM = 70
const DOUBTFUL_TO = 30
const VERDICT_MARGIN = 10

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

/** A resolve-by date as people read it, in UTC: "Jun 30, 2027". */
export function formatForecastDate(date: Date): string {
  return dateFormat.format(new Date(date))
}

// Words that open a sentence but read lowercase inside one. Anything else, such as a name, stays as typed.
const SENTENCE_OPENERS = new Set([
  'a', 'an', 'the', 'my', 'our', 'your', 'his', 'her', 'their', 'its', 'this', 'that', 'these', 'those',
  'some', 'someone', 'somebody', 'every', 'each', 'one', 'we', 'they', 'he', 'she', 'you', 'it', 'there',
  'at', 'no', 'nobody', 'nothing', 'none', 'any', 'all', 'both', 'most', 'more', 'fewer', 'less',
])

/** "The podcast" reads as "the podcast" inside a sentence; "Sam", "I am" and "NASA" stay as typed. */
export function displayStatement(statement: string): string {
  const firstWord = statement.split(' ', 1)[0]
  const capitalized = firstWord.length > 1 ? firstWord === firstWord.charAt(0) + firstWord.slice(1).toLowerCase() : firstWord === 'A'
  if (capitalized && SENTENCE_OPENERS.has(firstWord.toLowerCase())) {
    return statement.charAt(0).toLowerCase() + statement.slice(1)
  }
  return statement
}

export function forecastSentence(forecast: { statement: string; probability: number; resolveBy: Date }): string {
  return `${forecast.probability}% that ${displayStatement(forecast.statement)} by ${formatForecastDate(forecast.resolveBy)}`
}

type Scored = ForecastLike & { resolution: 'HAPPENED' | 'DIDNT' }

function scored(forecasts: ForecastLike[]): Scored[] {
  return forecasts.filter((forecast): forecast is Scored => forecast.resolution === 'HAPPENED' || forecast.resolution === 'DIDNT')
}

export function scoredCount(forecasts: ForecastLike[]): number {
  return scored(forecasts).length
}

/** One forecast's contribution: the squared distance between what was said and what happened. */
export function brierTerm(probability: number, resolution: 'HAPPENED' | 'DIDNT'): number {
  const outcome = resolution === 'HAPPENED' ? 1 : 0
  return (probability / 100 - outcome) ** 2
}

function meanBrier(forecasts: Scored[]): number {
  return forecasts.reduce((sum, forecast) => sum + brierTerm(forecast.probability, forecast.resolution), 0) / forecasts.length
}

/** The mean Brier term over Happened and Didn't happen; null below the minimum. Can't tell is left out. */
export function brierScore(forecasts: ForecastLike[]): number | null {
  const set = scored(forecasts)
  return set.length < MIN_SCORED ? null : meanBrier(set)
}

export type Band = { band: number; count: number; meanStated: number; shareHappened: number }

/** 5 is band 0, 10 and 15 are band 1, and so on; 90 and 95 share band 9. */
export function bandIndex(probability: number): number {
  return Math.min(9, Math.floor(probability / 10))
}

function summarize(forecasts: Scored[]): { meanStated: number; shareHappened: number } {
  const stated = forecasts.reduce((sum, forecast) => sum + forecast.probability, 0) / forecasts.length
  const happened = forecasts.filter((forecast) => forecast.resolution === 'HAPPENED').length
  return { meanStated: stated, shareHappened: (happened / forecasts.length) * 100 }
}

/** Populated bands in order, with percent values left unrounded for plotting. */
export function reliabilityBands(forecasts: ForecastLike[]): Band[] {
  const byBand = new Map<number, Scored[]>()
  for (const forecast of scored(forecasts)) {
    const index = bandIndex(forecast.probability)
    byBand.set(index, [...(byBand.get(index) ?? []), forecast])
  }
  return [...byBand.entries()]
    .sort(([a], [b]) => a - b)
    .map(([band, members]) => ({ band, count: members.length, ...summarize(members) }))
}

export type Verdict = 'Overconfident' | 'Underconfident' | 'Well calibrated'
export type Finding = { end: 'confident' | 'doubtful'; sentence: string; verdict: Verdict }

/**
 * Compares how sure you were at each end with how often you were right, and
 * reports the end with the larger gap (the confident end on a tie).
 */
export function calibrationFinding(forecasts: ForecastLike[]): Finding | null {
  const set = scored(forecasts)
  const ends = [
    { end: 'confident' as const, members: set.filter((forecast) => forecast.probability >= CONFIDENT_FROM) },
    { end: 'doubtful' as const, members: set.filter((forecast) => forecast.probability <= DOUBTFUL_TO) },
  ]
    .filter(({ members }) => members.length >= END_MIN)
    .map(({ end, members }) => {
      const { meanStated, shareHappened } = summarize(members)
      return { end, shareHappened, gap: shareHappened - meanStated }
    })
  if (ends.length === 0) return null

  const chosen = ends.reduce((best, candidate) => (Math.abs(candidate.gap) > Math.abs(best.gap) ? candidate : best))
  const towardFifty = chosen.end === 'confident' ? -chosen.gap : chosen.gap
  const verdict: Verdict =
    towardFifty > VERDICT_MARGIN ? 'Overconfident' : towardFifty < -VERDICT_MARGIN ? 'Underconfident' : 'Well calibrated'
  const said = chosen.end === 'confident' ? `${CONFIDENT_FROM}% or more` : `${DOUBTFUL_TO}% or less`
  return {
    end: chosen.end,
    sentence: `When you said ${said}, it happened ${Math.round(chosen.shareHappened)}% of the time.`,
    verdict,
  }
}

/** Brier per domain, for domains with enough scored forecasts, in first-seen order. */
export function brierByDomain<D extends string>(
  records: Array<{ domainTag: D | null; forecasts: ForecastLike[] }>
): Array<{ domain: D; brier: number; count: number }> {
  const byDomain = new Map<D, Scored[]>()
  for (const record of records) {
    if (!record.domainTag) continue
    byDomain.set(record.domainTag, [...(byDomain.get(record.domainTag) ?? []), ...scored(record.forecasts)])
  }
  return [...byDomain.entries()]
    .filter(([, members]) => members.length >= MIN_DOMAIN_SCORED)
    .map(([domain, members]) => ({ domain, brier: meanBrier(members), count: members.length }))
}

/** "By Jun 30" has passed once Jun 30 has fully ended in UTC. */
export function isPastResolveBy(resolveBy: Date, now: Date): boolean {
  return new Date(now).getTime() >= new Date(resolveBy).getTime() + DAY_MS
}

export function isDue(forecast: ForecastLike, now: Date): boolean {
  return forecast.resolution === null && isPastResolveBy(forecast.resolveBy, now)
}

/** Why a resolution is not allowed yet, or null when it is. Happened and reopening are always allowed. */
export function resolutionBlock(resolveBy: Date, resolution: ForecastResolution | null, now: Date): string | null {
  if (resolution === null || resolution === 'HAPPENED') return null
  return isPastResolveBy(resolveBy, now) ? null : `You can mark this after ${formatForecastDate(resolveBy)}.`
}

type SummaryForecast = ForecastLike & { id: string; statement: string; position: number }

export type ForecastSummary<D extends string = string> = {
  brier: number | null
  scored: number
  /** Happened, Didn't happen and Can't tell. */
  resolved: number
  /** Unresolved, due ones included. */
  open: number
  due: number
  /** Scored forecasts still needed before the Brier score shows. */
  needed: number
  bands: Band[]
  finding: Finding | null
  byDomain: Array<{ domain: D; brier: number; count: number }>
  dueList: Array<{ decisionId: string; forecastId: string; sentence: string; resolveBy: Date }>
}

/** Everything the calibration page shows about forecasts, for one person's records. */
export function summarizeForecasts<D extends string>(
  records: Array<{ id: string; domainTag: D | null; forecasts: SummaryForecast[] }>,
  now: Date
): ForecastSummary<D> {
  const all = records.flatMap((record) => record.forecasts)
  const scored = scoredCount(all)
  const dueList = records
    .flatMap((record) =>
      record.forecasts
        .filter((forecast) => isDue(forecast, now))
        .map((forecast) => ({
          decisionId: record.id,
          forecastId: forecast.id,
          sentence: forecastSentence(forecast),
          resolveBy: new Date(forecast.resolveBy),
        }))
    )
    .sort((a, b) => a.resolveBy.getTime() - b.resolveBy.getTime())
  return {
    brier: brierScore(all),
    scored,
    resolved: all.filter((forecast) => forecast.resolution !== null).length,
    open: all.filter((forecast) => forecast.resolution === null).length,
    due: dueList.length,
    needed: Math.max(0, MIN_SCORED - scored),
    bands: reliabilityBands(all),
    finding: calibrationFinding(all),
    byDomain: brierByDomain(records),
    dueList,
  }
}
