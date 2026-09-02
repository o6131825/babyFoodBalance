import { isAppState, type AppState } from '@/data/types'
import { authorizedFetch } from '@/features/auth/google'

const FILE_NAME = 'babyfood-balance.json'
const FILE_ID_KEY = 'babyfood-balance-file-id'

export function readStoredFileId(): string | null {
  return localStorage.getItem(FILE_ID_KEY)
}

export function persistFileId(id: string | null) {
  if (!id) localStorage.removeItem(FILE_ID_KEY)
  else localStorage.setItem(FILE_ID_KEY, id)
}

async function findFileId(): Promise<string | null> {
  const query = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`)
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name)`
  const response = await authorizedFetch(url)
  if (!response.ok) throw new Error('Не удалось найти файл на Диске')
  const body = (await response.json()) as { files?: { id: string }[] }
  return body.files?.[0]?.id ?? null
}

export async function downloadAppState(
  fileId: string,
): Promise<AppState | null> {
  const response = await authorizedFetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
  )
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Не удалось скачать данные с Диска')
  const json: unknown = await response.json()
  return isAppState(json) ? json : null
}

export async function uploadAppState(
  state: AppState,
  fileId: string | null,
): Promise<string> {
  const payload = JSON.stringify(state)

  if (fileId) {
    const response = await authorizedFetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      },
    )
    if (!response.ok) throw new Error('Не удалось сохранить файл на Диске')
    return fileId
  }

  const metadata = {
    name: FILE_NAME,
    mimeType: 'application/json',
    parents: ['appDataFolder'],
  }
  const form = new FormData()
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
  )
  form.append('file', new Blob([payload], { type: 'application/json' }))

  const response = await authorizedFetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    { method: 'POST', body: form },
  )
  if (!response.ok) throw new Error('Не удалось создать файл на Диске')
  const created = (await response.json()) as { id: string }
  persistFileId(created.id)
  return created.id
}

export async function resolveDriveFileId(): Promise<string | null> {
  const stored = readStoredFileId()
  if (stored) return stored
  const found = await findFileId()
  persistFileId(found)
  return found
}
