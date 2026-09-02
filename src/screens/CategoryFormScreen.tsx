import { ChevronLeft } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CATEGORY_ICONS } from '@/data/types'
import { useAppStore } from '@/features/store/appStore'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Field } from '@/shared/ui/Field'
import { ImagePicker } from '@/shared/ui/ImagePicker'

export function CategoryFormScreen() {
  const { id } = useParams()
  const isNew = id === 'new' || !id
  const navigate = useNavigate()
  const state = useAppStore((s) => s.state)
  const saveCategory = useAppStore((s) => s.saveCategory)
  const deleteCategory = useAppStore((s) => s.deleteCategory)

  const existing = isNew ? undefined : state.categories.find((item) => item.id === id)

  const initialChildIds = useMemo(() => {
    if (!existing) {
      return state.activeChildId ? [state.activeChildId] : []
    }
    return state.limits
      .filter((item) => item.categoryId === existing.id)
      .map((item) => item.childId)
  }, [existing, state.activeChildId, state.limits])

  const initialLimit = useMemo(() => {
    if (!existing) return ''
    const forActive = state.limits.find(
      (item) =>
        item.categoryId === existing.id && item.childId === state.activeChildId,
    )
    return String(forActive?.limit ?? state.limits.find((item) => item.categoryId === existing.id)?.limit ?? '')
  }, [existing, state.activeChildId, state.limits])

  const [name, setName] = useState(existing?.name ?? '')
  const [icon, setIcon] = useState(existing?.icon ?? '🍼')
  const [image, setImage] = useState(existing?.image)
  const [unit, setUnit] = useState(existing?.unit ?? 'g')
  const [limit, setLimit] = useState(initialLimit)
  const [childIds, setChildIds] = useState<string[]>(initialChildIds)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!isNew && !existing) {
    return (
      <div className="px-safe pt-safe">
        <p className="py-10 text-center text-muted">Категория не найдена</p>
        <Link to="/settings" className="block text-center font-bold text-sage">
          Назад
        </Link>
      </div>
    )
  }

  function toggleChild(childId: string) {
    setChildIds((prev) =>
      prev.includes(childId) ? prev.filter((item) => item !== childId) : [...prev, childId],
    )
  }

  function save() {
    const value = Number(limit)
    if (!name.trim()) {
      setError('Укажите название')
      return
    }
    if (childIds.length > 0 && (!Number.isFinite(value) || value <= 0)) {
      setError('Укажите лимит для отмеченных детей')
      return
    }
    saveCategory({
      id: existing?.id,
      name,
      icon,
      image,
      unit,
      limit: Number.isFinite(value) ? value : 0,
      childIds,
    })
    navigate(-1)
  }

  return (
    <div className="px-safe pt-safe pb-8">
      <header className="flex items-center gap-2 py-3">
        <Link
          to="/settings"
          aria-label="Назад"
          className="flex size-11 items-center justify-center rounded-full bg-surface dark:bg-charcoal-2"
        >
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-lg font-extrabold">
          {isNew ? 'Новая категория' : 'Категория'}
        </h1>
      </header>

      <div className="space-y-4">
        <Field
          label="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div>
          <p className="mb-2 text-sm font-semibold text-muted">Иконка</p>
          <div className="grid grid-cols-8 gap-2">
            {CATEGORY_ICONS.map((item) => (
              <button
                key={item}
                type="button"
                className={cn(
                  'flex size-10 items-center justify-center rounded-xl text-lg',
                  icon === item
                    ? 'bg-sage-soft ring-2 ring-sage dark:bg-sage/30'
                    : 'bg-surface dark:bg-charcoal-2',
                )}
                onClick={() => setIcon(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <ImagePicker value={image} onChange={setImage} />

        <div>
          <p className="mb-2 text-sm font-semibold text-muted">Единица</p>
          <div className="grid grid-cols-2 gap-2">
            {(['g', 'ml'] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={cn(
                  'h-11 rounded-2xl font-bold',
                  unit === item
                    ? 'bg-sage text-white'
                    : 'bg-surface dark:bg-charcoal-2',
                )}
                onClick={() => setUnit(item)}
              >
                {item === 'g' ? 'Граммы' : 'Миллилитры'}
              </button>
            ))}
          </div>
        </div>

        <Field
          label="Лимит на период"
          inputMode="numeric"
          placeholder="1600"
          suffix={unit === 'ml' ? 'мл' : 'г'}
          value={limit}
          hint="Это значение запишется всем отмеченным детям."
          onChange={(e) => setLimit(e.target.value.replace(/\D/g, ''))}
        />

        <div>
          <p className="mb-2 text-sm font-semibold text-muted">
            Для кого действует лимит
          </p>
          <div className="space-y-2">
            {state.children.map((child) => {
              const current = state.limits.find(
                (item) =>
                  item.categoryId === existing?.id && item.childId === child.id,
              )
              const checked = childIds.includes(child.id)
              return (
                <label
                  key={child.id}
                  className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 dark:bg-charcoal-2"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleChild(child.id)}
                    className="size-5 accent-sage"
                  />
                  <span className="flex-1 font-bold">{child.name}</span>
                  <span className="text-xs text-muted">
                    {current
                      ? `сейчас ${current.limit} ${unit === 'ml' ? 'мл' : 'г'}`
                      : 'нет лимита'}
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <Button block onClick={save}>
          Сохранить
        </Button>
        {!isNew ? (
          <Button variant="danger" block onClick={() => setConfirmDelete(true)}>
            Удалить категорию
          </Button>
        ) : null}
      </div>

      <Dialog
        open={confirmDelete}
        title="Удалить категорию?"
        description="Товары внутри тоже удалятся у всех детей."
        confirmLabel="Удалить"
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (existing) deleteCategory(existing.id)
          navigate('/settings')
        }}
      />
    </div>
  )
}
