// Zeitbasierte Einmalcodes (TOTP, RFC 6238: HMAC-SHA1, 30 Sekunden, 6 Ziffern) — kompatibel mit
// Google Authenticator, Microsoft Authenticator, 1Password, Aegis usw.
import crypto from 'node:crypto'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buf) {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0
  let value = 0
  const out = []
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch)
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

export const newSecret = () => base32Encode(crypto.randomBytes(20))

export function codeAt(secret, step) {
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(step))
  const h = crypto.createHmac('sha1', base32Decode(secret)).update(msg).digest()
  const o = h[h.length - 1] & 15
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]
  return String(n % 1e6).padStart(6, '0')
}

export const currentStep = (now = Date.now()) => Math.floor(now / 30000)

/** Returns the matching time step (±1 step clock drift) or null. */
export function verifyCode(secret, code, now = Date.now()) {
  const c = String(code || '').replace(/\s/g, '')
  if (!/^\d{6}$/.test(c)) return null
  const step = currentStep(now)
  for (const s of [step, step - 1, step + 1]) {
    if (crypto.timingSafeEqual(Buffer.from(codeAt(secret, s)), Buffer.from(c))) return s
  }
  return null
}

export const otpauthUri = (secret, email, issuer = 'JunisWorld') =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${email}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
