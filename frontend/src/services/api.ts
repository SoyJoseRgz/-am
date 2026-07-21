const BASE = ''
let refreshing: Promise<boolean> | null = null

export async function api<T = any>(path: string, options: RequestInit = {}) {
  return doFetch<T>(path, options)
}

async function doFetch<T>(path: string, options: RequestInit, isRetry = false): Promise<T> {
  const token = localStorage.getItem('accessToken')
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 401 && !isRetry) {
    const refreshed = await refreshToken()
    if (refreshed) return doFetch<T>(path, options, true)
    localStorage.clear()
    window.location.href = '/login'
    throw new Error('Sesión expirada')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Error de red')
  }

  if (res.status === 204) return null as T
  return res.json() as Promise<T>
}

async function refreshToken(): Promise<boolean> {
  if (refreshing) return refreshing

  refreshing = (async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) return false

    try {
      const res = await fetch(`${BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) return false

      const data = await res.json()
      localStorage.setItem('accessToken', data.accessToken)
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken)
      }
      return true
    } catch {
      return false
    }
  })()

  try { return await refreshing }
  finally { refreshing = null }
}


