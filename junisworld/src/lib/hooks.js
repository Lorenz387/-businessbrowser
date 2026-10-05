import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api.js'

/** Load data from the API with loading / error / reload handling. */
export function useApi(path, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: !!path })
  const seq = useRef(0)
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!path) return
    const id = ++seq.current
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await api(path)
      if (id === seq.current) setState({ data, error: null, loading: false })
    } catch (error) {
      if (id === seq.current) setState((s) => ({ data: silent ? s.data : null, error, loading: false }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps])
  useEffect(() => {
    load()
  }, [load])
  return { ...state, reload: () => load({ silent: true }), hardReload: () => load() }
}

/** Run a mutating action with pending + error state. */
export function useAction() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const run = useCallback(async (fn) => {
    setPending(true)
    setError(null)
    try {
      return await fn()
    } catch (e) {
      setError(e)
      throw e
    } finally {
      setPending(false)
    }
  }, [])
  return { pending, error, run, setError }
}

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · JunisWorld` : 'JunisWorld'
  }, [title])
}
