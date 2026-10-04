// Verbindung der Apps: Cockpit über alle Apps des aktuellen Arbeitsbereichs.
import { Router } from 'express'
import { h } from '../lib/http.js'
import { resolveWorkspace } from '../lib/workspace.js'
import { cockpit, connectorContext } from '../lib/connectors.js'

const r = Router()

r.get('/cockpit', h(async (req, res) => {
  const ws = resolveWorkspace(req)
  res.json({ workspace: { type: ws.type, name: ws.orgName || null, role: ws.role }, ...cockpit(connectorContext(req, ws)) })
}))

export default r
