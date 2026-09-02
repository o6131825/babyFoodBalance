type Props = {
  message?: string
}

export function Splash({ message = 'Загружаем полочку…' }: Props) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-cream dark:bg-charcoal">
      <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-sage text-3xl">
        🍼
      </div>
      <p className="font-semibold text-muted">{message}</p>
    </div>
  )
}
