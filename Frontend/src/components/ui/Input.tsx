import { cn } from '@/lib/utils'
import type { InputHTMLAttributes, ReactNode } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export default function Input({
  className,
  leftIcon,
  rightIcon,
  ...props
}: Props) {
  return (
    <div className="relative w-full">
      
      {/* LEFT ICON */}
      {leftIcon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {leftIcon}
        </div>
      )}

      {/* INPUT */}
      <input
        className={cn(
          'w-full rounded-full px-4 py-2 text-sm',
          'bg-[var(--bg)] border border-base',
          'text-sm placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]',
          'transition',

          // padding adjustment kalau ada icon
          leftIcon && 'pl-8',
          rightIcon && 'pr-8',

          className
        )}
        {...props}
      />

      {/* RIGHT ICON */}
      {rightIcon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {rightIcon}
        </div>
      )}

    </div>
  )
}