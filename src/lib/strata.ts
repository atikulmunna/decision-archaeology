import type { DomainTag, OutcomeUpdate } from '@prisma/client'
import { formatCatalogNumber } from '@/lib/catalog'
import { formatForecastDate } from '@/lib/forecasting'
import { OUTCOME_LABELS } from '@/lib/outcomes'

/**
 * The Strata Timeline as geometry: the archive drawn as a geological column,
 * oldest band at the bottom, one lane per domain, outcomes deposited above
 * their decision at their own date. Pure: the caller passes `now`, and the
 * component only draws what this returns, in a 360-unit-wide space.
 */

type OutcomeRating = OutcomeUpdate['outcomeRating']

export const STRATA_WIDTH = 360
export const STRATA_GUTTER = 48
export const LANE_WIDTH = 52
export const STRATA_TOP = 28
export const MIN_BAND_HEIGHT = 40
export const SPECIMEN_SIZE = 12
export const SPECIMEN_STEP = 14
export const SLOT_OFFSETS = [0, -14, 14] as const
/** Vertical room between successive outcome dots of one decision. */
export const OUTCOME_GAP = 8

export type StrataRecord = {
  id: string
  catalogNumber: number | null
  title: string
  domainTag: DomainTag | null
  createdAt: Date
  /** Oldest first. */
  outcomes: Array<{ createdAt: Date; outcomeRating: OutcomeRating }>
}

export type LaneKey = DomainTag

const LANE_ORDER: ReadonlyArray<{ key: LaneKey; label: string; short: string }> = [
  { key: 'CAREER', label: 'Career', short: 'CAR' },
  { key: 'FINANCE', label: 'Finance', short: 'FIN' },
  { key: 'HEALTH', label: 'Health', short: 'HLT' },
  { key: 'RELATIONSHIPS', label: 'Relationships', short: 'REL' },
  { key: 'CREATIVE', label: 'Creative', short: 'CRE' },
  { key: 'OTHER', label: 'Other', short: 'OTH' },
]

/** The six lanes in order, each with its center x. */
export const LANES = LANE_ORDER.map((lane, index) => ({
  ...lane,
  x: STRATA_GUTTER + LANE_WIDTH * index + LANE_WIDTH / 2,
}))

export type OutcomeStyle = 'better' | 'expected' | 'worse' | 'early'

export function outcomeStyle(rating: OutcomeRating): OutcomeStyle {
  switch (rating) {
    case 'MUCH_BETTER':
    case 'SLIGHTLY_BETTER':
      return 'better'
    case 'AS_EXPECTED':
      return 'expected'
    case 'SLIGHTLY_WORSE':
    case 'MUCH_WORSE':
      return 'worse'
    case 'TOO_EARLY_TO_TELL':
      return 'early'
  }
}

export type StrataBand = { key: string; label: string; start: Date; end: Date; y: number; height: number; tone: 'a' | 'b' }

export type StrataSpecimen = {
  id: string
  lane: LaneKey
  x: number
  y: number
  sealedAt: Date
  pending: boolean
  /** The spoken name of the specimen's link. */
  name: string
  card: { catalog: string; domain: string; title: string; sealed: string; status: string }
}

export type StrataOutcome = { decisionId: string; x: number; y: number; style: OutcomeStyle; beyond: string | null }

export type StrataCore = { decisionId: string; x: number; y1: number; y2: number }

export type StrataLayout = {
  year: number | null
  years: number[]
  width: number
  height: number
  bands: StrataBand[]
  specimens: StrataSpecimen[]
  outcomes: StrataOutcome[]
  cores: StrataCore[]
  summary: string
}

const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })
const monthYearFormat = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })

type BandRange = { key: string; label: string; summaryLabel: string; start: number; end: number }

function quarterBands(fromMs: number, end: Date): BandRange[] {
  const bands: BandRange[] = []
  const from = new Date(fromMs)
  let year = from.getUTCFullYear()
  let quarter = Math.floor(from.getUTCMonth() / 3)
  const last = end.getUTCFullYear() * 4 + Math.floor(end.getUTCMonth() / 3)
  while (year * 4 + quarter <= last) {
    const label = `Q${quarter + 1} ${year}`
    bands.push({ key: label, label, summaryLabel: label, start: Date.UTC(year, quarter * 3, 1), end: Date.UTC(year, quarter * 3 + 3, 1) })
    quarter += 1
    if (quarter === 4) {
      quarter = 0
      year += 1
    }
  }
  return bands
}

function monthBands(year: number, end: Date): BandRange[] {
  const lastMonth = year === end.getUTCFullYear() ? end.getUTCMonth() : 11
  return Array.from({ length: lastMonth + 1 }, (_, month) => {
    const start = Date.UTC(year, month, 1)
    return {
      key: `${year}-${month + 1}`,
      label: monthFormat.format(start).toUpperCase(),
      summaryLabel: monthYearFormat.format(start),
      start,
      end: Date.UTC(year, month + 1, 1),
    }
  })
}

function laneOf(record: StrataRecord) {
  return LANES.find((lane) => lane.key === record.domainTag) ?? LANES[LANES.length - 1]
}

function describe(record: StrataRecord, laneLabel: string): Pick<StrataSpecimen, 'name' | 'card' | 'pending'> {
  const catalog = record.catalogNumber === null ? 'Uncatalogued' : formatCatalogNumber(record.catalogNumber)
  const sealedOn = formatForecastDate(record.createdAt)
  const latest = record.outcomes.at(-1)
  const outcome = latest ? OUTCOME_LABELS[latest.outcomeRating] : null
  return {
    pending: latest === undefined,
    name: `${catalog}, ${laneLabel}, ${record.title}, sealed ${sealedOn}, ${outcome ? `latest outcome ${outcome}` : 'no outcome yet'}`,
    card: {
      catalog,
      domain: laneLabel,
      title: record.title,
      sealed: `Sealed ${sealedOn}`,
      status: outcome ? `Latest outcome: ${outcome}` : 'No outcome yet',
    },
  }
}

export function layoutStrata(records: StrataRecord[], options: { year: number | null; now: Date }): StrataLayout {
  const { year, now } = options
  const time = (date: Date) => new Date(date).getTime()
  const years = [...new Set(records.map((record) => new Date(record.createdAt).getUTCFullYear()))].sort((a, b) => a - b)

  const drawn = records
    .filter((record) => year === null || new Date(record.createdAt).getUTCFullYear() === year)
    .sort((a, b) => time(a.createdAt) - time(b.createdAt) || a.id.localeCompare(b.id))

  const oldest = drawn.length > 0 ? time(drawn[0].createdAt) : now.getTime()
  // The column runs to now, or further when an imported decision is dated after it.
  const end = new Date(Math.max(now.getTime(), drawn.length > 0 ? time(drawn[drawn.length - 1].createdAt) : 0))
  const ranges = year === null ? quarterBands(oldest, end) : monthBands(year, end)
  const yearEnd = year === null ? null : Date.UTC(year + 1, 0, 1)

  const bandIndex = (ms: number) => {
    const found = ranges.findIndex((range) => ms >= range.start && ms < range.end)
    if (found >= 0) return found
    return ms < ranges[0].start ? 0 : ranges.length - 1
  }

  // Each band is as tall as its own densest lane needs, so one busy quarter never stretches the quiet ones.
  const perLaneBand = new Map<string, number>()
  const densestByBand = ranges.map(() => 0)
  for (const record of drawn) {
    const index = bandIndex(time(record.createdAt))
    const key = `${laneOf(record).key}:${index}`
    const count = (perLaneBand.get(key) ?? 0) + 1
    perLaneBand.set(key, count)
    densestByBand[index] = Math.max(densestByBand[index], count)
  }
  const n = ranges.length
  const bandHeights = densestByBand.map((densest) =>
    densest <= 3 ? MIN_BAND_HEIGHT : SPECIMEN_STEP * (2 * Math.ceil(densest / 3) + 1)
  )
  // Newest at the top: a band starts below every newer band.
  const tops: number[] = []
  let running = STRATA_TOP
  for (let index = n - 1; index >= 0; index -= 1) {
    tops[index] = running
    running += bandHeights[index]
  }
  const height = running
  const bandTop = (index: number) => tops[index]

  const yFor = (ms: number) => {
    const index = bandIndex(ms)
    const range = ranges[index]
    const fraction = Math.min(1, Math.max(0, (ms - range.start) / (range.end - range.start)))
    return bandTop(index) + bandHeights[index] * (1 - fraction)
  }

  const bands: StrataBand[] = ranges.map((range, index) => ({
    key: range.key,
    label: range.label,
    start: new Date(range.start),
    end: new Date(range.end),
    y: bandTop(index),
    height: bandHeights[index],
    tone: index % 2 === 0 ? 'a' : 'b',
  }))

  const minY = STRATA_TOP + SPECIMEN_SIZE / 2
  const maxY = height - SPECIMEN_SIZE / 2
  const placed: Array<{ x: number; y: number }> = []
  const isFree = (x: number, y: number) =>
    placed.every((other) => Math.abs(other.x - x) >= SPECIMEN_STEP || Math.abs(other.y - y) >= SPECIMEN_STEP)

  // Oldest first: try the lane's slots at the specimen's own height, then step up, then down.
  const place = (laneX: number, wanted: number) => {
    const start = Math.min(maxY, Math.max(minY, wanted))
    const heights: number[] = []
    for (let y = start; y >= minY; y -= SPECIMEN_STEP) heights.push(y)
    for (let y = start + SPECIMEN_STEP; y <= maxY; y += SPECIMEN_STEP) heights.push(y)
    for (const y of heights) {
      for (const offset of SLOT_OFFSETS) {
        if (isFree(laneX + offset, y)) return { x: laneX + offset, y }
      }
    }
    throw new Error('Strata layout found no free slot.')
  }

  const specimens: StrataSpecimen[] = []
  const outcomes: StrataOutcome[] = []
  const cores: StrataCore[] = []

  for (const record of drawn) {
    const lane = laneOf(record)
    const position = place(lane.x, yFor(time(record.createdAt)))
    placed.push(position)
    specimens.push({
      id: record.id,
      lane: lane.key,
      x: position.x,
      y: position.y,
      sealedAt: new Date(record.createdAt),
      ...describe(record, lane.label),
    })

    // Each deposit sits at least a step above the specimen and above the one before it.
    let lowest = position.y - SPECIMEN_STEP
    for (const outcome of record.outcomes) {
      const at = time(outcome.createdAt)
      const beyond = yearEnd !== null && at >= yearEnd
      const y = beyond ? STRATA_TOP : Math.max(STRATA_TOP, Math.min(yFor(at), lowest))
      if (!beyond) lowest = y - OUTCOME_GAP
      outcomes.push({
        decisionId: record.id,
        x: position.x,
        y,
        style: outcomeStyle(outcome.outcomeRating),
        beyond: beyond ? monthYearFormat.format(at) : null,
      })
    }
    const deposits = outcomes.filter((outcome) => outcome.decisionId === record.id)
    if (deposits.length > 0) {
      cores.push({ decisionId: record.id, x: position.x, y1: position.y - SPECIMEN_SIZE / 2, y2: deposits[deposits.length - 1].y })
    }
  }

  const count = specimens.length
  const summary = `${count} decision${count === 1 ? '' : 's'} from ${ranges[0].summaryLabel} to ${ranges[n - 1].summaryLabel}`

  return { year, years, width: STRATA_WIDTH, height, bands, specimens, outcomes, cores, summary }
}
