import { clsx } from 'clsx'

type Variant = 'active' | 'processing' | 'archived' | 'superseded' | 'failed' | 'admin' | 'staff' | 'neutral'

const STYLES: Record<Variant, string> = {
  active:     'bg-teal-light text-teal',
  processing: 'bg-amber-50 text-amber-brand',
  archived:   'bg-gray-100 text-neutral-mid',
  superseded: 'bg-gray-100 text-neutral-mid',
  failed:     'bg-red-50 text-status-error',
  admin:      'bg-teal text-white',
  staff:      'bg-purple-50 text-purple-700',
  neutral:    'bg-neutral-light text-neutral-mid',
}

export function Badge({
  variant = 'neutral',
  children,
  className,
}: {
  variant?:  Variant
  children:  React.ReactNode
  className?: string
}) {
  return (
    <span className={clsx(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      STYLES[variant],
      className,
    )}>
      {children}
    </span>
  )
}
