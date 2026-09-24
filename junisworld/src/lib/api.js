export class ApiError extends Error {
  constructor(status, code, message, data = {}) {
    super(message)
    this.status = status
    this.code = code
    this.data = data
  }
}

const listeners = new Set()
/** Subscribe to 401 responses (session expired). */
export const onUnauthorized = (fn) => (listeners.add(fn), () => listeners.delete(fn))

export async function api(path, { method = 'GET', body, form } = {}) {
  const opts = { method, credentials: 'same-origin', headers: {} }
  if (form) {
    opts.body = form
  } else if (method !== 'GET') {
    opts.headers['content-type'] = 'application/json'
    opts.body = JSON.stringify(body ?? {})
  }
  let res
  try {
    res = await fetch(`/api${path}`, opts)
  } catch {
    throw new ApiError(0, 'network', 'Keine Verbindung zum Server. Prüfe deine Internetverbindung und versuche es erneut.')
  }
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json().catch(() => ({})) : {}
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) listeners.forEach((fn) => fn())
    throw new ApiError(res.status, data.error || 'error', data.message || 'Die Anfrage konnte nicht verarbeitet werden.', data)
  }
  return data
}

export const get = (p) => api(p)
export const post = (p, body) => api(p, { method: 'POST', body })
export const patch = (p, body) => api(p, { method: 'PATCH', body })
export const del = (p, body) => api(p, { method: 'DELETE', body })
