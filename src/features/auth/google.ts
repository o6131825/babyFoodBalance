const SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata',
  'email',
  'profile',
].join(' ')

const USER_KEY = 'babyfood-balance-user'

let tokenClient: GoogleTokenClient | null = null
let accessToken: string | null = null
let pendingToken:
  | { resolve: (token: string) => void; reject: (error: Error) => void }
  | null = null

export function getGoogleClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''
}

export function googleConfigured(): boolean {
  return getGoogleClientId().length > 0
}

export function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      name: string
      email: string
      picture?: string
      local: boolean
    }
    if (!parsed?.email && !parsed?.local) return null
    return parsed
  } catch {
    return null
  }
}

export function persistUser(user: {
  name: string
  email: string
  picture?: string
  local: boolean
} | null) {
  if (!user) localStorage.removeItem(USER_KEY)
  else localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-gis="true"]',
    )
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () =>
        reject(new Error('Не удалось загрузить Google Identity')),
      )
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.dataset.gis = 'true'
    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error('Не удалось загрузить Google Identity'))
    document.head.appendChild(script)
  })
}

async function fetchProfile(token: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Не удалось получить профиль Google')
  return (await response.json()) as {
    name?: string
    email?: string
    picture?: string
  }
}

function ensureClient(): GoogleTokenClient {
  const clientId = getGoogleClientId()
  if (!clientId) throw new Error('Не задан VITE_GOOGLE_CLIENT_ID')
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity ещё не загружен')
  }
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response) => {
        const pending = pendingToken
        pendingToken = null
        if (response.error || !response.access_token) {
          pending?.reject(
            new Error(response.error_description || response.error || 'Отказ в доступе'),
          )
          return
        }
        accessToken = response.access_token
        pending?.resolve(response.access_token)
      },
    })
  }
  return tokenClient
}

function requestToken(prompt: '' | 'consent'): Promise<string> {
  const client = ensureClient()
  return new Promise((resolve, reject) => {
    pendingToken = { resolve, reject }
    client.requestAccessToken({ prompt })
  })
}

export async function signInWithGoogle() {
  await loadGis()
  const token = await requestToken('consent')
  const profile = await fetchProfile(token)
  return {
    name: profile.name || 'Google',
    email: profile.email || '',
    picture: profile.picture,
    local: false as const,
  }
}

export async function ensureAccessToken(interactive = false): Promise<string> {
  if (accessToken) return accessToken
  await loadGis()
  return requestToken(interactive ? 'consent' : '')
}

export function clearAccessToken() {
  const token = accessToken
  accessToken = null
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token)
  }
}

export async function authorizedFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await ensureAccessToken()
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  let response = await fetch(input, { ...init, headers })
  if (response.status === 401) {
    accessToken = null
    const next = await ensureAccessToken(true)
    headers.set('Authorization', `Bearer ${next}`)
    response = await fetch(input, { ...init, headers })
  }
  return response
}
