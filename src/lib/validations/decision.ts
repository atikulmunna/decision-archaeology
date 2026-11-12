import { z } from 'zod'

const MIN_CHARS = 20

// ── Enums (mirrors Prisma schema) ──────────────────────────

export const DomainTagEnum = z.enum([
  'CAREER',
  'FINANCE',
  'HEALTH',
  'RELATIONSHIPS',
  'CREATIVE',
  'OTHER',
])

// ── Forecasts ───────────────────────────────────────────────

export const FORECAST_MAX = 3
const PROBABILITY_MESSAGE = 'Use a probability from 5% to 95% in steps of 5.'
export const FORECAST_DATE_MESSAGE = 'Pick a date after today.'
const VALID_DATE_MESSAGE = 'Pick a valid date.'

/** A forecast as a draft may hold it: any resolve-by date (checked again on finalize). */
export const DraftForecastSchema = z.object({
  statement: z.string().trim().min(1, 'Write what you are forecasting.').max(200, 'Keep a forecast under 200 characters.'),
  probability: z
    .number()
    .int(PROBABILITY_MESSAGE)
    .min(5, PROBABILITY_MESSAGE)
    .max(95, PROBABILITY_MESSAGE)
    .refine((value) => value % 5 === 0, PROBABILITY_MESSAGE),
  resolveBy: z.iso.date(VALID_DATE_MESSAGE),
})

/** A forecast that locks with the decision: its date must be after today in UTC, checked when parsed. */
export const ForecastSchema = DraftForecastSchema.extend({
  resolveBy: z.iso.date(VALID_DATE_MESSAGE).refine((value) => value > new Date().toISOString().slice(0, 10), FORECAST_DATE_MESSAGE),
})

export type ForecastInput = z.infer<typeof DraftForecastSchema>

// ── Core Decision Schemas ───────────────────────────────────

export const CreateDecisionSchema = z.object({
  title: z.string().min(MIN_CHARS, `Title must be at least ${MIN_CHARS} characters`),
  summary: z.string().min(MIN_CHARS, `Summary must be at least ${MIN_CHARS} characters`),
  context: z.string().min(MIN_CHARS, `Context must be at least ${MIN_CHARS} characters`),
  alternatives: z
    .string()
    .min(MIN_CHARS, `Alternatives must be at least ${MIN_CHARS} characters`),
  chosenOption: z
    .string()
    .min(MIN_CHARS, `Chosen option must be at least ${MIN_CHARS} characters`),
  reasoning: z.string().min(MIN_CHARS, `Reasoning must be at least ${MIN_CHARS} characters`),

  // Optional fields
  values: z.string().optional(),
  uncertainties: z.string().optional(),
  predictedOutcome: z.string().optional(),
  predictedTimeframe: z.string().datetime().optional().nullable(),
  confidenceLevel: z.number().int().min(1).max(10).optional().nullable(),
  domainTag: DomainTagEnum.optional().nullable(),
  customTags: z.array(z.string()).max(5, 'Maximum 5 custom tags').default([]),
  forecasts: z.array(ForecastSchema).max(FORECAST_MAX, 'At most 3 forecasts.').optional(),
})

export type CreateDecisionInput = z.infer<typeof CreateDecisionSchema>

export const DraftDecisionSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  context: z.string().optional(),
  alternatives: z.string().optional(),
  chosenOption: z.string().optional(),
  reasoning: z.string().optional(),
  values: z.string().optional(),
  uncertainties: z.string().optional(),
  predictedOutcome: z.string().optional(),
  predictedTimeframe: z.string().datetime().optional().nullable(),
  confidenceLevel: z.number().int().min(1).max(10).optional().nullable(),
  domainTag: DomainTagEnum.optional().nullable(),
  customTags: z.array(z.string()).max(5, 'Maximum 5 custom tags').default([]),
  forecasts: z.array(DraftForecastSchema).max(FORECAST_MAX, 'At most 3 forecasts.').optional(),
})

export type DraftDecisionInput = z.infer<typeof DraftDecisionSchema>

export const UpdateNotesSchema = z.object({
  supplementaryNotes: z.string(),
})

export const UpdateDraftSchema = CreateDecisionSchema.partial()

export type UpdateDraftInput = z.infer<typeof UpdateDraftSchema>

export const FinalizeDecisionSchema = CreateDecisionSchema.extend({
  finalize: z.literal(true),
})

export type FinalizeDecisionInput = z.infer<typeof FinalizeDecisionSchema>
