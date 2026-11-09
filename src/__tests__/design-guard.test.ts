import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

// Field Archive design rules: colors come only from tokens, never raw Tailwind
// palette classes or hex values, and icons are lucide-react, never emoji.
const ROOT = path.resolve(__dirname, '../..')
const SRC = path.join(ROOT, 'src')
const SKIP = new Set([path.join(SRC, '__tests__'), path.join(SRC, 'generated')])

const PALETTE_CLASS =
  /\b(?:bg|text|border|ring|from|via|to|fill|stroke|outline|divide|placeholder|decoration|accent|caret|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g
const ARBITRARY_HEX = /-\[#[0-9a-fA-F]{3,8}\]/g
const EMOJI = /\p{Extended_Pictographic}/gu

/** Files not yet moved onto the Field Archive system. Page tasks remove entries. */
const PENDING_MIGRATION: string[] = [
  'src/app/(dashboard)/ai/reports/[id]/page.tsx',
  'src/app/(dashboard)/ai/reports/page.tsx',
  'src/app/(dashboard)/calibration/page.tsx',
  'src/app/(dashboard)/decisions/[id]/page.tsx',
  'src/app/(dashboard)/decisions/loading.tsx',
  'src/app/(dashboard)/decisions/new/page.tsx',
  'src/app/(dashboard)/decisions/page.tsx',
  'src/app/(dashboard)/error.tsx',
  'src/app/(dashboard)/loading.tsx',
  'src/app/(dashboard)/shared/[shareId]/page.tsx',
  'src/app/global-error.tsx',
  'src/components/ai/AIDisclosureBanner.tsx',
  'src/components/ai/BiasReportCard.tsx',
  'src/components/ai/BiasReportView.tsx',
  'src/components/ai/GenerateReportButton.tsx',
  'src/components/calibration/CalibrationWidget.tsx',
  'src/components/decisions/AddOutcomeForm.tsx',
  'src/components/decisions/AttachmentManager.tsx',
  'src/components/decisions/CountdownTimer.tsx',
  'src/components/decisions/DecisionCaptureForm.tsx',
  'src/components/decisions/DecisionCard.tsx',
  'src/components/decisions/DecisionDetail.tsx',
  'src/components/decisions/DraftDecisionCard.tsx',
  'src/components/decisions/ExportImportPanel.tsx',
  'src/components/decisions/FilterBar.tsx',
  'src/components/decisions/OutcomeHistory.tsx',
  'src/components/decisions/StarterDecisionWizard.tsx',
  'src/components/decisions/SupplementaryNotesEditor.tsx',
  'src/components/decisions/TimeCapsuleConfirmation.tsx',
  'src/components/sharing/CommentThread.tsx',
  'src/components/sharing/SharePanel.tsx',
]

export function findDesignViolations(source: string): string[] {
  return [
    ...(source.match(PALETTE_CLASS) ?? []),
    ...(source.match(ARBITRARY_HEX) ?? []),
    ...(source.match(EMOJI) ?? []),
  ]
}

function allTsxFiles(dir = SRC): string[] {
  if (SKIP.has(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return allTsxFiles(full)
    return entry.name.endsWith('.tsx') ? [path.relative(ROOT, full).split(path.sep).join('/')] : []
  })
}

const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8')

describe('design guard', () => {
  it('detects each violation type', () => {
    expect(findDesignViolations('className="bg-gray-50"')).toHaveLength(1)
    expect(findDesignViolations('className="text-[#ff0000]"')).toHaveLength(1)
    expect(findDesignViolations('<span>\u{1F512}</span>')).toHaveLength(1)
    expect(findDesignViolations('className="bg-paper text-ink"')).toEqual([])
  })

  it('finds no violations outside the pending-migration list', () => {
    const offenders = allTsxFiles()
      .filter((file) => !PENDING_MIGRATION.includes(file))
      .filter((file) => findDesignViolations(read(file)).length > 0)
    expect(offenders).toEqual([])
  })

  it('lists only files that still need migration', () => {
    const stale = PENDING_MIGRATION.filter((file) => findDesignViolations(read(file)).length === 0)
    expect(stale).toEqual([])
  })
})
