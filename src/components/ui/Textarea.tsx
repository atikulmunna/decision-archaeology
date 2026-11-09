import { TextareaHTMLAttributes, forwardRef } from 'react'
import { fieldClasses } from './Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  charCount?: number
  minChars?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, charCount, minChars, className = '', id, ...props }, ref) => {
    const errorId = id ? `${id}-error` : undefined
    const hintId = id ? `${id}-hint` : undefined
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-ink-2">
            {label}
            {props.required && <span className="ml-1 text-danger">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`${fieldClasses(error)} min-h-[100px] resize-y ${className}`}
          {...props}
        />
        <div className="flex items-center justify-between">
          <div>
            {error && (
              <p id={errorId} className="text-xs text-danger">
                {error}
              </p>
            )}
            {hint && !error && (
              <p id={hintId} className="text-xs text-muted">
                {hint}
              </p>
            )}
          </div>
          {charCount !== undefined && minChars && (
            <p className={`font-mono text-[11px] ${charCount >= minChars ? 'text-signal-ink' : 'text-muted'}`}>
              {charCount}/{minChars}+
            </p>
          )}
        </div>
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
