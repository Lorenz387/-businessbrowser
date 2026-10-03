// Arbeitsbereich-Kontext: Privat oder ein Unternehmen. Ein Wechsel lädt alle Seiten mit den Daten des neuen Bereichs neu.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { get, getWorkspace, setWorkspace } from './api.js'

const Ctx = createContext({ current: { type: 'private' }, workspaces: [], apps: [], switchTo: () => {}, version: 0 })
export const useWorkspace = () => useContext(Ctx)

export function WorkspaceProvider({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [state, setState] = useState({ current: { type: 'private' }, workspaces: [], apps: [], error: null, loaded: false })
  const [version, setVersion] = useState(0)

  const load = useCallback(async () => {
    try {
      const d = await get('/workspace')
      // Membership ended → fall back to private.
      if (getWorkspace() !== 'private' && d.error?.code === 'workspace_forbidden') {
        setWorkspace('private')
        return load()
      }
      setState({ ...d, loaded: true })
    } catch {
      setState((s) => ({ ...s, loaded: true }))
    }
  }, [])

  const switchTo = useCallback((ws) => {
    if (ws === getWorkspace()) return
    setWorkspace(ws)
    setVersion((v) => v + 1)
    load()
  }, [load])

  // Links from notifications carry ?ws=org:<id> so they open in the right workspace.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const ws = params.get('ws')
    if (ws && /^(private|org:\d+)$/.test(ws)) {
      params.delete('ws')
      const search = params.toString()
      navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true })
      if (ws !== getWorkspace()) { switchTo(ws); return }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  useEffect(() => { load() }, [load])

  return <Ctx.Provider value={{ ...state, switchTo, reload: load, version }}>{children}</Ctx.Provider>
}
