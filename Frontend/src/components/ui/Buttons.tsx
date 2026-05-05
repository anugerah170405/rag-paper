import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline'
type Size = 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export default function Button({
  className,
  variant = 'primary',
  size = 'sm',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  ...props
}: Props) {
  const base =
    'inline-flex items-center justify-start rounded-lg font-small transition disabled:opacity-50 disabled:pointer-events-none w-0'

  const variants = {
    primary:
      'bg-[var(--accent)] text-white hover:bg-[var(--accent-bg)] hover:text-[var(--accent)]',
    secondary:
      'bg-transparent text-accent hover:bg-[var(--accent-bg)]',
    ghost:
      'bg-transparent hover:bg-[var(--accent-bg)] text-base',
    outline:
      'border border-base hover:bg-[var(--accent-bg)] text-base',
  }

  const sizes = {
    sm: 'h-8 px-2 w-8 text-sm',
    md: 'h-10 px-3 w-10 text-md',
    lg: 'h-12 px-4 w-12 text-lg',
  }

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {/* LEFT SECTION */}
      <div className="flex items-center gap-2">
        {!loading && leftIcon}
        {loading ? <span className="animate-pulse">Loading...</span> : children}
      </div>

      {/* RIGHT ICON (pushed to edge) */}
      {/* <div className="ml-auto flex items-center">
        {!loading && rightIcon}
      </div> */}
    </button>
  )
}