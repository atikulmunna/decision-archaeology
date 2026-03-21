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
