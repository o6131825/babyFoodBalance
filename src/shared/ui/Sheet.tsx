import { useEffect, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

type Props = {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
}

export function Sheet({ open, title, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-ink/40 dark:bg-black/60"
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-3xl bg-cream px-5 pb-safe pt-3 shadow-2xl dark:bg-charcoal-2',
        )}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line dark:bg-dark-line" />
        {title ? (
          <h2 className="mb-4 text-lg font-extrabold text-ink dark:text-dark-text">
            {title}
          </h2>
        ) : null}
        {children}
      </div>
    </div>
  )
}
