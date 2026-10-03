// Verschlüsselung gespeicherter Geheimnisse (API-Schlüssel, Webhook-URLs, 2FA-Schlüssel) mit AES-256-GCM.
// Schlüssel: JUNIS_SECRET_KEY (64 Hex-Zeichen) oder eine automatisch erzeugte Datei im Datenverzeichnis.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { DATA_DIR } from '../db.js'

const PREFIX = 'enc:v1:'
let key = null

function getKey() {
  if (key) return key
  const env = process.env.JUNIS_SECRET_KEY
  if (env) {
    if (!/^[0-9a-fA-F]{64}$/.test(env)) throw new Error('JUNIS_SECRET_KEY muss aus 64 Hex-Zeichen bestehen (32 Byte).')
    key = Buffer.from(env, 'hex')
    return key
  }
  const file = path.join(DATA_DIR, 'secret.key')
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString('hex'), { mode: 0o600, flag: 'wx' })
  key = Buffer.from(fs.readFileSync(file, 'utf8').trim(), 'hex')
  return key
}

export const isSealed = (v) => typeof v === 'string' && v.startsWith(PREFIX)

/** Encrypts a string. null/empty stays as is; already encrypted values are returned unchanged. */
export function seal(plain) {
  if (plain == null || plain === '' || isSealed(plain)) return plain
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  const data = Buffer.concat([c.update(String(plain), 'utf8'), c.final()])
  return PREFIX + Buffer.concat([iv, c.getAuthTag(), data]).toString('base64')
}

/** Decrypts a value from seal(). Legacy plaintext values are returned unchanged. */
export function unseal(value) {
  if (!isSealed(value)) return value
  const buf = Buffer.from(value.slice(PREFIX.length), 'base64')
  const d = crypto.createDecipheriv('aes-256-gcm', getKey(), buf.subarray(0, 12))
  d.setAuthTag(buf.subarray(12, 28))
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8')
}

export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')
