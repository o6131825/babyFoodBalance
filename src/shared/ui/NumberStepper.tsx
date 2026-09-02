import { Minus, Plus } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

type Props = {
  value: number
  onChange: (value: number) => void
  min?: number
}

export function NumberStepper({ value, onChange, min = 0 }: Props) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Уменьшить"
        className={cn(
          'flex size-11 items-center justify-center rounded-full bg-sage-soft text-sage-hover transition active:scale-95 dark:bg-sage/20 dark:text-sage-soft',
          value <= min && 'opacity-40',
        )}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus size={18} />
      </button>
      <input
        inputMode="numeric"
        aria-label="Количество"
        className="h-11 w-14 rounded-xl border border-line bg-surface text-center text-lg font-bold text-ink outline-none focus:border-sage dark:border-dark-line dark:bg-charcoal-2 dark:text-dark-text"
        value={value}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, '')
          onChange(next === '' ? min : Math.max(min, Number(next)))
        }}
      />
      <button
        type="button"
        aria-label="Увеличить"
        className="flex size-11 items-center justify-center rounded-full bg-sage text-white transition active:scale-95"
        onClick={() => onChange(value + 1)}
      >
        <Plus size={18} />
      </button>
    </div>
  )
}
