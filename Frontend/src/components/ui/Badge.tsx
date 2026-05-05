import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

type Variant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'

type Size = 'sm' | 'md'

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: Variant
  size?: Size
  leftIcon?: ReactNode
}

export default function Badge({
  className,
  variant = 'primary',
  size = 'sm',
  leftIcon,
  children,
  ...props
}: Props) {
  const base =
    'inline-flex items-center gap-1 rounded-full font-medium'

  const variants = {
    primary:
      'bg-[var(--accent-bg)] text-[var(--accent)]',
    secondary:
      'bg-[var(--border)] text-base',
    success:
      'bg-green-100 text-green-600',
    warning:
      'bg-yellow-100 text-yellow-700',
    danger:
      'bg-red-100 text-red-600',
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
  }

  return (
    <div
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {leftIcon}
      {children}
    </div>
  )
}