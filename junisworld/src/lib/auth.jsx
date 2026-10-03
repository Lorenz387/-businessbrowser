import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, onUnauthorized } from './api.js'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, aiAvailable: false, loading: true, error: null })

  const refresh = useCallback(async () => {
    try {
      const me = await api('/auth/me')
      setState({ user: me.user, aiAvailable: me.aiAvailable, loading: false, error: null })
      return me.user
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }))
      return null
    }
  }, [])

  useEffect(() => {
    refresh()
    return onUnauthorized(() => setState((s) => ({ ...s, user: null })))
  }, [refresh])

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    setState((s) => ({ ...s, user: null }))
  }, [])

  const setUser = useCallback((user) => setState((s) => ({ ...s, user })), [])

  return <AuthCtx.Provider value={{ ...state, refresh, logout, setUser }}>{children}</AuthCtx.Provider>
}

export const PLAN_NAMES = { free: 'Free', plus: 'Plus', pro: 'Pro', family: 'Family', teams: 'Teams', business: 'Business' }
