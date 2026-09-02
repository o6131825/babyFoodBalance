import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { pullFromDrive } from '@/features/sync/engine'
import { useAppStore } from '@/features/store/appStore'
import { Button } from '@/shared/ui/Button'
import { Splash } from '@/shared/ui/Splash'

export function AuthGate() {
  const user = useAppStore((s) => s.user)
  const children = useAppStore((s) => s.state.children)
  const cloudReady = useAppStore((s) => s.cloudReady)
  const syncStatus = useAppStore((s) => s.syncStatus)
  const syncMessage = useAppStore((s) => s.syncMessage)
  const setUser = useAppStore((s) => s.setUser)
  const beginCloudRestore = useAppStore((s) => s.beginCloudRestore)
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace />

  const waitingForCloud =
    !user.local && children.length === 0 && !cloudReady
  if (waitingForCloud) {
    return <Splash message="Загружаем данные с Диска…" />
  }

  if (
    !user.local &&
    children.length === 0 &&
    (syncStatus === 'error' || syncStatus === 'offline')
  ) {
    const offline = syncStatus === 'offline'
    return (
      <div className="flex min-h-dvh flex-col bg-cream px-safe pt-safe dark:bg-charcoal">
        <div className="mt-10 flex size-16 items-center justify-center rounded-3xl bg-sage text-3xl">
          🍼
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
          {offline ? 'Нет сети' : 'Не удалось загрузить данные'}
        </h1>
        <p className="mt-3 text-muted dark:text-dark-muted">
          {offline
            ? 'Подключитесь к интернету, чтобы подтянуть детей и лимиты с Google Диска.'
            : syncMessage ||
              'Проверьте вход в Google и попробуйте ещё раз. Пока данные не загрузятся, новый ребёнок не создаём — так ничего не затрётся.'}
        </p>
        <div className="mt-auto space-y-3 pb-safe pt-10">
          <Button
            block
            onClick={() => {
              beginCloudRestore()
              void pullFromDrive()
            }}
          >
            Повторить
          </Button>
          <Button
            block
            variant="outline"
            onClick={() => setUser(null)}
          >
            Войти заново
          </Button>
        </div>
      </div>
    )
  }

  const onboarding = location.pathname.startsWith('/onboarding')
  if (children.length === 0 && !onboarding) {
    return <Navigate to="/onboarding" replace />
  }
  if (children.length > 0 && onboarding) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
