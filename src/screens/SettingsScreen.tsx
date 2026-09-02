import {
  Baby,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Download,
  LogOut,
  Monitor,
  Moon,
  Plus,
  Sun,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ThemeMode } from '@/data/types'
import { useInstallPrompt } from '@/features/pwa/useInstallPrompt'
import { useAppStore } from '@/features/store/appStore'
import { pullFromDrive } from '@/features/sync/engine'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Field } from '@/shared/ui/Field'
import { Sheet } from '@/shared/ui/Sheet'
import { SyncBadge } from '@/shared/ui/SyncBadge'
import { cn } from '@/shared/lib/cn'

type ChildDraft = {
  id?: string
  name: string
  copyFromId: string | null
}

function categoriesLabel(count: number) {
  if (count === 0) return 'нет категорий'
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} категория`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} категории`
  }
  return `${count} категорий`
}

export function SettingsScreen() {
  const navigate = useNavigate()
  const state = useAppStore((s) => s.state)
  const user = useAppStore((s) => s.user)
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const signOut = useAppStore((s) => s.signOut)
  const syncStatus = useAppStore((s) => s.syncStatus)
  const syncMessage = useAppStore((s) => s.syncMessage)
  const addChild = useAppStore((s) => s.addChild)
  const renameChild = useAppStore((s) => s.renameChild)
  const deleteChild = useAppStore((s) => s.deleteChild)
  const copyLimitsFrom = useAppStore((s) => s.copyLimitsFrom)
  const resetPeriod = useAppStore((s) => s.resetPeriod)
  const clearGoogleData = useAppStore((s) => s.clearGoogleData)
  const { event: installEvent, installed, install } = useInstallPrompt()

  const [childSheet, setChildSheet] = useState<ChildDraft | null>(null)
  const [deleteChildId, setDeleteChildId] = useState<string | null>(null)
  const [copyPending, setCopyPending] = useState<{
    fromId: string
    toId: string
  } | null>(null)
  const [periodScope, setPeriodScope] = useState<'active' | 'all' | null>(null)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [clearCloudOpen, setClearCloudOpen] = useState(false)
  const [clearCloudBusy, setClearCloudBusy] = useState(false)
  const [clearCloudError, setClearCloudError] = useState<string | null>(null)

  const active = state.children.find((item) => item.id === state.activeChildId)

  function limitsCount(childId: string) {
    return state.limits.filter((item) => item.childId === childId).length
  }

  function openNewChild() {
    setChildSheet({
      name: '',
      copyFromId: state.activeChildId ?? state.children[0]?.id ?? null,
    })
  }

  function openExistingChild(id: string, name: string) {
    const others = state.children.filter((item) => item.id !== id)
    setChildSheet({
      id,
      name,
      copyFromId: others.length === 1 ? others[0].id : null,
    })
  }

  function applyCopy(fromId: string, toId: string) {
    const hasLimits = state.limits.some((item) => item.childId === toId)
    if (hasLimits) {
      setCopyPending({ fromId, toId })
      setChildSheet(null)
      return
    }
    copyLimitsFrom(fromId, toId)
    setChildSheet(null)
  }

  return (
    <div className="px-safe pt-safe pb-6">
      <header className="flex items-center gap-2 py-3">
        <Link
          to="/"
          aria-label="Закрыть настройки"
          className="flex size-11 items-center justify-center rounded-full bg-surface dark:bg-charcoal-2"
        >
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-2xl font-extrabold">Настройки</h1>
      </header>

      <section className="rounded-3xl bg-surface p-4 dark:bg-charcoal-2">
        <div className="flex items-center gap-3">
          {user?.picture ? (
            <img
              src={user.picture}
              alt=""
              className="size-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-sage-soft text-sage">
              <Baby size={22} />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-extrabold">{user?.name}</p>
            <p className="truncate text-sm text-muted">{user?.email}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <SyncBadge status={syncStatus} />
          {!user?.local ? (
            <button
              type="button"
              className="text-sm font-bold text-sage"
              onClick={() => void pullFromDrive()}
            >
              Синхронизировать
            </button>
          ) : null}
        </div>
        {syncMessage ? (
          <p className="mt-2 text-xs text-muted">{syncMessage}</p>
        ) : null}
      </section>

      <h2 className="mt-6 mb-2 text-sm font-bold text-muted">Тема</h2>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['light', 'Светлая', Sun],
            ['dark', 'Тёмная', Moon],
            ['system', 'Система', Monitor],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value satisfies ThemeMode)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-2xl py-3 text-xs font-bold',
              theme === value
                ? 'bg-sage text-white'
                : 'bg-surface text-ink dark:bg-charcoal-2 dark:text-dark-text',
            )}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      <h2 className="mt-6 mb-2 text-sm font-bold text-muted">Дети</h2>
      <div className="overflow-hidden rounded-3xl bg-surface dark:bg-charcoal-2">
        {state.children.map((child) => (
          <button
            key={child.id}
            type="button"
            className="flex w-full items-center justify-between border-b border-line px-4 py-3 text-left last:border-b-0 dark:border-dark-line"
            onClick={() => openExistingChild(child.id, child.name)}
          >
            <span className="font-bold">
              {child.name}
              {child.id === state.activeChildId ? (
                <span className="ml-2 text-xs font-semibold text-sage">
                  сейчас
                </span>
              ) : null}
            </span>
            <ChevronRight size={18} className="text-muted" />
          </button>
        ))}
        <button
          type="button"
          className="flex w-full items-center gap-2 px-4 py-3 font-bold text-sage"
          onClick={openNewChild}
        >
          <Plus size={18} />
          Добавить ребёнка
        </button>
      </div>

      <h2 className="mt-6 mb-2 text-sm font-bold text-muted">Категории</h2>
      <div className="overflow-hidden rounded-3xl bg-surface dark:bg-charcoal-2">
        {[...state.categories]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((category) => (
            <Link
              key={category.id}
              to={`/settings/category/${category.id}`}
              className="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0 dark:border-dark-line"
            >
              <span className="flex items-center gap-2 font-bold">
                <span>{category.icon}</span>
                {category.name}
              </span>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          ))}
        <Link
          to="/settings/category/new"
          className="flex items-center gap-2 px-4 py-3 font-bold text-sage"
        >
          <Plus size={18} />
          Новая категория
        </Link>
      </div>

      <h2 className="mt-6 mb-2 text-sm font-bold text-muted">Период</h2>
      <div className="space-y-2 rounded-3xl bg-surface p-4 dark:bg-charcoal-2">
        <p className="text-sm text-muted">
          Обнуляет количества товаров. Каталог и лимиты остаются.
        </p>
        <Button variant="secondary" block onClick={() => setPeriodScope('active')}>
          Новый период — {active?.name ?? 'текущий'}
        </Button>
        <Button variant="outline" block onClick={() => setPeriodScope('all')}>
          Новый период у всех детей
        </Button>
      </div>

      <h2 className="mt-6 mb-2 text-sm font-bold text-muted">Приложение</h2>
      <div className="rounded-3xl bg-surface p-4 dark:bg-charcoal-2">
        {installed ? (
          <p className="text-sm text-muted">Установлено на устройство</p>
        ) : installEvent ? (
          <Button variant="secondary" block onClick={() => void install()}>
            <Download size={18} />
            Установить на экран
          </Button>
        ) : (
          <p className="text-sm text-muted">
            В браузере: меню → «Установить приложение». На iPhone: «На экран
            Домой».
          </p>
        )}
      </div>

      {!user?.local ? (
        <>
          <h2 className="mt-6 mb-2 text-sm font-bold text-muted">Google Диск</h2>
          <div className="space-y-3 rounded-3xl bg-surface p-4 dark:bg-charcoal-2">
            <p className="text-sm text-muted">
              Удалит детей, категории, товары и остатки из скрытой папки
              приложения в вашем Google-аккаунте. На этом устройстве данные тоже
              сбросятся — иначе они снова улетят в облако.
            </p>
            <Button
              variant="outline"
              block
              className="text-danger"
              onClick={() => {
                setClearCloudError(null)
                setClearCloudOpen(true)
              }}
            >
              <Trash2 size={18} />
              Очистить данные в Google
            </Button>
          </div>
        </>
      ) : null}

      <div className="mt-6">
        <Button
          variant="ghost"
          block
          className="text-danger"
          onClick={() => {
            setLogoutError(null)
            setLogoutOpen(true)
          }}
        >
          <LogOut size={18} />
          Выйти из аккаунта
        </Button>
      </div>

      <p className="mt-4 flex items-center justify-center gap-1 text-xs text-muted">
        <Cloud size={12} />
        Файлы приложения скрыты в Google Drive appDataFolder
      </p>

      <Sheet
        open={Boolean(childSheet)}
        title={childSheet?.id ? 'Ребёнок' : 'Новый ребёнок'}
        onClose={() => setChildSheet(null)}
      >
        {childSheet ? (
          <form
            className="max-h-[70dvh] space-y-3 overflow-y-auto pb-4"
            onSubmit={(e) => {
              e.preventDefault()
              const name = childSheet.name.trim()
              if (!name) return
              if (childSheet.id) renameChild(childSheet.id, name)
              else addChild(name, childSheet.copyFromId)
              setChildSheet(null)
            }}
          >
            <Field
              label="Имя"
              value={childSheet.name}
              onChange={(e) =>
                setChildSheet({ ...childSheet, name: e.target.value })
              }
            />
            {state.children.filter((item) => item.id !== childSheet.id).length >
            0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted">
                  Категории и лимиты
                </p>
                <p className="text-xs text-muted">
                  {childSheet.id
                    ? 'Можно взять набор с другого профиля. Товары в наличии не изменятся.'
                    : 'Можно взять те же категории и нормы, что у уже добавленного ребёнка. Товары в наличии не копируются.'}
                </p>
                {!childSheet.id ? (
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold',
                      childSheet.copyFromId == null
                        ? 'bg-sage text-white'
                        : 'bg-cream-2 dark:bg-charcoal',
                    )}
                    onClick={() =>
                      setChildSheet({ ...childSheet, copyFromId: null })
                    }
                  >
                    Не копировать
                  </button>
                ) : null}
                {state.children
                  .filter((item) => item.id !== childSheet.id)
                  .map((child) => {
                    const selected = childSheet.copyFromId === child.id
                    return (
                      <button
                        key={child.id}
                        type="button"
                        className={cn(
                          'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left font-bold',
                          selected
                            ? 'bg-sage text-white'
                            : 'bg-cream-2 dark:bg-charcoal',
                        )}
                        onClick={() =>
                          setChildSheet({ ...childSheet, copyFromId: child.id })
                        }
                      >
                        <span>{child.name}</span>
                        <span
                          className={cn(
                            'text-xs font-semibold',
                            selected ? 'text-white/80' : 'text-muted',
                          )}
                        >
                          {categoriesLabel(limitsCount(child.id))}
                        </span>
                      </button>
                    )
                  })}
                {childSheet.id ? (
                  <Button
                    type="button"
                    variant="secondary"
                    block
                    disabled={!childSheet.copyFromId}
                    onClick={() => {
                      if (!childSheet.id || !childSheet.copyFromId) return
                      applyCopy(childSheet.copyFromId, childSheet.id)
                    }}
                  >
                    Скопировать категории и лимиты
                  </Button>
                ) : null}
              </div>
            ) : null}
            <Button type="submit" block disabled={!childSheet.name.trim()}>
              Сохранить
            </Button>
            {childSheet.id ? (
              <Button
                variant="danger"
                block
                onClick={() => {
                  setDeleteChildId(childSheet.id!)
                  setChildSheet(null)
                }}
              >
                Удалить профиль
              </Button>
            ) : null}
          </form>
        ) : null}
      </Sheet>

      <Dialog
        open={Boolean(copyPending)}
        title="Заменить лимиты?"
        description={
          copyPending
            ? `Категории и лимиты станут как у «${state.children.find((item) => item.id === copyPending.fromId)?.name ?? 'другого ребёнка'}». Текущие лимиты этого профиля пропадут. Товары в наличии останутся.`
            : undefined
        }
        confirmLabel="Скопировать"
        onClose={() => setCopyPending(null)}
        onConfirm={() => {
          if (copyPending) {
            copyLimitsFrom(copyPending.fromId, copyPending.toId)
          }
          setCopyPending(null)
        }}
      />

      <Dialog
        open={Boolean(deleteChildId)}
        title="Удалить профиль?"
        description="Лимиты и количества этого ребёнка пропадут. Категории и товары останутся."
        confirmLabel="Удалить"
        danger
        onClose={() => setDeleteChildId(null)}
        onConfirm={() => {
          if (deleteChildId) deleteChild(deleteChildId)
          setDeleteChildId(null)
        }}
      />

      <Dialog
        open={Boolean(periodScope)}
        title="Начать новый период?"
        description="Счётчики товаров станут нулевыми."
        confirmLabel="Обнулить"
        danger
        onClose={() => setPeriodScope(null)}
        onConfirm={() => {
          if (periodScope) resetPeriod(periodScope)
          setPeriodScope(null)
        }}
      />

      <Dialog
        open={clearCloudOpen}
        title="Удалить данные из Google?"
        description={
          clearCloudError ??
          'Все дети, категории, товары и остатки будут удалены из вашего Google-аккаунта и с этого устройства. Отменить нельзя.'
        }
        confirmLabel={clearCloudBusy ? 'Удаляем…' : 'Удалить всё'}
        danger
        busy={clearCloudBusy}
        onClose={() => {
          if (clearCloudBusy) return
          setClearCloudOpen(false)
          setClearCloudError(null)
        }}
        onConfirm={() => {
          if (clearCloudBusy) return
          setClearCloudBusy(true)
          setClearCloudError(null)
          void clearGoogleData().then((error) => {
            setClearCloudBusy(false)
            if (error) {
              setClearCloudError(error)
              return
            }
            setClearCloudOpen(false)
          })
        }}
      />

      <Dialog
        open={logoutOpen}
        title="Выйти?"
        description={
          logoutError ??
          (user?.local
            ? 'Данные на этом устройстве будут удалены.'
            : 'Сначала дождёмся записи на Диск, затем дети и остатки удалятся с этого устройства.')
        }
        confirmLabel={logoutBusy ? 'Сохраняем…' : 'Выйти'}
        danger
        busy={logoutBusy}
        onClose={() => {
          if (logoutBusy) return
          setLogoutOpen(false)
          setLogoutError(null)
        }}
        onConfirm={() => {
          if (logoutBusy) return
          setLogoutBusy(true)
          setLogoutError(null)
          void signOut().then((error) => {
            setLogoutBusy(false)
            if (error) {
              setLogoutError(error)
              return
            }
            setLogoutOpen(false)
            navigate('/login', { replace: true })
          })
        }}
      />
    </div>
  )
}
