import { z } from 'zod'
import { NOTE_MAX } from '@/lib/field-notes'

const scale = z.number().int().min(1).max(5).nullable().optional()

export const CreateNoteSchema = z.object({
  body: z.string().trim().min(1, 'Write something first.').max(NOTE_MAX, 'Keep a note under 1000 characters.'),
  mood: scale,
  energy: scale,
  decisionId: z.string().min(1).nullable().optional(),
})

export const UpdateNoteSchema = CreateNoteSchema.partial().refine((value) => Object.keys(value).length > 0, 'Nothing to change.')

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>
