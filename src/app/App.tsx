import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/app/AppLayout'
import { AuthGate } from '@/app/AuthGate'
import { useAppStore } from '@/features/store/appStore'
import { CategoryFormScreen } from '@/screens/CategoryFormScreen'
import { CategoryScreen } from '@/screens/CategoryScreen'
import { DashboardScreen } from '@/screens/DashboardScreen'
import { LoginScreen } from '@/screens/LoginScreen'
import { OnboardingScreen } from '@/screens/OnboardingScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'

function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-cream dark:bg-charcoal">
      <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-sage text-3xl">
        🍼
      </div>
      <p className="font-semibold text-muted">Загружаем полочку…</p>
    </div>
  )
}

export default function App() {
  const hydrated = useAppStore((s) => s.hydrated)
  if (!hydrated) return <Splash />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route element={<AuthGate />}>
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardScreen />} />
            <Route path="/category/:id" element={<CategoryScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route
              path="/settings/category/:id"
              element={<CategoryFormScreen />}
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
