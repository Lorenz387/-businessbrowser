// Small helpers for consistent API errors.

export class ApiError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message)
    this.status = status
    this.code = code
    this.extra = extra
  }
}

export const badRequest = (message, extra) => new ApiError(400, 'bad_request', message, extra)
export const notFound = (message = 'Nicht gefunden.') => new ApiError(404, 'not_found', message)
export const forbidden = (message = 'Keine Berechtigung für diese Aktion.') => new ApiError(403, 'forbidden', message)

/** Wrap async route handlers so thrown errors reach the error middleware. */
export const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export function str(v, { max = 2000, required = false, field = 'Feld' } = {}) {
  if (v == null || v === '') {
    if (required) throw badRequest(`${field} darf nicht leer sein.`)
    return null
  }
  if (typeof v !== 'string') throw badRequest(`${field} ist ungültig.`)
  const t = v.trim()
  if (required && !t) throw badRequest(`${field} darf nicht leer sein.`)
  if (t.length > max) throw badRequest(`${field} ist zu lang (max. ${max} Zeichen).`)
  return t
}

export function int(v, { min = -Infinity, max = Infinity, field = 'Wert', fallback = null } = {}) {
  if (v == null || v === '') return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) throw badRequest(`${field} ist keine Zahl.`)
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function oneOf(v, options, { field = 'Wert', fallback } = {}) {
  if (v == null) return fallback
  if (!options.includes(v)) throw badRequest(`${field} ist ungültig.`)
  return v
}
