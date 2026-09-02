import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/features/store/appStore'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'

export function OnboardingScreen() {
  const navigate = useNavigate()
  const categories = useAppStore((s) => s.state.categories)
  const addChild = useAppStore((s) => s.addChild)
  const saveCategory = useAppStore((s) => s.saveCategory)
  const skipOnboarding = useAppStore((s) => s.skipOnboarding)
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [limits, setLimits] = useState<Record<string, string>>({})

  const ordered = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  )

  function next() {
    if (!name.trim()) return
    setStep(2)
  }

  function complete(applyLimits: boolean) {
    const id = addChild(name.trim())
    if (applyLimits) {
      for (const category of ordered) {
        const value = Number(limits[category.id])
        if (Number.isFinite(value) && value > 0) {
          saveCategory({
            id: category.id,
            name: category.name,
            icon: category.icon,
            image: category.image,
            unit: category.unit,
            limit: value,
            childIds: [id],
          })
        }
      }
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream px-safe pt-safe dark:bg-charcoal">
      <p className="pt-6 text-sm font-semibold text-sage">Шаг {step} из 2</p>
      {step === 1 ? (
        <>
          <h1 className="mt-2 text-3xl font-extrabold text-ink dark:text-dark-text">
            Как зовут малыша?
          </h1>
          <p className="mt-2 text-muted dark:text-dark-muted">
            Можно добавить ещё детей позже в настройках.
          </p>
          <div className="mt-8">
            <Field
              label="Имя"
              placeholder="Маша"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="mt-auto space-y-2 pb-safe pt-8">
            <Button block disabled={!name.trim()} onClick={next}>
              Дальше
            </Button>
            <Button
              block
              variant="ghost"
              onClick={() => {
                skipOnboarding()
                navigate('/', { replace: true })
              }}
            >
              Пропустить
            </Button>
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-2 text-3xl font-extrabold text-ink dark:text-dark-text">
            Лимиты на период
          </h1>
          <p className="mt-2 text-muted dark:text-dark-muted">
            Заполните нужные категории. Пустые можно настроить потом.
          </p>
          <div className="mt-6 space-y-3">
            {ordered.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2 dark:bg-charcoal-2"
              >
                <span className="text-2xl">{category.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{category.name}</p>
                  <p className="text-xs text-muted">
                    {category.unit === 'ml' ? 'миллилитры' : 'граммы'}
                  </p>
                </div>
                <input
                  inputMode="numeric"
                  placeholder="0"
                  className="h-11 w-24 rounded-xl border border-line bg-cream text-center font-bold outline-none focus:border-sage dark:border-dark-line dark:bg-charcoal"
                  value={limits[category.id] ?? ''}
                  onChange={(e) =>
                    setLimits((prev) => ({
                      ...prev,
                      [category.id]: e.target.value.replace(/\D/g, ''),
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="mt-auto space-y-2 pb-safe pt-8">
            <Button block onClick={() => complete(true)}>
              Начать
            </Button>
            <Button block variant="ghost" onClick={() => complete(false)}>
              Пропустить
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
