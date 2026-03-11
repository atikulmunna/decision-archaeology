interface StepIndicatorProps {
  steps: string[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const step = i + 1
        const done = step < currentStep
        const active = step === currentStep
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                  done
                    ? 'bg-indigo-600 text-white'
                    : active
                    ? 'border-2 border-indigo-600 bg-white text-indigo-600'
                    : 'border-2 border-gray-200 bg-white text-gray-400'
                }`}
              >
                {done ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span className={`text-xs ${active ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 mb-5 h-px w-12 ${done ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
