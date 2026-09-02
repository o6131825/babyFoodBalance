import type { AppState, CategoryBalance, Unit } from '@/data/types'

export function categoryUsage(
  state: AppState,
  categoryId: string,
  childId: string,
): number {
  return state.products
    .filter((product) => product.categoryId === categoryId)
    .reduce((sum, product) => {
      const row = state.quantities.find(
        (item) => item.productId === product.id && item.childId === childId,
      )
      return sum + product.unitSize * (row?.qty ?? 0)
    }, 0)
}

export function categoryBalance(
  state: AppState,
  categoryId: string,
  childId: string,
): CategoryBalance | null {
  const limitRow = state.limits.find(
    (item) => item.categoryId === categoryId && item.childId === childId,
  )
  if (!limitRow) return null

  const used = categoryUsage(state, categoryId, childId)
  const remaining = limitRow.limit - used
  const ratio = limitRow.limit > 0 ? used / limitRow.limit : 0
  const overBy = remaining < 0 ? -remaining : 0
  const status =
    remaining < 0 ? 'over' : remaining / limitRow.limit <= 0.15 ? 'low' : 'ok'

  return {
    categoryId,
    childId,
    limit: limitRow.limit,
    used,
    remaining,
    ratio,
    status,
    overBy,
  }
}

/** Сколько целых единиц товара ещё влезает в остаток лимита. */
export function unitsCanFit(remaining: number, unitSize: number): number {
  if (unitSize <= 0 || remaining <= 0) return 0
  return Math.floor(remaining / unitSize)
}

export function formatAmount(value: number, unit: Unit): string {
  const rounded = Math.round(value)
  const suffix = unit === 'ml' ? 'мл' : 'г'
  return `${rounded.toLocaleString('ru-RU')} ${suffix}`
}

export function limitWarning(
  remaining: number,
  overBy: number,
  unit: Unit,
): string | null {
  if (remaining >= 0) return null
  return `Превышение лимита на ${formatAmount(overBy, unit)}!`
}

export function uid(): string {
  return crypto.randomUUID()
}
