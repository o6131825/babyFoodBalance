import { cn } from '@/shared/lib/cn'
import type { InputHTMLAttributes, ReactNode } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  suffix?: ReactNode
}

export function Field({ label, hint, suffix, className, id, ...props }: Props) {
  const fieldId = id ?? props.name ?? label
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-muted dark:text-dark-muted">
        {label}
      </span>
      <span className="relative flex">
        <input
          id={fieldId}
          className={cn(
            'h-12 w-full rounded-2xl border border-line bg-surface px-4 text-ink outline-none transition placeholder:text-muted/70 focus:border-sage dark:border-dark-line dark:bg-charcoal-2 dark:text-dark-text',
            suffix ? 'pr-12' : undefined,
            className,
          )}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted">
            {suffix}
          </span>
        ) : null}
      </span>
      {hint ? (
        <span className="text-xs text-muted dark:text-dark-muted">{hint}</span>
      ) : null}
    </label>
  )
}
