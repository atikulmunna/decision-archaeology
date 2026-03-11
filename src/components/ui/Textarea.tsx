import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  charCount?: number
  minChars?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, charCount, minChars, className = '', id, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={`min-h-[100px] rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y ${
          error ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'
        } ${className}`}
        {...props}
      />
      <div className="flex items-center justify-between">
        <div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
        </div>
        {charCount !== undefined && minChars && (
          <p className={`text-xs ${charCount >= minChars ? 'text-green-600' : 'text-gray-400'}`}>
            {charCount}/{minChars}+ chars
          </p>
        )}
      </div>
    </div>
  )
)
Textarea.displayName = 'Textarea'
