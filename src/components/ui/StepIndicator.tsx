interface StepIndicatorProps {
  steps: string[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <ol className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule pb-3 font-mono text-[11px] uppercase tracking-[0.09em]">
      {steps.map((label, i) => {
        const step = i + 1
        const active = step === currentStep
        const done = step < currentStep
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className={`flex items-center gap-2 border-b-[1.5px] pb-1 ${
              active ? 'border-signal text-ink' : done ? 'border-transparent text-ink-2' : 'border-transparent text-muted'
            }`}
          >
            <span>{String(step).padStart(2, '0')}</span>
            <span>{label}</span>
            {i < steps.length - 1 && <span aria-hidden="true" className="text-rule">/</span>}
          </li>
        )
      })}
    </ol>
  )
}
