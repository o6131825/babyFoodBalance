import { isBlankState, type AppState, type SyncStatus, type User } from '@/data/types'
import { dataBelongsTo } from '@/features/sync/db'
import {
  downloadAppState,
  readStoredFileId,
  resolveDriveFileId,
  uploadAppState,
} from '@/features/sync/drive'

type SyncApi = {
  state: AppState
  user: User | null
  dirty: boolean
  syncStatus: SyncStatus
  setSyncStatus: (status: SyncStatus, message?: string | null) => void
  applyRemote: (state: AppState) => Promise<void>
  markClean: () => void
  markCloudReady: () => void
  beginCloudRestore: () => void
}

let getApi: (() => SyncApi) | null = null
let timer: number | null = null
let fileId: string | null = readStoredFileId()
let pulling = false
let syncGeneration = 0

export function attachSyncStore(api: () => SyncApi) {
  getApi = api
}

export function resetDriveCache() {
  fileId = null
  pulling = false
  syncGeneration += 1
  if (timer) {
    window.clearTimeout(timer)
    timer = null
  }
}

function online(): boolean {
  return navigator.onLine
}

export function scheduleUpload() {
  const api = getApi?.()
  if (!api) return
  if (!api.user || api.user.local) {
    api.setSyncStatus(api.user?.local ? 'local' : 'idle')
    return
  }
  if (!dataBelongsTo(api.user.email)) {
    api.setSyncStatus('idle')
    return
  }
  if (!online()) {
    api.setSyncStatus('offline')
    return
  }
  api.setSyncStatus('syncing')
  if (timer) window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    void flushUpload()
  }, 1400)
}

export async function flushUpload() {
  const api = getApi?.()
  if (!api) return
  const generation = syncGeneration
  if (!api.user || api.user.local) {
    api.setSyncStatus(api.user?.local ? 'local' : 'idle')
    return
  }
  if (!dataBelongsTo(api.user.email)) {
    api.setSyncStatus('idle')
    return
  }
  if (!online()) {
    api.setSyncStatus('offline')
    return
  }
  if (isBlankState(api.state)) {
    api.markClean()
    api.setSyncStatus('synced')
    return
  }
  try {
    api.setSyncStatus('syncing')
    if (!fileId) fileId = await resolveDriveFileId()
    if (generation !== syncGeneration) return
    fileId = await uploadAppState(api.state, fileId)
    if (generation !== syncGeneration) return
    api.markClean()
    api.setSyncStatus('synced')
  } catch (error) {
    if (generation !== syncGeneration) return
    api.setSyncStatus(
      'error',
      error instanceof Error ? error.message : 'Ошибка синхронизации',
    )
  }
}

export async function pullFromDrive() {
  const api = getApi?.()
  if (!api || pulling) return
  if (!api.user || api.user.local) {
    api.markCloudReady()
    return
  }
  if (!online()) {
    api.setSyncStatus('offline')
    api.markCloudReady()
    return
  }
  const canUpload = dataBelongsTo(api.user.email)
  if (!canUpload && !isBlankState(api.state)) {
    api.setSyncStatus('idle')
    api.markCloudReady()
    return
  }

  const generation = syncGeneration
  pulling = true
  try {
    api.setSyncStatus('syncing')
    fileId = await resolveDriveFileId()
    if (generation !== syncGeneration) return
    if (!fileId) {
      if (!isBlankState(api.state) && canUpload) {
        fileId = await uploadAppState(api.state, null)
        if (generation !== syncGeneration) return
      }
      api.markClean()
      api.setSyncStatus('synced')
      return
    }

    const remote = await downloadAppState(fileId)
    if (generation !== syncGeneration) return
    if (!remote) {
      if (!isBlankState(api.state) && canUpload) {
        fileId = await uploadAppState(api.state, fileId)
        if (generation !== syncGeneration) return
      }
      api.markClean()
      api.setSyncStatus('synced')
      return
    }

    const localBlank = isBlankState(api.state)
    const remoteBlank = isBlankState(remote)
    const localTime = Date.parse(api.state.updatedAt) || 0
    const remoteTime = Date.parse(remote.updatedAt) || 0
    const localNewer = localTime >= remoteTime

    if (localBlank && !remoteBlank) {
      await api.applyRemote(remote)
      if (generation !== syncGeneration) return
      api.setSyncStatus('synced', 'Синхронизировано с другого устройства')
      return
    }

    if (!localBlank && remoteBlank) {
      if (canUpload) {
        fileId = await uploadAppState(api.state, fileId)
        if (generation !== syncGeneration) return
      }
      api.markClean()
      api.setSyncStatus('synced')
      return
    }

    if (api.dirty && localNewer && !localBlank && canUpload) {
      fileId = await uploadAppState(api.state, fileId)
      if (generation !== syncGeneration) return
      api.markClean()
      api.setSyncStatus('synced')
      return
    }

    if (!localNewer) {
      await api.applyRemote(remote)
      if (generation !== syncGeneration) return
      api.setSyncStatus('synced', 'Синхронизировано с другого устройства')
      return
    }

    if (api.dirty && !localBlank && canUpload) {
      fileId = await uploadAppState(api.state, fileId)
      if (generation !== syncGeneration) return
      api.markClean()
    }
    if (generation !== syncGeneration) return
    api.setSyncStatus('synced')
  } catch (error) {
    if (generation !== syncGeneration) return
    api.setSyncStatus(
      'error',
      error instanceof Error ? error.message : 'Ошибка синхронизации',
    )
  } finally {
    if (generation === syncGeneration) {
      pulling = false
      getApi?.()?.markCloudReady()
    }
  }
}

export function listenNetwork() {
  window.addEventListener('online', () => {
    const api = getApi?.()
    if (api && isBlankState(api.state)) api.beginCloudRestore()
    void pullFromDrive()
    scheduleUpload()
  })
  window.addEventListener('offline', () => {
    getApi?.()?.setSyncStatus('offline')
  })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return
    const api = getApi?.()
    if (api && isBlankState(api.state)) {
      if (api.syncStatus === 'synced') return
      if (api.syncStatus === 'error' || api.syncStatus === 'offline') {
        api.beginCloudRestore()
      }
    }
    void pullFromDrive()
  })
}
