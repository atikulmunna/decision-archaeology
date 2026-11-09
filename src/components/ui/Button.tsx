import { ButtonHTMLAttributes, forwardRef } from 'react'
import Link from 'next/link'
import { LoaderCircle } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  /** Renders a Next.js link styled as a button. */
  href?: string
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:opacity-90 disabled:opacity-50',
  secondary: 'border-[1.5px] border-ink bg-transparent text-ink hover:bg-sunken disabled:opacity-50',
  ghost: 'text-ink-2 hover:bg-sunken hover:text-ink disabled:opacity-50',
  danger: 'bg-danger text-surface hover:opacity-90 disabled:opacity-50',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5',
  md: 'px-4 py-2',
  lg: 'px-6 py-3',
}

export function buttonClasses({ variant = 'primary', size = 'md', className = '' }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return `inline-flex items-center justify-center gap-2 rounded-sm font-mono text-xs font-medium uppercase tracking-[0.09em] transition-[opacity,background-color,color] duration-150 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, href, children, className = '', disabled, ...props }, ref) => {
    const classes = buttonClasses({ variant, size, className })

    if (href) {
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      )
    }

    return (
      <button ref={ref} disabled={disabled || loading} className={classes} {...props}>
        {loading && <LoaderCircle aria-hidden="true" size={14} strokeWidth={1.5} className="motion-safe:animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
