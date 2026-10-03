// PersonalAI tools. Command and file tools touch the machine the server runs on,
// so they are only available in explicit local mode (see localToolsEnabled).
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { run } from '../db.js'

const MAX_OUTPUT = 20000
const COMMAND_TIMEOUT_MS = Number(process.env.PERSONALAI_COMMAND_TIMEOUT_MS || 120000)
const IS_WINDOWS = process.platform === 'win32'

export const TOOL_DEFS = {
  run_command: {
    description: `Führt einen Shell-Befehl auf dem Rechner des Nutzers aus (${IS_WINDOWS ? 'Windows PowerShell' : 'bash'}). Arbeitsverzeichnis ist der Workspace, sofern nicht anders angegeben. Liefert stdout, stderr und Exit-Code.`,
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Der auszuführende Befehl.' },
        cwd: { type: 'string', description: 'Optionales Arbeitsverzeichnis, relativ zum Workspace.' },
      },
      required: ['command'],
    },
    risk: 'execute',
  },
  read_file: {
    description: 'Liest eine Textdatei. Pfad relativ zum Workspace.',
    parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    risk: 'read',
  },
  write_file: {
    description: 'Schreibt (erstellt oder überschreibt) eine Textdatei. Verzeichnisse werden angelegt. Pfad relativ zum Workspace.',
    parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
    risk: 'write',
  },
  list_directory: {
    description: 'Listet Dateien und Ordner eines Verzeichnisses. Pfad relativ zum Workspace, Standard: Workspace selbst.',
    parameters: { type: 'object', properties: { path: { type: 'string' } }, required: [] },
    risk: 'read',
  },
  web_fetch: {
    description: 'Lädt eine Webseite (http/https) und gibt den Textinhalt zurück.',
    parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
    risk: 'read',
  },
  remember: {
    description: 'Speichert eine dauerhafte Information über den Nutzer oder seine Vorlieben (z. B. bevorzugte Programmiersprache). Nur nutzen, wenn der Nutzer etwas Dauerhaftes mitteilt.',
    parameters: { type: 'object', properties: { fact: { type: 'string' } }, required: ['fact'] },
    risk: 'memory',
  },
}

// web_fetch is local-only too: on a shared server it could reach internal network addresses.
const LOCAL_ONLY = new Set(['run_command', 'read_file', 'write_file', 'list_directory', 'web_fetch'])
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

/**
 * Machine-access tools require BOTH an explicit opt-in (PERSONALAI_TOOLS=on)
 * and a request coming from the same machine. A deployed multi-user server
 * must never let its users run commands on it.
 */
export function localToolsEnabled(req) {
  if (process.env.PERSONALAI_TOOLS !== 'on') return { enabled: false, reason: 'not_enabled' }
  if (!LOOPBACK.has(req.socket?.remoteAddress) || req.headers['x-forwarded-for']) return { enabled: false, reason: 'not_local' }
  return { enabled: true }
}

export function availableTools(profile, local) {
  return profile.tools.filter((t) => TOOL_DEFS[t] && (local || !LOCAL_ONLY.has(t)))
}

/** Does this call need the user's approval under the given permission mode? */
export function needsApproval(mode, toolName) {
  const risk = TOOL_DEFS[toolName]?.risk
  if (mode === 'auto') return false
  if (mode === 'strict') return true
  return risk === 'execute' || risk === 'write'
}

function resolvePath(profile, p = '.') {
  const root = path.resolve(profile.workspace)
  const target = path.resolve(root, String(p || '.'))
  const rel = path.relative(root, target)
  if (!profile.allowOutside && (rel.startsWith('..') || path.isAbsolute(rel))) {
    throw new Error(`Zugriff außerhalb des Workspace (${root}) ist in diesem Profil nicht erlaubt.`)
  }
  return target
}

const cap = (s) => (s.length > MAX_OUTPUT ? `${s.slice(0, MAX_OUTPUT)}\n… [gekürzt, ${s.length - MAX_OUTPUT} Zeichen ausgelassen]` : s)

function runCommand(command, cwd) {
  return new Promise((resolve) => {
    const [bin, args] = IS_WINDOWS
      ? ['powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command]]
      : ['bash', ['-lc', command]]
    let stdout = ''
    let stderr = ''
    let done = false
    const child = spawn(bin, args, { cwd, env: process.env, windowsHide: true })
    const timer = setTimeout(() => {
      if (done) return
      child.kill()
      stderr += `\n[Abgebrochen nach ${COMMAND_TIMEOUT_MS / 1000} s]`
    }, COMMAND_TIMEOUT_MS)
    child.stdout.on('data', (d) => { if (stdout.length < MAX_OUTPUT * 2) stdout += d })
    child.stderr.on('data', (d) => { if (stderr.length < MAX_OUTPUT * 2) stderr += d })
    child.on('error', (e) => {
      done = true
      clearTimeout(timer)
      resolve({ output: `Befehl konnte nicht gestartet werden: ${e.message}`, isError: true })
    })
    child.on('close', (code) => {
      done = true
      clearTimeout(timer)
      const out = [`Exit-Code: ${code}`, stdout && `stdout:\n${stdout}`, stderr && `stderr:\n${stderr}`].filter(Boolean).join('\n')
      resolve({ output: cap(out), isError: code !== 0 })
    })
  })
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Execute one tool call. Never throws: errors become tool results with isError. */
export async function executeTool(userId, profile, call, local) {
  const input = call.input || {}
  try {
    if (!availableTools(profile, local).includes(call.name)) {
      return { output: `Das Werkzeug ${call.name} ist in diesem Profil oder in dieser Umgebung nicht verfügbar.`, isError: true }
    }
    if (LOCAL_ONLY.has(call.name)) fs.mkdirSync(path.resolve(profile.workspace), { recursive: true })
    switch (call.name) {
      case 'run_command': {
        if (!input.command || typeof input.command !== 'string') return { output: 'Kein Befehl angegeben.', isError: true }
        return await runCommand(input.command, resolvePath(profile, input.cwd || '.'))
      }
      case 'read_file': {
        const p = resolvePath(profile, input.path)
        const stat = fs.statSync(p)
        if (stat.size > 2 * 1024 * 1024) return { output: 'Datei ist größer als 2 MB und wird nicht gelesen.', isError: true }
        return { output: cap(fs.readFileSync(p, 'utf8')), isError: false }
      }
      case 'write_file': {
        const p = resolvePath(profile, input.path)
        fs.mkdirSync(path.dirname(p), { recursive: true })
        fs.writeFileSync(p, String(input.content ?? ''), 'utf8')
        return { output: `Gespeichert: ${p} (${Buffer.byteLength(String(input.content ?? ''))} Bytes)`, isError: false }
      }
      case 'list_directory': {
        const p = resolvePath(profile, input.path || '.')
        const entries = fs.readdirSync(p, { withFileTypes: true }).slice(0, 500)
        return { output: entries.map((e) => `${e.isDirectory() ? '[Ordner] ' : ''}${e.name}`).join('\n') || '(leer)', isError: false }
      }
      case 'web_fetch': {
        const url = String(input.url || '')
        if (!/^https?:\/\//i.test(url)) return { output: 'Nur http- und https-Adressen sind erlaubt.', isError: true }
        const res = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'PersonalAI (JunisWorld)' } })
        const type = res.headers.get('content-type') || ''
        const body = await res.text()
        const text = type.includes('html') ? htmlToText(body) : body
        return { output: cap(`HTTP ${res.status}\n${text}`), isError: !res.ok }
      }
      case 'remember': {
        const fact = String(input.fact || '').trim().slice(0, 1000)
        if (!fact) return { output: 'Leere Information.', isError: true }
        run("INSERT INTO memories (user_id, kind, content, source) VALUES (?, 'PersonalAI', ?, 'agent')", userId, fact)
        return { output: 'Gemerkt. Der Nutzer kann es unter Junis AI → Memory einsehen und löschen.', isError: false }
      }
      default:
        return { output: `Unbekanntes Werkzeug: ${call.name}`, isError: true }
    }
  } catch (e) {
    return { output: `Fehler: ${e.message}`, isError: true }
  }
}
