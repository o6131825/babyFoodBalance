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
const DATA_OWNER_KEY = 'babyfood-balance-data-owner'

export function readDataOwner() {
  return localStorage.getItem(DATA_OWNER_KEY)
}

export function persistDataOwner(email: string | null) {
  if (!email) localStorage.removeItem(DATA_OWNER_KEY)
  else localStorage.setItem(DATA_OWNER_KEY, email)
}

export function dataBelongsTo(email: string | null | undefined) {
  return Boolean(email && readDataOwner() === email)
}

let writeChain: Promise<void> = Promise.resolve()

export async function loadState(): Promise<AppState> {
  const row = await db.appState.get('main')
  if (row && isAppState(row.payload)) return row.payload
  return createInitialState()
}

export async function saveState(state: AppState): Promise<void> {
  const next = writeChain.then(() =>
    db.appState.put({ id: 'main', payload: state }).then(() => undefined),
  )
  writeChain = next.catch(() => undefined)
  return next
}

export async function replaceState(state: AppState): Promise<void> {
  await saveState(state)
}
