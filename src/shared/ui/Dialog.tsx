import { Button } from '@/shared/ui/Button'

type Props = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function Dialog({
  open,
  title,
  description,
  confirmLabel = 'Подтвердить',
  danger,
  onConfirm,
  onClose,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-ink/40 dark:bg-black/60"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-3xl bg-surface p-5 shadow-xl dark:bg-charcoal-2">
        <h2 className="text-lg font-extrabold text-ink dark:text-dark-text">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm text-muted dark:text-dark-muted">
            {description}
          </p>
        ) : null}
        <div className="mt-5 flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            className="flex-1"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
