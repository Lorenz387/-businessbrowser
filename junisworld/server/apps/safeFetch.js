// Fetch external URLs on behalf of users without exposing the server's internal network (SSRF protection).
import dns from 'node:dns/promises'
import net from 'node:net'

const MAX_BYTES = 3 * 1024 * 1024

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  const v = ip.toLowerCase()
  if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7))
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')
}

export class FetchError extends Error {}

async function assertPublic(url) {
  if (!/^https?:$/.test(url.protocol)) throw new FetchError('Nur http- und https-Adressen sind erlaubt.')
  if (process.env.APPS_ALLOW_PRIVATE_FETCH === 'on') return
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => {
    throw new FetchError(`Die Adresse ${host} konnte nicht aufgelöst werden.`)
  })
  if (addrs.some((a) => isPrivateIp(a.address))) throw new FetchError('Interne Netzwerkadressen dürfen nicht abgerufen werden.')
}

/** GET a public URL, following up to 5 redirects with the same checks. Returns {url, status, contentType, body}. */
export async function safeFetch(rawUrl, { timeoutMs = 15000 } = {}) {
  let url = new URL(rawUrl)
  for (let i = 0; i < 6; i++) {
    await assertPublic(url)
    let res
    try {
      res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': 'JunisWorld-A11y-Scanner/1.0', accept: 'text/html,*/*;q=0.5' } })
    } catch (e) {
      throw new FetchError(`Seite nicht erreichbar: ${e.cause?.code || e.message}`)
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location'), url)
      continue
    }
    const reader = res.body?.getReader()
    const chunks = []
    let size = 0
    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > MAX_BYTES) {
        reader.cancel()
        break
      }
      chunks.push(value)
    }
    return { url: url.toString(), status: res.status, contentType: res.headers.get('content-type') || '', body: Buffer.concat(chunks).toString('utf8') }
  }
  throw new FetchError('Zu viele Weiterleitungen.')
}
