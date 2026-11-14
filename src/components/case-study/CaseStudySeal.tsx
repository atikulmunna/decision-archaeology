'use client'

import { useMemo, useState } from 'react'
import { SealPanel, type SealRecord } from '@/components/seal/SealPanel'
import { tamperReasoning } from '@/lib/tamper'

/**
 * The real seal panel on the case study, with the demo tamper test. It changes the record the same way
 * DecisionDetail does, in the browser only, so Verify visibly fails.
 */
export function CaseStudySeal({ record }: { record: SealRecord }) {
  const [tampered, setTampered] = useState(false)
  const shown = useMemo(
    () => (tampered ? { ...record, reasoning: tamperReasoning(record.reasoning).text } : record),
    [record, tampered]
  )
  return <SealPanel record={shown} tampered={tampered} onTamperedChange={setTampered} />
}
