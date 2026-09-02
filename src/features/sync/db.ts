import Dexie, { type Table } from 'dexie'
import { createInitialState } from '@/data/seed'
import { isAppState, type AppState } from '@/data/types'

type StateRow = {
  id: 'main'
  payload: AppState
}

class BabyFoodBalanceDB extends Dexie {
  appState!: Table<StateRow, string>

  constructor() {
    super('babyfood-balance')
    this.version(1).stores({
      appState: 'id',
    })
  }
}

const db = new BabyFoodBalanceDB()

export async function loadState(): Promise<AppState> {
  const row = await db.appState.get('main')
  if (row && isAppState(row.payload)) return row.payload
  const initial = createInitialState()
  await saveState(initial)
  return initial
}

export async function saveState(state: AppState): Promise<void> {
  await db.appState.put({ id: 'main', payload: state })
}

export async function replaceState(state: AppState): Promise<void> {
  await saveState(state)
}
