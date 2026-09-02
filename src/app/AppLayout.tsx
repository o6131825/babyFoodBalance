import { Home, Settings } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'

export function AppLayout() {
  const location = useLocation()
  const showNav =
    location.pathname === '/' || location.pathname === '/settings'

  return (
    <div className="flex min-h-dvh flex-col bg-cream dark:bg-charcoal">
      <div className={cn('flex-1', showNav && 'pb-24')}>
        <Outlet />
      </div>
      {showNav ? (
        <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t border-line/80 bg-cream/90 px-safe pb-safe backdrop-blur-md dark:border-dark-line dark:bg-charcoal/90">
          <div className="grid grid-cols-2 py-2">
            <Tab to="/" icon={Home} label="Главная" />
            <Tab to="/settings" icon={Settings} label="Настройки" />
          </div>
        </nav>
      ) : null}
    </div>
  )
}

function Tab({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: typeof Home
  label: string
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-0.5 py-1 text-xs font-semibold',
          isActive
            ? 'text-sage'
            : 'text-muted dark:text-dark-muted',
        )
      }
    >
      <Icon size={22} />
      {label}
    </NavLink>
  )
}
