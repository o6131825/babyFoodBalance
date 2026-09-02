import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  consumeGoogleRedirect,
  googleConfigured,
  hasOAuthCallback,
  startGoogleSignIn,
} from '@/features/auth/google'
import { useAppStore } from '@/features/store/appStore'
import { Button } from '@/shared/ui/Button'

export function LoginScreen() {
  const user = useAppStore((s) => s.user)
  const children = useAppStore((s) => s.state.children)
  const setUser = useAppStore((s) => s.setUser)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(hasOAuthCallback)
  const hasGoogle = googleConfigured()

  useEffect(() => {
    void consumeGoogleRedirect()
      .then((next) => {
        if (next) setUser(next)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Не удалось войти')
      })
      .finally(() => {
        setPending(false)
      })
  }, [setUser])

  if (user) {
    return <Navigate to={children.length ? '/' : '/onboarding'} replace />
  }

  function google() {
    setPending(true)
    setError(null)
    try {
      startGoogleSignIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти')
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream px-safe pt-safe dark:bg-charcoal">
      <div className="relative overflow-hidden pb-8 pt-10">
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-sage/20" />
        <div className="absolute -left-8 top-24 size-24 rounded-full bg-terracotta/15" />
        <div className="relative">
          <div className="flex size-16 items-center justify-center rounded-3xl bg-sage text-3xl shadow-sm">
            🍼
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink dark:text-dark-text">
            Нормы питания
          </h1>
          <p className="mt-2 max-w-xs text-muted dark:text-dark-muted">
            Считайте остаток детского питания по категориям — спокойно и без
            таблиц.
          </p>
        </div>
      </div>

      <ul className="space-y-3 text-sm font-semibold text-ink dark:text-dark-text">
        <li className="rounded-2xl bg-surface px-4 py-3 dark:bg-charcoal-2">
          Остаток категории пересчитывается сразу
        </li>
        <li className="rounded-2xl bg-surface px-4 py-3 dark:bg-charcoal-2">
          Несколько детей — общие продукты, свои лимиты
        </li>
        <li className="rounded-2xl bg-surface px-4 py-3 dark:bg-charcoal-2">
          Данные только в скрытой папке вашего Google Диска
        </li>
      </ul>

      <div className="mt-auto space-y-3 pb-safe pt-10">
        {error ? (
          <p className="text-center text-sm text-danger">{error}</p>
        ) : null}
        {!hasGoogle ? (
          <p className="text-center text-sm text-muted">
            Чтобы войти через Google, задайте VITE_GOOGLE_CLIENT_ID в файле
            .env
          </p>
        ) : null}
        <Button block disabled={!hasGoogle || pending} onClick={() => void google()}>
          {pending ? 'Входим…' : 'Войти с помощью Google'}
        </Button>
        {!hasGoogle ? (
          <Button
            block
            variant="outline"
            onClick={() =>
              setUser({
                name: 'Локально',
                email: 'local@device',
                local: true,
              })
            }
          >
            Продолжить на этом устройстве
          </Button>
        ) : null}
        <p className="pb-4 text-center text-xs text-muted dark:text-dark-muted">
          Без своего сервера. Можно пользоваться офлайн.
        </p>
      </div>
    </div>
  )
}
