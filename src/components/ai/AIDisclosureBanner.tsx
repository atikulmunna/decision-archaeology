export function AIDisclosureBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <span className="mt-0.5 text-base">🤖</span>
      <p className="text-sm text-amber-800">
        <strong>AI-generated report.</strong> This analysis is a thinking prompt, not a verdict.
        It may contain errors or misinterpretations. Flag any findings that seem inaccurate.
      </p>
    </div>
  )
}
