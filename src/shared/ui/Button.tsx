import { cn } from '@/shared/lib/cn'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  block?: boolean
}

const styles: Record<Variant, string> = {
  primary:
    'bg-sage text-white hover:bg-sage-hover active:scale-[0.99] shadow-sm',
  secondary:
    'bg-sage-soft text-sage-hover dark:bg-sage/20 dark:text-sage-soft',
  ghost:
    'bg-transparent text-ink dark:text-dark-text hover:bg-cream-2 dark:hover:bg-charcoal-2',
  danger: 'bg-danger text-white hover:brightness-110',
  outline:
    'border border-line dark:border-dark-line bg-surface dark:bg-charcoal-2 text-ink dark:text-dark-text',
}

export function Button({
  variant = 'primary',
  block,
  className,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant],
        block && 'w-full',
        className,
      )}
      {...props}
    />
  )
}
