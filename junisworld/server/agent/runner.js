// PersonalAI agent loop: model → tool calls → (approval) → execution → model … until a final answer.
import os from 'node:os'
import { one, all, run, parseJSON } from '../db.js'
import { ApiError } from '../lib/http.js'
import { callModel } from './providers.js'
import { TOOL_DEFS, availableTools, needsApproval, executeTool } from './tools.js'
import { providerConfig, listMessages, addMessage } from './store.js'

const running = new Set()

function systemPrompt(userId, profile, tools, local) {
  const user = one('SELECT name FROM users WHERE id = ?', userId)
  const mem = all("SELECT content FROM memories WHERE user_id = ? AND kind = 'PersonalAI' ORDER BY created_at DESC LIMIT 40", userId)
  const lines = [
    `Du bist PersonalAI, der persönliche KI-Assistent von ${user?.name ?? 'dem Nutzer'} innerhalb von JunisWorld.`,
    'Du beantwortest Fragen, schreibst Code und erledigst Aufgaben in mehreren Schritten. Antworte in der Sprache des Nutzers (Standard: Deutsch), präzise und ohne Floskeln.',
    'Erfinde keine Fakten, Quellen, Befehlsausgaben oder Dateiinhalte. Wenn du etwas nicht weißt oder nicht prüfen kannst, sag es.',
  ]
  if (tools.length) {
    lines.push(`Verfügbare Werkzeuge: ${tools.join(', ')}. Nutze sie, wenn eine Aufgabe es erfordert, und prüfe Ergebnisse, statt sie anzunehmen.`)
    if (local) {
      lines.push(`Betriebssystem: ${process.platform === 'win32' ? 'Windows (Befehle laufen in PowerShell)' : `${os.type()} (Befehle laufen in bash)`}. Workspace: ${profile.workspace}.`)
      lines.push('Sei bei Befehlen vorsichtig: keine destruktiven Aktionen (Löschen, Formatieren, Systemänderungen) ohne ausdrücklichen Wunsch. Erkläre kurz, was ein Befehl tut, bevor du ihn ausführst.')
    }
    if (profile.permissionMode !== 'auto') lines.push('Der Nutzer muss manche Werkzeugaufrufe bestätigen. Wird ein Aufruf abgelehnt, akzeptiere das und schlage eine Alternative vor.')
  } else {
    lines.push('Du hast in dieser Umgebung keine Werkzeuge. Wenn eine Aufgabe Befehle oder Dateizugriff erfordert, gib dem Nutzer die Schritte bzw. den Code, den er selbst ausführen kann.')
  }
  if (mem.length) lines.push(`Was du über den Nutzer weißt (vom Nutzer einsehbar):\n${mem.map((m) => `- ${m.content}`).join('\n')}`)
  if (profile.instructions?.trim()) lines.push(`Anweisungen des Nutzers für dieses Profil (haben Vorrang vor Stilvorgaben oben):\n${profile.instructions.trim()}`)
  return lines.join('\n\n')
}

function modelFor(userId, profile) {
  const cfg = providerConfig(userId, profile.provider)
  if (!cfg) throw new ApiError(400, 'provider_unknown', 'Unbekannter Anbieter im Profil.')
  return { cfg, model: profile.model || cfg.defaultModel }
}

/**
 * Continue the conversation until the model gives a final answer, a tool call needs
 * approval, or the step limit is reached. Returns the new status.
 */
export async function continueRun(userId, conv, profile, local) {
  if (running.has(conv.id)) throw new ApiError(409, 'busy', 'PersonalAI arbeitet in diesem Gespräch bereits. Bitte warte kurz.')
  running.add(conv.id)
  try {
    const tools = availableTools(profile, local)
    const { cfg, model } = modelFor(userId, profile)
    const system = systemPrompt(userId, profile, tools, local)
    for (let step = 0; step < profile.maxSteps; step++) {
      const history = listMessages(conv.id).filter((m) => ['user', 'assistant', 'tool'].includes(m.role))
      const out = await callModel(cfg, { model, system, history, tools })
      addMessage(conv.id, 'assistant', { text: out.text, toolCalls: out.toolCalls, raw: out.raw, provider: profile.provider, model, truncated: !!out.truncated })
      if (!out.toolCalls.length) {
        run("UPDATE agent_conversations SET status = 'idle', pending = NULL WHERE id = ?", conv.id)
        return { status: 'done' }
      }
      const calls = out.toolCalls.map((c) => ({ ...c, needsApproval: !TOOL_DEFS[c.name] ? false : needsApproval(profile.permissionMode, c.name) }))
      if (calls.some((c) => c.needsApproval)) {
        run("UPDATE agent_conversations SET status = 'awaiting_approval', pending = ? WHERE id = ?", JSON.stringify(calls), conv.id)
        return { status: 'awaiting_approval', pending: calls }
      }
      const results = []
      for (const c of calls) results.push({ id: c.id, name: c.name, input: c.input, ...(await executeTool(userId, profile, c, local)) })
      addMessage(conv.id, 'tool', { results })
    }
    addMessage(conv.id, 'notice', { text: `Schrittlimit (${profile.maxSteps}) erreicht. Schreib „weiter“, damit PersonalAI fortfährt.` })
    run("UPDATE agent_conversations SET status = 'idle', pending = NULL WHERE id = ?", conv.id)
    return { status: 'step_limit' }
  } catch (e) {
    run("UPDATE agent_conversations SET status = 'idle' WHERE id = ? AND status = 'running'", conv.id)
    throw e
  } finally {
    running.delete(conv.id)
  }
}

/** Resolve pending tool calls with the user's decisions, then continue. */
export async function resolvePending(userId, conv, profile, local, decisions) {
  const pending = parseJSON(conv.pending, [])
  if (!pending.length) throw new ApiError(400, 'nothing_pending', 'Es gibt keine offene Freigabe.')
  if (running.has(conv.id)) throw new ApiError(409, 'busy', 'PersonalAI arbeitet in diesem Gespräch bereits.')
  const results = []
  for (const c of pending) {
    const decision = c.needsApproval ? decisions?.[c.id] : 'approve'
    if (decision === 'approve') results.push({ id: c.id, name: c.name, input: c.input, approved: c.needsApproval || undefined, ...(await executeTool(userId, profile, c, local)) })
    else results.push({ id: c.id, name: c.name, input: c.input, denied: true, output: 'Der Nutzer hat diesen Aufruf abgelehnt.', isError: true })
  }
  addMessage(conv.id, 'tool', { results })
  run("UPDATE agent_conversations SET status = 'idle', pending = NULL WHERE id = ?", conv.id)
  return continueRun(userId, { ...conv, pending: null }, profile, local)
}

/** A new user message while approval is pending: deny the open calls first so the history stays valid. */
export function denyPending(conv) {
  const pending = parseJSON(conv.pending, [])
  if (!pending.length) return
  addMessage(conv.id, 'tool', {
    results: pending.map((c) => ({ id: c.id, name: c.name, input: c.input, denied: true, output: 'Nicht ausgeführt: Der Nutzer hat stattdessen eine neue Nachricht geschrieben.', isError: true })),
  })
  run("UPDATE agent_conversations SET status = 'idle', pending = NULL WHERE id = ?", conv.id)
}
