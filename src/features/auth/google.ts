const SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata',
  'email',
  'profile',
].join(' ')

const USER_KEY = 'babyfood-balance-user'
const TOKEN_KEY = 'babyfood-oauth-token'
const STATE_KEY = 'babyfood-oauth-state'

let tokenClient: GoogleTokenClient | null = null
let accessToken: string | null = null
let authEnabled = true
let pendingToken:
  | { resolve: (token: string) => void; reject: (error: Error) => void }
  | null = null
let consumePromise: Promise<GoogleProfile | null> | null = null

type StoredToken = {
  access_token: string
  expires_at: number
}

export type GoogleProfile = {
  name: string
  email: string
  picture?: string
  local: false
}

export function getGoogleClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''
}

export function googleConfigured(): boolean {
  return getGoogleClientId().length > 0
}

export function oauthRedirectUri(): string {
  return `${window.location.origin}/login`
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

function saveToken(token: string, expiresIn = 3600) {
  if (!authEnabled) return
  accessToken = token
  const expires_at = Date.now() + Math.max(60, expiresIn - 60) * 1000
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ access_token: token, expires_at }))
}

function readStoredToken(): string | null {
  if (accessToken) return accessToken
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredToken
    if (!parsed.access_token || parsed.expires_at <= Date.now()) {
      localStorage.removeItem(TOKEN_KEY)
      return null
    }
    accessToken = parsed.access_token
    return accessToken
  } catch {
    return null
  }
}

function oauthErrorMessage(error?: string, description?: string) {
  if (error === 'origin_mismatch' || error === 'redirect_uri_mismatch') {
    return [
      'Google отклонил адрес приложения.',
      `В Client ID добавьте JavaScript origin: ${window.location.origin}`,
      `и Redirect URI: ${oauthRedirectUri()}`,
    ].join(' ')
  }
  if (error === 'access_denied') return 'Вход отменён'
  return description || error || 'Не удалось войти через Google'
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
    script.referrerPolicy = 'strict-origin-when-cross-origin'
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
        if (!authEnabled) {
          pending?.reject(new Error('Вышли из аккаунта'))
          return
        }
        if (response.error || !response.access_token) {
          pending?.reject(
            new Error(
              oauthErrorMessage(response.error, response.error_description),
            ),
          )
          return
        }
        saveToken(response.access_token, response.expires_in)
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

function callbackParams() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : ''
  const search = window.location.search.startsWith('?')
    ? window.location.search.slice(1)
    : ''
  return new URLSearchParams(hash || search)
}

export function hasOAuthCallback() {
  const params = callbackParams()
  return params.has('access_token') || params.has('error')
}

function clearCallbackUrl() {
  window.history.replaceState(null, '', window.location.pathname)
}

async function consumeGoogleRedirectOnce(): Promise<GoogleProfile | null> {
  if (!hasOAuthCallback()) return null
  const params = callbackParams()
  clearCallbackUrl()

  const error = params.get('error')
  if (error) {
    throw new Error(
      oauthErrorMessage(error, params.get('error_description') ?? undefined),
    )
  }

  const token = params.get('access_token')
  if (!token) return null

  const expected = sessionStorage.getItem(STATE_KEY)
  const state = params.get('state')
  sessionStorage.removeItem(STATE_KEY)
  if (expected && state && expected !== state) {
    throw new Error('Сессия входа устарела. Повторите попытку.')
  }

  const expiresIn = Number(params.get('expires_in') || '3600')
  enableAuthSession()
  saveToken(token, Number.isFinite(expiresIn) ? expiresIn : 3600)
  const profile = await fetchProfile(token)
  return {
    name: profile.name || 'Google',
    email: profile.email || '',
    picture: profile.picture,
    local: false,
  }
}

export function consumeGoogleRedirect(): Promise<GoogleProfile | null> {
  if (!consumePromise) {
    if (!hasOAuthCallback()) return Promise.resolve(null)
    consumePromise = consumeGoogleRedirectOnce()
  }
  return consumePromise
}

export function startGoogleSignIn() {
  const clientId = getGoogleClientId()
  if (!clientId) throw new Error('Не задан VITE_GOOGLE_CLIENT_ID')
  enableAuthSession()
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_KEY, state)
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: oauthRedirectUri(),
    response_type: 'token',
    scope: SCOPES,
    include_granted_scopes: 'true',
    state,
    prompt: 'select_account',
  })
  window.location.assign(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  )
}

export async function ensureAccessToken(interactive = false): Promise<string> {
  if (!authEnabled) throw new Error('Нет сессии')
  const stored = readStoredToken()
  if (stored) return stored
  await loadGis()
  try {
    return await requestToken(interactive ? 'consent' : '')
  } catch (error) {
    if (!interactive || !authEnabled) throw error
    startGoogleSignIn()
    throw new Error('Нужно снова войти через Google')
  }
}

export function clearAccessToken() {
  authEnabled = false
  consumePromise = null
  if (pendingToken) {
    pendingToken.reject(new Error('Вышли из аккаунта'))
    pendingToken = null
  }
  const token = accessToken ?? readStoredToken()
  accessToken = null
  localStorage.removeItem(TOKEN_KEY)
  try {
    if (token && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(token)
    }
  } catch {
    /* Google SDK может быть не готов */
  }
}

export function enableAuthSession() {
  authEnabled = true
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
    localStorage.removeItem(TOKEN_KEY)
    const next = await ensureAccessToken(true)
    headers.set('Authorization', `Bearer ${next}`)
    response = await fetch(input, { ...init, headers })
  }
  return response
}
