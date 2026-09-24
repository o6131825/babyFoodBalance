import { ArrowUpDown, ChevronLeft, Heart, MoreVertical, Package, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  categoryBalance,
  formatAmount,
  limitWarning,
  unitsCanFit,
} from '@/features/calculator'
import { useAppStore } from '@/features/store/appStore'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Field } from '@/shared/ui/Field'
import { ImagePicker } from '@/shared/ui/ImagePicker'
import { NumberStepper } from '@/shared/ui/NumberStepper'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { Sheet } from '@/shared/ui/Sheet'
import { cn } from '@/shared/lib/cn'

type ProductDraft = {
  id?: string
  name: string
  unitSize: string
  qty: string
  image?: string
  favorite?: boolean
}

const emptyDraft: ProductDraft = { name: '', unitSize: '', qty: '' }

export function CategoryScreen() {
  const { id } = useParams()
  const state = useAppStore((s) => s.state)
  const setQuantity = useAppStore((s) => s.setQuantity)
  const saveProduct = useAppStore((s) => s.saveProduct)
  const deleteProduct = useAppStore((s) => s.deleteProduct)

  const category = state.categories.find((item) => item.id === id)
  const childId = state.activeChildId
  const balance =
    category && childId ? categoryBalance(state, category.id, childId) : null
  const rankedIds = useMemo(() => {
    const qtyOf = (productId: string) =>
      state.quantities.find(
        (item) => item.productId === productId && item.childId === childId,
      )?.qty ?? 0
    return state.products
      .filter((item) => item.categoryId === id)
      .sort((a, b) => {
        const favoriteOrder = Number(Boolean(b.favorite)) - Number(Boolean(a.favorite))
        if (favoriteOrder !== 0) return favoriteOrder
        const byQty = qtyOf(b.id) - qtyOf(a.id)
        if (byQty !== 0) return byQty
        return a.name.localeCompare(b.name, 'ru')
      })
      .map((item) => item.id)
  }, [state.products, state.quantities, id, childId])

  const orderKey = `${id ?? ''}:${childId ?? ''}`
  const [orderSnapshot, setOrderSnapshot] = useState<{
    key: string
    ids: string[]
  } | null>(null)
  if (!orderSnapshot || orderSnapshot.key !== orderKey) {
    setOrderSnapshot({ key: orderKey, ids: rankedIds })
  }
  const frozenIds = orderSnapshot?.key === orderKey ? orderSnapshot.ids : rankedIds

  const products = useMemo(() => {
    const inCategory = state.products.filter((item) => item.categoryId === id)
    const byId = new Map(inCategory.map((item) => [item.id, item]))
    const ordered: typeof inCategory = []
    const seen = new Set<string>()
    for (const productId of frozenIds) {
      const product = byId.get(productId)
      if (!product) continue
      ordered.push(product)
      seen.add(productId)
    }
    for (const product of inCategory) {
      if (!seen.has(product.id)) ordered.push(product)
    }
    return ordered
  }, [state.products, id, frozenIds])

  const orderIsStale =
    products.length !== rankedIds.length ||
    products.some((item, index) => item.id !== rankedIds[index])

  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [queryCategoryId, setQueryCategoryId] = useState(id)
  const searchInputRef = useRef<HTMLInputElement>(null)
  if (queryCategoryId !== id) {
    setQueryCategoryId(id)
    setQuery('')
    setSearchOpen(false)
  }
  const searchQuery = queryCategoryId === id ? query : ''

  const visibleProducts = useMemo(() => {
    const needle = searchQuery.trim().toLocaleLowerCase('ru')
    if (!needle) return products
    return products.filter((item) =>
      item.name.toLocaleLowerCase('ru').includes(needle),
    )
  }, [products, searchQuery])

  const [draft, setDraft] = useState<ProductDraft | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (!searchOpen) return
    searchInputRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || draft || menuId || deleteId) return
      setSearchOpen(false)
      setQuery('')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [searchOpen, draft, menuId, deleteId])

  if (!category || !childId || !balance) {
    return <Navigate to="/" replace />
  }

  const warning = limitWarning(balance.remaining, balance.overBy, category.unit)
  const unitLabel = category.unit === 'ml' ? 'мл' : 'г'

  function qtyOf(productId: string) {
    return (
      state.quantities.find(
        (item) => item.productId === productId && item.childId === childId,
      )?.qty ?? 0
    )
  }

  function submitProduct() {
    if (!draft || !id) return
    const unitSize = Number(draft.unitSize)
    const qty = draft.qty === '' ? undefined : Number(draft.qty)
    if (!draft.name.trim() || !Number.isFinite(unitSize) || unitSize <= 0) return
    saveProduct({
      id: draft.id,
      categoryId: id,
      name: draft.name,
      unitSize,
      qty: qty != null && Number.isFinite(qty) ? qty : undefined,
      image: draft.image,
      favorite: draft.favorite,
    })
    setDraft(null)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream dark:bg-charcoal">
      <header
        inert={searchOpen}
        className="sticky top-0 z-20 border-b border-line/70 bg-cream/95 px-safe pt-safe backdrop-blur dark:border-dark-line dark:bg-charcoal/95"
      >
        <div className="flex items-center gap-2 py-3">
          <Link
            to="/"
            aria-label="Назад"
            className="flex size-11 items-center justify-center rounded-full bg-surface dark:bg-charcoal-2"
          >
            <ChevronLeft size={22} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold">{category.name}</h1>
            <p className="text-xs text-muted">
              {formatAmount(balance.used, category.unit)} занято из{' '}
              {formatAmount(balance.limit, category.unit)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Поиск"
            aria-expanded={searchOpen}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface dark:bg-charcoal-2"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={20} />
          </button>
        </div>
        <div
          className={cn(
            'mb-3 rounded-2xl p-3',
            warning ? 'bg-terracotta-soft dark:bg-danger/15' : 'bg-surface dark:bg-charcoal-2',
          )}
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-muted">Остаток</p>
              <p
                className={cn(
                  'text-3xl font-extrabold',
                  warning ? 'text-danger' : 'text-sage',
                )}
              >
                {warning
                  ? `−${formatAmount(balance.overBy, category.unit)}`
                  : formatAmount(balance.remaining, category.unit)}
              </p>
            </div>
            {warning ? (
              <p className="max-w-[50%] text-right text-sm font-bold text-danger">
                {warning}
              </p>
            ) : null}
          </div>
          <div className="mt-3">
            <ProgressBar ratio={balance.ratio} status={balance.status} />
          </div>
        </div>
      </header>

      <div inert={searchOpen} className="flex-1 space-y-2 px-safe py-4">
        {products.length === 0 ? (
          <p className="rounded-2xl bg-surface px-4 py-8 text-center text-muted dark:bg-charcoal-2">
            Добавьте первый товар в эту категорию
          </p>
        ) : (
          products.map((product) => {
            const canTake = unitsCanFit(balance.remaining, product.unitSize)
            return (
              <div
                key={product.id}
                className={cn(
                  'rounded-2xl bg-surface px-3 py-3 dark:bg-charcoal-2',
                  product.favorite && 'ring-2 ring-danger/40',
                )}
              >
                <div className="mb-2 flex items-start gap-1.5">
                  <p className="min-w-0 flex-1 break-words font-extrabold leading-snug">
                    {product.name}
                  </p>
                  {product.favorite ? (
                    <Heart
                      size={16}
                      className="mt-0.5 shrink-0 text-danger"
                      fill="currentColor"
                      aria-label="В любимых"
                    />
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
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
                    <p className="text-xs text-muted">
                      {formatAmount(product.unitSize, category.unit)} × {qtyOf(product.id)} ={' '}
                      {formatAmount(product.unitSize * qtyOf(product.id), category.unit)}
                    </p>
                    <p
                      className={cn(
                        'mt-0.5 text-xs font-bold',
                        canTake > 0 ? 'text-sage' : 'text-muted',
                      )}
                    >
                      {canTake > 0
                        ? `можно ещё ${canTake} шт`
                        : 'больше не влезет'}
                    </p>
                  </div>
                  <NumberStepper
                    value={qtyOf(product.id)}
                    onChange={(value) => setQuantity(product.id, value)}
                  />
                  <button
                    type="button"
                    aria-label="Ещё"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted"
                    onClick={() => setMenuId(product.id)}
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div inert={searchOpen} className="px-safe pb-safe">
        {orderIsStale ? (
          <Button
            variant="secondary"
            block
            className="mb-2"
            onClick={() => setOrderSnapshot({ key: orderKey, ids: rankedIds })}
          >
            <ArrowUpDown size={18} />
            Упорядочить
          </Button>
        ) : null}
        <Button
          block
          className="mb-3"
          onClick={() => setDraft({ ...emptyDraft })}
        >
          <Plus size={18} />
          Добавить товар
        </Button>
      </div>

      {searchOpen ? (
        <div className="fixed inset-0 z-40 flex flex-col bg-cream dark:bg-charcoal">
          <div className="flex items-center gap-2 px-safe pt-safe pb-3">
            <button
              type="button"
              aria-label="Закрыть поиск"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface dark:bg-charcoal-2"
              onClick={() => {
                setSearchOpen(false)
                setQuery('')
              }}
            >
              <X size={20} />
            </button>
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Найти товар"
                aria-label="Поиск по товарам"
                className="h-12 w-full rounded-2xl border border-line bg-surface pl-11 pr-11 text-ink outline-none transition placeholder:text-muted/70 focus:border-sage dark:border-dark-line dark:bg-charcoal-2 dark:text-dark-text [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
              />
              {searchQuery ? (
                <button
                  type="button"
                  aria-label="Очистить поиск"
                  className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted"
                  onClick={() => {
                    setQuery('')
                    searchInputRef.current?.focus()
                  }}
                >
                  <X size={18} />
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-safe pb-safe">
            {searchQuery.trim() && visibleProducts.length === 0 ? (
              <p className="rounded-2xl bg-surface px-4 py-8 text-center text-muted dark:bg-charcoal-2">
                Ничего не нашлось по запросу «{searchQuery.trim()}»
              </p>
            ) : (
              visibleProducts.map((product) => {
                const canTake = unitsCanFit(balance.remaining, product.unitSize)
                return (
                  <div
                    key={product.id}
                    className={cn(
                      'rounded-2xl bg-surface px-3 py-3 dark:bg-charcoal-2',
                      product.favorite && 'ring-2 ring-danger/40',
                    )}
                  >
                    <div className="mb-2 flex items-start gap-1.5">
                      <p className="min-w-0 flex-1 break-words font-extrabold leading-snug">
                        {product.name}
                      </p>
                      {product.favorite ? (
                        <Heart
                          size={16}
                          className="mt-0.5 shrink-0 text-danger"
                          fill="currentColor"
                          aria-label="В любимых"
                        />
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-cream-2 text-muted dark:bg-charcoal">
                        {product.image ? (
                          <img src={product.image} alt="" className="size-full object-cover" />
                        ) : (
                          <Package size={20} />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted">
                          {formatAmount(product.unitSize, category.unit)} × {qtyOf(product.id)} ={' '}
                          {formatAmount(product.unitSize * qtyOf(product.id), category.unit)}
                        </p>
                        <p
                          className={cn(
                            'mt-0.5 text-xs font-bold',
                            canTake > 0 ? 'text-sage' : 'text-muted',
                          )}
                        >
                          {canTake > 0 ? `можно ещё ${canTake} шт` : 'больше не влезет'}
                        </p>
                      </div>
                      <NumberStepper
                        value={qtyOf(product.id)}
                        onChange={(value) => setQuantity(product.id, value)}
                      />
                      <button
                        type="button"
                        aria-label="Ещё"
                        className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted"
                        onClick={() => setMenuId(product.id)}
                      >
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : null}

      <Sheet
        open={Boolean(draft)}
        title={draft?.id ? 'Товар' : 'Новый товар'}
        onClose={() => setDraft(null)}
      >
        {draft ? (
          <form
            className="space-y-3 pb-4"
            onSubmit={(e) => {
              e.preventDefault()
              submitProduct()
            }}
          >
            <ImagePicker
              value={draft.image}
              onChange={(image) => setDraft({ ...draft, image })}
            />
            <Field
              label="Название"
              placeholder="PREMIUM"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <Field
              label="Объём одной единицы"
              inputMode="numeric"
              placeholder="400"
              suffix={unitLabel}
              value={draft.unitSize}
              onChange={(e) =>
                setDraft({ ...draft, unitSize: e.target.value.replace(/\D/g, '') })
              }
            />
            <Field
              label="Количество (необязательно)"
              inputMode="numeric"
              placeholder="0"
              value={draft.qty}
              onChange={(e) =>
                setDraft({ ...draft, qty: e.target.value.replace(/\D/g, '') })
              }
            />
            <button
              type="button"
              aria-pressed={Boolean(draft.favorite)}
              className={cn(
                'flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-semibold',
                draft.favorite
                  ? 'bg-danger/10 text-danger'
                  : 'border border-line bg-surface text-muted dark:border-dark-line dark:bg-charcoal-2',
              )}
              onClick={() => setDraft({ ...draft, favorite: !draft.favorite })}
            >
              <Heart size={18} fill={draft.favorite ? 'currentColor' : 'none'} />
              {draft.favorite ? 'В любимых' : 'В любимые'}
            </button>
            <Button type="submit" block disabled={!draft.name.trim() || !draft.unitSize}>
              Сохранить
            </Button>
          </form>
        ) : null}
      </Sheet>

      <Sheet open={Boolean(menuId)} title="Товар" onClose={() => setMenuId(null)}>
        <div className="space-y-2 pb-4">
          <Button
            variant="secondary"
            block
            onClick={() => {
              const product = products.find((item) => item.id === menuId)
              if (!product) return
              setDraft({
                id: product.id,
                name: product.name,
                unitSize: String(product.unitSize),
                qty: String(qtyOf(product.id)),
                image: product.image,
                favorite: product.favorite,
              })
              setMenuId(null)
            }}
          >
            Изменить
          </Button>
          <Button
            variant="danger"
            block
            onClick={() => {
              setDeleteId(menuId)
              setMenuId(null)
            }}
          >
            Удалить
          </Button>
        </div>
      </Sheet>

      <Dialog
        open={Boolean(deleteId)}
        title="Удалить товар?"
        description="Он исчезнет у всех детей. Количества по нему тоже."
        confirmLabel="Удалить"
        danger
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteProduct(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
