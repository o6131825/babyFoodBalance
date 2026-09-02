export type Unit = 'g' | 'ml'

export type Child = {
  id: string
  name: string
}

export type Category = {
  id: string
  name: string
  image?: string
  icon: string
  unit: Unit
  sortOrder: number
}

export type Product = {
  id: string
  categoryId: string
  name: string
  unitSize: number
  image?: string
}

export type CategoryLimit = {
  categoryId: string
  childId: string
  limit: number
}

export type ProductQuantity = {
  productId: string
  childId: string
  qty: number
}

export type AppState = {
  version: 1
  updatedAt: string
  children: Child[]
  activeChildId: string | null
  categories: Category[]
  products: Product[]
  limits: CategoryLimit[]
  quantities: ProductQuantity[]
}

export type BalanceStatus = 'ok' | 'low' | 'over'

export type CategoryBalance = {
  categoryId: string
  childId: string
  limit: number
  used: number
  remaining: number
  ratio: number
  status: BalanceStatus
  overBy: number
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'local'

export type ThemeMode = 'light' | 'dark' | 'system'

export type User = {
  name: string
  email: string
  picture?: string
  local: boolean
}

export function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return (
    data.version === 1 &&
    typeof data.updatedAt === 'string' &&
    Array.isArray(data.children) &&
    Array.isArray(data.categories) &&
    Array.isArray(data.products) &&
    Array.isArray(data.limits) &&
    Array.isArray(data.quantities)
  )
}

export const CATEGORY_ICONS = [
  '🍼',
  '🥣',
  '🧃',
  '🍎',
  '🥕',
  '🥫',
  '🍌',
  '🥦',
  '🥛',
  '🍪',
  '🍞',
  '🫐',
  '🍊',
  '🍐',
  '🌽',
  '🧀',
] as const
