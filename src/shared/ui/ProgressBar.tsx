import { cn } from '@/shared/lib/cn'
import type { BalanceStatus } from '@/data/types'

type Props = {
  ratio: number
  status: BalanceStatus
}

export function ProgressBar({ ratio, status }: Props) {
  const width = Math.min(100, Math.max(0, ratio * 100))
  return (
    <div className="h-2 overflow-hidden rounded-full bg-cream-2 dark:bg-dark-line">
      <div
        className={cn(
          'h-full rounded-full transition-all',
          status === 'over' && 'bg-danger',
          status === 'low' && 'bg-warning',
          status === 'ok' && 'bg-sage',
        )}
        style={{ width: `${status === 'over' ? 100 : width}%` }}
      />
    </div>
  )
}
