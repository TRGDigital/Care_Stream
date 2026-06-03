import { clsx } from 'clsx'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?:    'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        'inline-flex items-center justify-center rounded-btn font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary'   && 'bg-teal text-white hover:bg-teal-dark',
        variant === 'secondary' && 'border border-gray-300 bg-white text-neutral-dark hover:bg-neutral-light',
        variant === 'ghost'     && 'text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark',
        variant === 'danger'    && 'bg-status-error text-white hover:opacity-90',
        variant === 'success'   && 'bg-green-600 text-white hover:bg-green-700',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-5 py-2.5 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        className,
      )}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
