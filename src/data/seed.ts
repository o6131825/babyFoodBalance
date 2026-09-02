import type { AppState, Category } from '@/data/types'

export function seedCategories(): Category[] {
  const presets: Pick<Category, 'name' | 'icon' | 'unit'>[] = [
    { name: 'Детские смеси', icon: '🍼', unit: 'g' },
    { name: 'Каши', icon: '🥣', unit: 'g' },
    { name: 'Соки', icon: '🧃', unit: 'ml' },
    { name: 'Пюре фруктовое', icon: '🍎', unit: 'g' },
    { name: 'Пюре овощное', icon: '🥕', unit: 'g' },
    { name: 'Консервы', icon: '🥫', unit: 'g' },
  ]

  return presets.map((item, index) => ({
    id: `seed-${index + 1}`,
    name: item.name,
    icon: item.icon,
    unit: item.unit,
    sortOrder: index,
  }))
}

export function createInitialState(): AppState {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    children: [],
    activeChildId: null,
    categories: seedCategories(),
    products: [],
    limits: [],
    quantities: [],
  }
}
