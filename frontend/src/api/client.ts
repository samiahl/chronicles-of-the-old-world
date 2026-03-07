const BASE = '/api'

let authToken: string | null = localStorage.getItem('auth_token')

export function setToken(token: string | null) {
  authToken = token
  if (token) localStorage.setItem('auth_token', token)
  else localStorage.removeItem('auth_token')
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null as T
  if (res.status === 401) {
    setToken(null)
    localStorage.removeItem('auth_user')
    window.dispatchEvent(new Event('auth:expired'))
    throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: (path: string) => request<void>('DELETE', path),
}
