import { create } from 'zustand'
import { createInitialState } from '@/data/seed'
import type {
  AppState,
  Category,
  SyncStatus,
  ThemeMode,
  Unit,
  User,
} from '@/data/types'
import {
  clearAccessToken,
  enableAuthSession,
  persistUser,
  readStoredUser,
} from '@/features/auth/google'
import { uid } from '@/features/calculator'
import {
  loadState,
  persistDataOwner,
  readDataOwner,
  saveState,
} from '@/features/sync/db'
import { deleteAllAppDataFiles, persistFileId } from '@/features/sync/drive'
import {
  attachSyncStore,
  flushBeforeLogout,
  listenNetwork,
  pullFromDrive,
  resetDriveCache,
  scheduleUpload,
  setSyncPaused,
  waitForSyncIdle,
} from '@/features/sync/engine'

const THEME_KEY = 'babyfood-balance-theme'
const ONBOARDING_KEY = 'babyfood-onboarding-seen'

function readOnboardingSeen() {
  return localStorage.getItem(ONBOARDING_KEY) === '1'
}

function persistOnboardingSeen(seen: boolean) {
  if (seen) localStorage.setItem(ONBOARDING_KEY, '1')
  else localStorage.removeItem(ONBOARDING_KEY)
}

type CategoryInput = {
  id?: string
  name: string
  icon: string
  image?: string
  unit: Unit
  limit: number
  childIds: string[]
}

type ProductInput = {
  id?: string
  categoryId: string
  name: string
  unitSize: number
  qty?: number
  image?: string
}

type AppStore = {
  hydrated: boolean
  cloudReady: boolean
  state: AppState
  theme: ThemeMode
  user: User | null
  syncStatus: SyncStatus
  syncMessage: string | null
  dirty: boolean
  onboardingSeen: boolean
  hydrate: () => Promise<void>
  setUser: (user: User | null) => void
  signOut: () => Promise<string | null>
  setTheme: (theme: ThemeMode) => void
  setSyncStatus: (status: SyncStatus, message?: string | null) => void
  applyRemote: (state: AppState) => Promise<void>
  markClean: () => void
  markCloudReady: () => void
  beginCloudRestore: () => void
  addChild: (name: string, copyFromChildId?: string | null) => string
  renameChild: (id: string, name: string) => void
  deleteChild: (id: string) => void
  copyLimitsFrom: (fromChildId: string, toChildId: string) => void
  setActiveChild: (id: string) => void
  saveCategory: (input: CategoryInput) => void
  deleteCategory: (id: string) => void
  saveProduct: (input: ProductInput) => void
  deleteProduct: (id: string) => void
  setQuantity: (productId: string, qty: number) => void
  resetPeriod: (scope: 'active' | 'all') => void
  skipOnboarding: () => void
  clearGoogleData: () => Promise<string | null>
}

function readTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

function applyTheme(theme: ThemeMode) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#1C1B19' : '#5B8F7A')
}

function stamp(state: AppState): AppState {
  return { ...state, updatedAt: new Date().toISOString() }
}

function emptyLocalState() {
  persistFileId(null)
  persistDataOwner(null)
  persistOnboardingSeen(false)
  resetDriveCache()
  const state = createInitialState()
  void saveState(state)
  return state
}

function copyChildLimits(
  limits: AppState['limits'],
  fromChildId: string,
  toChildId: string,
): AppState['limits'] {
  if (fromChildId === toChildId) return limits
  const source = limits.filter((item) => item.childId === fromChildId)
  return [
    ...limits.filter((item) => item.childId !== toChildId),
    ...source.map((item) => ({
      categoryId: item.categoryId,
      childId: toChildId,
      limit: item.limit,
    })),
  ]
}

export const useAppStore = create<AppStore>((set, get) => {
  const commit = (updater: (state: AppState) => AppState) => {
    const next = stamp(updater(get().state))
    set({ state: next, dirty: true })
    void saveState(next)
    scheduleUpload()
  }

  return {
    hydrated: false,
    cloudReady: false,
    state: createInitialState(),
    theme: 'system',
    user: null,
    syncStatus: 'idle',
    syncMessage: null,
    dirty: false,
    onboardingSeen: false,

    hydrate: async () => {
      let state = await loadState()
      const theme = readTheme()
      applyTheme(theme)
      const user = readStoredUser()
      const owner = readDataOwner()
      if (user && owner && user.email !== owner) {
        state = emptyLocalState()
        persistDataOwner(user.email)
      }
      const needsCloud = Boolean(user && !user.local && navigator.onLine)
      set({
        state,
        theme,
        user,
        hydrated: true,
        dirty: false,
        onboardingSeen: readOnboardingSeen(),
        cloudReady: !needsCloud,
        syncStatus: user?.local
          ? 'local'
          : navigator.onLine
            ? needsCloud
              ? 'syncing'
              : 'idle'
            : 'offline',
      })
      if (user && !user.local) {
        void pullFromDrive()
      }
    },

    setUser: (user) => {
      if (!user) {
        clearAccessToken()
        persistUser(null)
        set({
          user: null,
          state: emptyLocalState(),
          dirty: false,
          cloudReady: true,
          syncStatus: 'idle',
          syncMessage: null,
          onboardingSeen: false,
        })
        return
      }

      if (!user.local) enableAuthSession()
      persistUser(user)

      const owner = readDataOwner()
      const switched = Boolean(owner && owner !== user.email)
      const state = switched ? emptyLocalState() : get().state
      persistDataOwner(user.email)
      const needsCloud = !user.local
      set({
        user,
        state,
        dirty: switched ? false : get().dirty,
        onboardingSeen: switched ? false : get().onboardingSeen,
        cloudReady: !needsCloud,
        syncStatus: user.local ? 'local' : 'syncing',
        syncMessage: null,
      })
      if (!user.local) void pullFromDrive()
    },

    signOut: async () => {
      const user = get().user
      if (!user) return null
      if (!user.local) {
        const result = await flushBeforeLogout()
        if (!result.ok) return result.message
      }
      get().setUser(null)
      return null
    },

    clearGoogleData: async () => {
      const user = get().user
      if (!user || user.local) {
        return 'Нужен вход через Google'
      }
      if (!navigator.onLine) {
        return 'Нет сети. Подключитесь к интернету, чтобы удалить данные с Диска.'
      }

      setSyncPaused(true)
      set({
        syncStatus: 'syncing',
        syncMessage: 'Удаляем данные из Google…',
      })
      let failed = false
      try {
        await waitForSyncIdle()
        await deleteAllAppDataFiles()
        persistFileId(null)
        resetDriveCache()
        get().setUser(null)
        return null
      } catch (error) {
        failed = true
        const message =
          error instanceof Error ? error.message : 'Не удалось удалить данные'
        set({ syncStatus: 'error', syncMessage: message })
        return message
      } finally {
        setSyncPaused(false)
        if (failed) scheduleUpload()
      }
    },

    setTheme: (theme) => {
      localStorage.setItem(THEME_KEY, theme)
      applyTheme(theme)
      set({ theme })
    },

    setSyncStatus: (status, message = null) => {
      set({ syncStatus: status, syncMessage: message ?? null })
    },

    applyRemote: async (state) => {
      await saveState(state)
      set({ state, dirty: false })
    },

    markClean: () => set({ dirty: false }),

    markCloudReady: () => set({ cloudReady: true }),

    beginCloudRestore: () =>
      set({ cloudReady: false, syncStatus: 'syncing', syncMessage: null }),

    skipOnboarding: () => {
      persistOnboardingSeen(true)
      set({ onboardingSeen: true })
    },

    addChild: (name, copyFromChildId) => {
      const id = uid()
      persistOnboardingSeen(true)
      commit((state) => ({
        ...state,
        children: [...state.children, { id, name: name.trim() }],
        activeChildId: state.activeChildId ?? id,
        limits: copyFromChildId
          ? copyChildLimits(state.limits, copyFromChildId, id)
          : state.limits,
      }))
      set({ onboardingSeen: true })
      return id
    },

    renameChild: (id, name) => {
      commit((state) => ({
        ...state,
        children: state.children.map((child) =>
          child.id === id ? { ...child, name: name.trim() } : child,
        ),
      }))
    },

    deleteChild: (id) => {
      commit((state) => {
        const children = state.children.filter((child) => child.id !== id)
        const activeChildId =
          state.activeChildId === id ? (children[0]?.id ?? null) : state.activeChildId
        return {
          ...state,
          children,
          activeChildId,
          limits: state.limits.filter((item) => item.childId !== id),
          quantities: state.quantities.filter((item) => item.childId !== id),
        }
      })
    },

    setActiveChild: (id) => {
      commit((state) => ({ ...state, activeChildId: id }))
    },

    copyLimitsFrom: (fromChildId, toChildId) => {
      commit((state) => ({
        ...state,
        limits: copyChildLimits(state.limits, fromChildId, toChildId),
      }))
    },

    saveCategory: (input) => {
      commit((state) => {
        const id = input.id ?? uid()
        const existing = state.categories.find((item) => item.id === id)
        const category: Category = {
          id,
          name: input.name.trim(),
          icon: input.icon,
          image: input.image,
          unit: input.unit,
          sortOrder: existing?.sortOrder ?? state.categories.length,
        }
        const categories = existing
          ? state.categories.map((item) => (item.id === id ? category : item))
          : [...state.categories, category]
        const limits = [
          ...state.limits.filter((item) => item.categoryId !== id),
          ...input.childIds.map((childId) => ({
            categoryId: id,
            childId,
            limit: input.limit,
          })),
        ]
        return { ...state, categories, limits }
      })
    },

    deleteCategory: (id) => {
      commit((state) => {
        const productIds = new Set(
          state.products.filter((item) => item.categoryId === id).map((item) => item.id),
        )
        return {
          ...state,
          categories: state.categories.filter((item) => item.id !== id),
          products: state.products.filter((item) => item.categoryId !== id),
          limits: state.limits.filter((item) => item.categoryId !== id),
          quantities: state.quantities.filter((item) => !productIds.has(item.productId)),
        }
      })
    },

    saveProduct: (input) => {
      commit((state) => {
        const id = input.id ?? uid()
        const product = {
          id,
          categoryId: input.categoryId,
          name: input.name.trim(),
          unitSize: input.unitSize,
          image: input.image,
        }
        const existing = state.products.some((item) => item.id === id)
        const products = existing
          ? state.products.map((item) => (item.id === id ? product : item))
          : [...state.products, product]

        let quantities = state.quantities
        if (input.qty != null && state.activeChildId) {
          quantities = quantities.filter(
            (item) =>
              !(item.productId === id && item.childId === state.activeChildId),
          )
          if (input.qty > 0) {
            quantities = [
              ...quantities,
              {
                productId: id,
                childId: state.activeChildId,
                qty: input.qty,
              },
            ]
          }
        }
        return { ...state, products, quantities }
      })
    },

    setQuantity: (productId, qty) => {
      commit((state) => {
        const childId = state.activeChildId
        if (!childId) return state
        const safe = Math.max(0, Math.round(qty))
        const quantities = state.quantities.filter(
          (item) => !(item.productId === productId && item.childId === childId),
        )
        if (safe > 0) quantities.push({ productId, childId, qty: safe })
        return { ...state, quantities }
      })
    },

    deleteProduct: (id) => {
      commit((state) => ({
        ...state,
        products: state.products.filter((item) => item.id !== id),
        quantities: state.quantities.filter((item) => item.productId !== id),
      }))
    },

    resetPeriod: (scope) => {
      commit((state) => {
        if (scope === 'all') return { ...state, quantities: [] }
        const childId = state.activeChildId
        if (!childId) return state
        return {
          ...state,
          quantities: state.quantities.filter((item) => item.childId !== childId),
        }
      })
    },
  }
})

attachSyncStore(() => {
  const current = useAppStore.getState()
  return {
    state: current.state,
    user: current.user,
    dirty: current.dirty,
    syncStatus: current.syncStatus,
    syncMessage: current.syncMessage,
    setSyncStatus: current.setSyncStatus,
    applyRemote: current.applyRemote,
    markClean: current.markClean,
    markCloudReady: current.markCloudReady,
    beginCloudRestore: current.beginCloudRestore,
  }
})

listenNetwork()

window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => {
    const { theme } = useAppStore.getState()
    if (theme === 'system') applyTheme('system')
  })
