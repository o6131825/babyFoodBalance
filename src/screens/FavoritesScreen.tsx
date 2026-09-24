import { Heart, Package } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { categoryBalance, formatAmount, unitsCanFit } from '@/features/calculator'
import { useAppStore } from '@/features/store/appStore'
import { Button } from '@/shared/ui/Button'
import { NumberStepper } from '@/shared/ui/NumberStepper'
import { cn } from '@/shared/lib/cn'

export function FavoritesScreen() {
  const state = useAppStore((s) => s.state)
  const setQuantity = useAppStore((s) => s.setQuantity)
  const childId = state.activeChildId

  const groups = useMemo(() => {
    if (!childId) return []
    const byCategory = new Map<string, typeof state.products>()
    for (const product of state.products) {
      if (!product.favorite) continue
      const list = byCategory.get(product.categoryId) ?? []
      list.push(product)
      byCategory.set(product.categoryId, list)
    }
    return state.categories
      .filter((category) => byCategory.has(category.id))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((category) => ({
        category,
        balance: categoryBalance(state, category.id, childId),
        products: [...(byCategory.get(category.id) ?? [])].sort((a, b) => {
          const byTime = (b.favoritedAt ?? '').localeCompare(a.favoritedAt ?? '')
          if (byTime !== 0) return byTime
          return a.name.localeCompare(b.name, 'ru')
        }),
      }))
  }, [state, childId])

  const total = groups.reduce((sum, group) => sum + group.products.length, 0)

  function qtyOf(productId: string) {
    return (
      state.quantities.find(
        (item) => item.productId === productId && item.childId === childId,
      )?.qty ?? 0
    )
  }

  return (
    <div className="px-safe pt-safe">
      <header className="py-4">
        <h1 className="text-2xl font-extrabold">Любимые</h1>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          {total > 0
            ? `${total} ${productWord(total)}. Количество сразу меняет остаток категории.`
            : 'Отмеченные сердцем товары из всех категорий.'}
        </p>
      </header>

      {state.children.length === 0 ? (
        <div className="rounded-3xl bg-surface p-5 text-center dark:bg-charcoal-2">
          <p className="font-bold">Пока нет профиля ребёнка</p>
          <p className="mt-1 text-sm text-muted">
            Добавьте ребёнка в настройках — любимые считаются по каждому профилю.
          </p>
          <Link to="/settings">
            <Button className="mt-4" block>
              Добавить ребёнка
            </Button>
          </Link>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-3xl bg-surface p-5 text-center dark:bg-charcoal-2">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
            <Heart size={22} />
          </span>
          <p className="mt-3 font-bold">Пока нет любимых</p>
          <p className="mt-1 text-sm text-muted">
            Откройте товар в категории и нажмите «В любимые» — он появится здесь.
          </p>
          <Link to="/">
            <Button className="mt-4" block>
              К категориям
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-5 pb-2">
          {groups.map(({ category, balance, products }) => {
            const over = balance?.status === 'over'
            return (
              <section key={category.id}>
                <div className="mb-2 flex items-center justify-between gap-3 px-1">
                  <Link
                    to={`/category/${category.id}`}
                    className="min-w-0 truncate font-extrabold"
                  >
                    <span className="mr-1.5">{category.icon}</span>
                    {category.name}
                  </Link>
                  {balance ? (
                    <p
                      className={cn(
                        'shrink-0 text-sm font-extrabold',
                        over && 'text-danger',
                        balance.status === 'low' && 'text-warning',
                        balance.status === 'ok' && 'text-sage',
                      )}
                    >
                      {over
                        ? `−${formatAmount(balance.overBy, category.unit)}`
                        : formatAmount(balance.remaining, category.unit)}
                    </p>
                  ) : (
                    <p className="shrink-0 text-xs font-semibold text-muted">нет лимита</p>
                  )}
                </div>
                <div className="space-y-2">
                  {products.map((product) => {
                    const canTake = balance
                      ? unitsCanFit(balance.remaining, product.unitSize)
                      : 0
                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-3 ring-2 ring-danger/40 dark:bg-charcoal-2"
                      >
                        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-cream-2 text-muted dark:bg-charcoal">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            <Package size={20} />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-extrabold">{product.name}</p>
                          <p className="text-xs text-muted">
                            {formatAmount(product.unitSize, category.unit)} × {qtyOf(product.id)} ={' '}
                            {formatAmount(product.unitSize * qtyOf(product.id), category.unit)}
                          </p>
                          {balance ? (
                            <p
                              className={cn(
                                'mt-0.5 text-xs font-bold',
                                canTake > 0 ? 'text-sage' : 'text-muted',
                              )}
                            >
                              {canTake > 0 ? `можно ещё ${canTake} шт` : 'больше не влезет'}
                            </p>
                          ) : null}
                        </div>
                        <NumberStepper
                          value={qtyOf(product.id)}
                          onChange={(value) => setQuantity(product.id, value)}
                        />
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function productWord(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'товар'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'товара'
  return 'товаров'
}
