import { Cloud, CloudOff, HardDrive, LoaderCircle, WifiOff } from 'lucide-react'
import type { SyncStatus } from '@/data/types'
import { cn } from '@/shared/lib/cn'

const map: Record<
  SyncStatus,
  { label: string; className: string; icon: typeof Cloud }
> = {
  idle: { label: 'Готово', className: 'text-muted', icon: Cloud },
  syncing: { label: 'Пишем…', className: 'text-sage', icon: LoaderCircle },
  synced: { label: 'Диск', className: 'text-sage', icon: Cloud },
  offline: { label: 'Офлайн', className: 'text-warning', icon: WifiOff },
  error: { label: 'Ошибка', className: 'text-danger', icon: CloudOff },
  local: { label: 'Устройство', className: 'text-muted', icon: HardDrive },
}

type Props = {
  status: SyncStatus
}

export function SyncBadge({ status }: Props) {
  const item = map[status]
  const Icon = item.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-cream-2 px-2.5 py-1 text-xs font-semibold dark:bg-charcoal-2',
        item.className,
      )}
      title={item.label}
    >
      <Icon size={14} className={status === 'syncing' ? 'animate-spin' : ''} />
      {item.label}
    </span>
  )
}
