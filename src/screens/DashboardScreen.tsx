import { ChevronDown, Settings } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryBalance, formatAmount } from '@/features/calculator'
import { useAppStore } from '@/features/store/appStore'
import { Button } from '@/shared/ui/Button'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { Sheet } from '@/shared/ui/Sheet'
import { SyncBadge } from '@/shared/ui/SyncBadge'
import { cn } from '@/shared/lib/cn'

export function DashboardScreen() {
  const state = useAppStore((s) => s.state)
  const syncStatus = useAppStore((s) => s.syncStatus)
  const setActiveChild = useAppStore((s) => s.setActiveChild)
  const [picker, setPicker] = useState(false)

  const child = state.children.find((item) => item.id === state.activeChildId)
  const cards = useMemo(() => {
    if (!state.activeChildId) return []
    return state.categories
      .filter((category) =>
        state.limits.some(
          (limit) =>
            limit.categoryId === category.id &&
            limit.childId === state.activeChildId,
        ),
      )
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((category) => ({
        category,
        balance: categoryBalance(state, category.id, state.activeChildId!),
      }))
      .filter((item) => item.balance)
  }, [state])

  return (
    <div className="px-safe pt-safe">
      <header className="flex items-center gap-2 py-4">
        <button
          type="button"
          onClick={() => setPicker(true)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-surface px-3 py-2 text-left shadow-sm dark:bg-charcoal-2"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-soft text-lg dark:bg-sage/20">
            👶
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-extrabold">
              {child?.name ?? 'Профиль'}
            </span>
            <span className="text-xs text-muted">сменить ребёнка</span>
          </span>
          <ChevronDown size={18} className="text-muted" />
        </button>
        <SyncBadge status={syncStatus} />
        <Link
          to="/settings"
          aria-label="Настройки"
          className="flex size-11 items-center justify-center rounded-full bg-surface text-ink shadow-sm dark:bg-charcoal-2 dark:text-dark-text"
        >
          <Settings size={20} />
        </Link>
      </header>

      <h1 className="text-2xl font-extrabold">Категории</h1>
      <p className="mt-1 text-sm text-muted dark:text-dark-muted">
        Остаток считается по лимиту минус товары в наличии.
      </p>

      <div className="mt-4 space-y-3">
        {cards.length === 0 ? (
          <div className="rounded-3xl bg-surface p-5 text-center dark:bg-charcoal-2">
            <p className="font-bold">Пока нет лимитов</p>
            <p className="mt-1 text-sm text-muted">
              Назначьте категории этому ребёнку — и здесь появится калькулятор.
            </p>
            <Link to="/settings/category/new">
              <Button className="mt-4" block>
                Добавить категорию
              </Button>
            </Link>
          </div>
        ) : (
          cards.map(({ category, balance }) => {
            if (!balance) return null
            const over = balance.status === 'over'
            return (
              <Link
                key={category.id}
                to={`/category/${category.id}`}
                className="block rounded-3xl bg-surface p-4 shadow-sm dark:bg-charcoal-2"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-cream-2 text-2xl dark:bg-charcoal">
                    {category.image ? (
                      <img
                        src={category.image}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      category.icon
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-extrabold">{category.name}</p>
                      <p
                        className={cn(
                          'text-lg font-extrabold',
                          over && 'text-danger',
                          balance.status === 'low' && 'text-warning',
                          balance.status === 'ok' && 'text-sage',
                        )}
                      >
                        {over
                          ? `−${formatAmount(balance.overBy, category.unit)}`
                          : formatAmount(balance.remaining, category.unit)}
                      </p>
                    </div>
                    <p className="text-sm text-muted dark:text-dark-muted">
                      {over
                        ? `Превышение лимита на ${formatAmount(balance.overBy, category.unit)}!`
                        : `Осталось: ${formatAmount(balance.remaining, category.unit)} из ${formatAmount(balance.limit, category.unit)}`}
                    </p>
                    <div className="mt-2">
                      <ProgressBar ratio={balance.ratio} status={balance.status} />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>

      <Sheet
        open={picker}
        title="Кто сейчас"
        onClose={() => setPicker(false)}
      >
        <div className="space-y-2 pb-4">
          {state.children.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left font-bold',
                item.id === state.activeChildId
                  ? 'bg-sage text-white'
                  : 'bg-cream-2 dark:bg-charcoal',
              )}
              onClick={() => {
                setActiveChild(item.id)
                setPicker(false)
              }}
            >
              {item.name}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  )
}
