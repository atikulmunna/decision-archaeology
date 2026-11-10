import { Callout } from '@/components/ui/Callout'

/** Read-only viewers (the demo) cannot flag findings, so the banner only asks owners to. */
export function AIDisclosureBanner({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <Callout title="AI-generated report">
      This analysis is a thinking prompt, not a verdict. It may contain errors or misinterpretations.
      {!readOnly && ' Flag any findings that seem inaccurate.'}
    </Callout>
  )
}
