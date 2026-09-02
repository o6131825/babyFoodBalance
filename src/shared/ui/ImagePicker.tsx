import { Camera, ImagePlus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { cn, compressImage } from '@/shared/lib/cn'

type Props = {
  value?: string
  onChange: (dataUrl?: string) => void
  label?: string
}

export function ImagePicker({
  value,
  onChange,
  label = 'Картинка (необязательно)',
}: Props) {
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      onChange(await compressImage(file))
    } catch {
      setError('Не удалось загрузить изображение')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-muted dark:text-dark-muted">
        {label}
      </p>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'relative size-16 shrink-0 overflow-hidden rounded-2xl bg-cream-2 dark:bg-charcoal',
            busy && 'opacity-60',
          )}
        >
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-muted">
              <ImagePlus size={22} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-cream-2 text-sm font-bold disabled:opacity-50 dark:bg-charcoal"
              onClick={() => galleryRef.current?.click()}
            >
              <ImagePlus size={16} />
              Галерея
            </button>
            <button
              type="button"
              disabled={busy}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-cream-2 text-sm font-bold disabled:opacity-50 dark:bg-charcoal"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera size={16} />
              Фото
            </button>
          </div>
          {value ? (
            <button
              type="button"
              disabled={busy}
              className="flex items-center gap-1 text-xs font-bold text-muted"
              onClick={() => onChange(undefined)}
            >
              <X size={12} />
              Убрать картинку
            </button>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
