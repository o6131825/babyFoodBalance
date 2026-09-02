import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '@/features/store/appStore'

export function AuthGate() {
  const user = useAppStore((s) => s.user)
  const children = useAppStore((s) => s.state.children)
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace />

  const onboarding = location.pathname.startsWith('/onboarding')
  if (children.length === 0 && !onboarding) {
    return <Navigate to="/onboarding" replace />
  }
  if (children.length > 0 && onboarding) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
