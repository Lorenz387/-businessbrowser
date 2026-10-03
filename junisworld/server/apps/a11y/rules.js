// Static accessibility checks on HTML (no browser rendering). Each finding carries a concrete code fix.
// Automated checks find only part of all barriers; they never prove WCAG conformance.
import { parse } from 'node-html-parser'

export const RULES = {
  'html-lang': { title: 'Sprache der Seite fehlt', impact: 'serious', wcag: '3.1.1' },
  'document-title': { title: 'Seitentitel fehlt', impact: 'serious', wcag: '2.4.2' },
  'image-alt': { title: 'Bild ohne Alternativtext', impact: 'critical', wcag: '1.1.1' },
  'input-image-alt': { title: 'Bild-Schaltfläche ohne Alternativtext', impact: 'critical', wcag: '1.1.1' },
  'form-label': { title: 'Formularfeld ohne Beschriftung', impact: 'critical', wcag: '1.3.1 / 4.1.2' },
  'button-name': { title: 'Schaltfläche ohne zugänglichen Namen', impact: 'critical', wcag: '4.1.2' },
  'link-name': { title: 'Link ohne zugänglichen Namen', impact: 'serious', wcag: '2.4.4 / 4.1.2' },
  'link-generic': { title: 'Nichtssagender Linktext', impact: 'minor', wcag: '2.4.4' },
  'heading-order': { title: 'Übersprungene Überschriftenebene', impact: 'moderate', wcag: '1.3.1' },
  'heading-h1': { title: 'Keine Hauptüberschrift (h1)', impact: 'moderate', wcag: '1.3.1 (Best Practice)' },
  'empty-heading': { title: 'Leere Überschrift', impact: 'moderate', wcag: '1.3.1 / 2.4.6' },
  'duplicate-id': { title: 'Doppelte ID', impact: 'moderate', wcag: 'Best Practice (bricht Beschriftungen & ARIA-Bezüge)' },
  'meta-viewport': { title: 'Zoomen ist blockiert', impact: 'critical', wcag: '1.4.4' },
  'frame-title': { title: 'iframe ohne Titel', impact: 'serious', wcag: '4.1.2' },
  'landmark-main': { title: 'Kein Hauptbereich (main)', impact: 'moderate', wcag: '1.3.1 (Best Practice)' },
  'tabindex-positive': { title: 'Positiver tabindex', impact: 'serious', wcag: '2.4.3' },
  'autoplay-media': { title: 'Automatisch abgespielte Medien', impact: 'serious', wcag: '1.4.2' },
  'color-contrast-inline': { title: 'Zu geringer Farbkontrast', impact: 'serious', wcag: '1.4.3' },
  'table-headers': { title: 'Datentabelle ohne Kopfzellen', impact: 'serious', wcag: '1.3.1' },
  'aria-hidden-focusable': { title: 'Fokussierbares Element ist für Screenreader versteckt', impact: 'serious', wcag: '4.1.2' },
}

export const IMPACT_WEIGHT = { critical: 10, serious: 5, moderate: 2, minor: 1 }
export const IMPACT_LABEL = { critical: 'Kritisch', serious: 'Schwer', moderate: 'Mittel', minor: 'Gering' }

const openTag = (el) => {
  const html = el.outerHTML
  const end = html.indexOf('>')
  return end > 0 ? html.slice(0, end + 1) : html.slice(0, 300)
}
const snippet = (el) => {
  const html = el.outerHTML.replace(/\s+/g, ' ')
  return html.length > 300 ? `${html.slice(0, 297)}…` : html
}
function selectorOf(el) {
  const parts = []
  let cur = el
  while (cur && cur.tagName && parts.length < 4) {
    let s = cur.tagName.toLowerCase()
    const id = cur.getAttribute?.('id')
    if (id) {
      parts.unshift(`${s}#${id}`)
      break
    }
    const cls = (cur.getAttribute?.('class') || '').trim().split(/\s+/).filter(Boolean)[0]
    if (cls) s += `.${cls}`
    parts.unshift(s)
    cur = cur.parentNode
  }
  return parts.join(' > ')
}
/** Insert an attribute into an opening tag. */
const withAttr = (tag, attr) => tag.replace(/^<([a-zA-Z0-9-]+)/, `<$1 ${attr}`)
const text = (el) => (el.text || '').replace(/\s+/g, ' ').trim()
const attr = (el, n) => el.getAttribute(n)
const hasNonEmpty = (el, n) => !!(attr(el, n) || '').trim()

function accessibleName(el, root) {
  if (hasNonEmpty(el, 'aria-label')) return attr(el, 'aria-label').trim()
  const lb = attr(el, 'aria-labelledby')
  if (lb) {
    const t = lb.split(/\s+/).map((id) => root.querySelector(`[id="${id}"]`)).filter(Boolean).map(text).join(' ').trim()
    if (t) return t
  }
  const own = text(el)
  if (own) return own
  const imgAlt = el.querySelectorAll('img').map((i) => (attr(i, 'alt') || '').trim()).filter(Boolean).join(' ')
  if (imgAlt) return imgAlt
  const svgTitle = el.querySelector('svg title')
  if (svgTitle && text(svgTitle)) return text(svgTitle)
  if (hasNonEmpty(el, 'title')) return attr(el, 'title').trim()
  return ''
}

const isHidden = (el) => {
  for (let cur = el; cur && cur.tagName; cur = cur.parentNode) {
    if (cur.hasAttribute('hidden') || /display\s*:\s*none/i.test(attr(cur, 'style') || '')) return true
  }
  return false
}

// ---- inline color contrast (only styles written directly on the element) ----
const NAMED = { black: '#000000', white: '#ffffff', gray: '#808080', grey: '#808080', silver: '#c0c0c0', red: '#ff0000', yellow: '#ffff00', lightgray: '#d3d3d3', lightgrey: '#d3d3d3' }
function parseColor(v) {
  if (!v) return null
  v = v.trim().toLowerCase()
  if (NAMED[v]) v = NAMED[v]
  let m = v.match(/^#([0-9a-f]{3})$/)
  if (m) return m[1].split('').map((c) => parseInt(c + c, 16))
  m = v.match(/^#([0-9a-f]{6})$/)
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16))
  m = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?\s*\)$/)
  if (m && (m[4] === undefined || Number(m[4]) === 1)) return [m[1], m[2], m[3]].map(Number)
  return null
}
const lum = ([r, g, b]) => {
  const c = [r, g, b].map((x) => {
    x /= 255
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
export const contrast = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}
const styleProp = (style, prop) => {
  const m = (style || '').match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i'))
  return m ? m[1].replace(/!important/i, '').trim() : null
}

const GENERIC_LINKS = new Set(['hier', 'hier klicken', 'klicken sie hier', 'mehr', 'weiter', 'weiterlesen', 'mehr erfahren', 'click here', 'here', 'more', 'read more', 'link'])

/** Analyse one HTML document. Returns a list of findings. */
export function checkHtml(html) {
  const root = parse(html, { comment: false, blockTextElements: { script: false, style: false, noscript: false, pre: true } })
  const out = []
  const add = (rule, el, message, fix, help) => out.push({ rule, ...RULES[rule], message, selector: el ? selectorOf(el) : null, snippet: el ? snippet(el) : null, fix, help })

  const htmlEl = root.querySelector('html')
  if (htmlEl && !hasNonEmpty(htmlEl, 'lang')) {
    add('html-lang', htmlEl, 'Das <html>-Element hat kein lang-Attribut. Screenreader wählen dann ggf. die falsche Aussprache.', withAttr(openTag(htmlEl), 'lang="de"'), 'Sprache der Seite angeben, z. B. lang="de".')
  }
  const title = root.querySelector('title')
  if (!title || !text(title)) {
    add('document-title', title || root.querySelector('head'), 'Die Seite hat keinen aussagekräftigen <title>.', '<title>Seitenname – Firmenname</title>', 'Jede Seite braucht einen eindeutigen Titel im <head>.')
  }

  for (const img of root.querySelectorAll('img')) {
    if (isHidden(img) || attr(img, 'role') === 'presentation' || attr(img, 'aria-hidden') === 'true') continue
    if (!img.hasAttribute('alt') && !hasNonEmpty(img, 'aria-label') && !attr(img, 'aria-labelledby')) {
      add('image-alt', img, `Bild ohne alt-Attribut (${attr(img, 'src') || 'ohne src'}).`, withAttr(openTag(img), 'alt="[Kurze Beschreibung des Bildinhalts]"'), 'Informative Bilder brauchen eine Beschreibung; rein dekorative Bilder alt="".')
    }
  }
  for (const inp of root.querySelectorAll('input[type=image]')) {
    if (!hasNonEmpty(inp, 'alt') && !hasNonEmpty(inp, 'aria-label')) add('input-image-alt', inp, 'Bild-Schaltfläche ohne alt-Text.', withAttr(openTag(inp), 'alt="[Funktion, z. B. Suchen]"'), 'Der alt-Text beschreibt die Funktion.')
  }

  const labelFor = new Set(root.querySelectorAll('label[for]').map((l) => attr(l, 'for')))
  for (const f of root.querySelectorAll('input, select, textarea')) {
    const type = (attr(f, 'type') || 'text').toLowerCase()
    if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type) || isHidden(f)) continue
    const id = attr(f, 'id')
    const labelled = (id && labelFor.has(id)) || f.closest('label') || hasNonEmpty(f, 'aria-label') || attr(f, 'aria-labelledby') || hasNonEmpty(f, 'title')
    if (!labelled) {
      const fid = id || `feld-${out.length + 1}`
      const fixedTag = id ? openTag(f) : withAttr(openTag(f), `id="${fid}"`)
      add('form-label', f, `Formularfeld (${f.tagName.toLowerCase()}${f.tagName === 'INPUT' ? ` type=${type}` : ''}) ohne Beschriftung${hasNonEmpty(f, 'placeholder') ? ' — ein placeholder ersetzt keine Beschriftung' : ''}.`, `<label for="${fid}">[Beschriftung]</label>\n${fixedTag}`, 'Jedes Feld braucht ein sichtbares <label> (oder aria-label).')
    }
  }

  for (const b of root.querySelectorAll('button, [role=button]')) {
    if (isHidden(b)) continue
    if (!accessibleName(b, root)) add('button-name', b, 'Schaltfläche ohne Text oder aria-label (typisch bei reinen Icon-Buttons).', withAttr(openTag(b), 'aria-label="[Funktion, z. B. Menü öffnen]"'), 'Icon-Buttons brauchen aria-label.')
  }
  for (const b of root.querySelectorAll('input[type=submit], input[type=button], input[type=reset]')) {
    if (!hasNonEmpty(b, 'value') && !hasNonEmpty(b, 'aria-label')) add('button-name', b, 'Button-Input ohne value.', withAttr(openTag(b), 'value="[Beschriftung]"'), 'value beschreibt die Aktion.')
  }

  for (const a of root.querySelectorAll('a[href]')) {
    if (isHidden(a)) continue
    const name = accessibleName(a, root)
    if (!name) add('link-name', a, `Link ohne erkennbaren Namen (Ziel: ${attr(a, 'href')}).`, withAttr(openTag(a), 'aria-label="[Linkziel, z. B. Startseite]"'), 'Linktext oder aria-label muss das Ziel beschreiben.')
    else if (GENERIC_LINKS.has(name.toLowerCase())) add('link-generic', a, `Linktext „${name}“ ist ohne Kontext nicht verständlich.`, `${openTag(a)}[Worum es geht, z. B. „Preise ansehen“]</a>`, 'Screenreader-Nutzer springen oft von Link zu Link.')
  }

  const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6').filter((h) => !isHidden(h))
  if (headings.length && !headings.some((h) => h.tagName === 'H1')) add('heading-h1', headings[0], 'Die Seite hat keine h1-Überschrift.', `<h1>[Hauptthema der Seite]</h1>`, 'Eine h1 benennt den Hauptinhalt.')
  let prev = 0
  for (const h of headings) {
    const lvl = Number(h.tagName[1])
    if (!text(h) && !h.querySelector('img[alt]')) add('empty-heading', h, `Leere Überschrift <${h.tagName.toLowerCase()}>.`, `${openTag(h)}[Überschrift]</${h.tagName.toLowerCase()}>`, 'Leere Überschriften stören die Navigation.')
    if (prev && lvl > prev + 1) add('heading-order', h, `Überschrift springt von h${prev} auf h${lvl}.`, `<h${prev + 1}>${text(h).slice(0, 60)}</h${prev + 1}>`, 'Ebenen nicht überspringen; Optik per CSS steuern.')
    prev = lvl
  }

  const ids = new Map()
  for (const el of root.querySelectorAll('[id]')) {
    const id = attr(el, 'id')
    ids.set(id, (ids.get(id) || []).concat(el))
  }
  for (const [id, els] of ids) if (id && els.length > 1) add('duplicate-id', els[1], `Die ID „${id}“ kommt ${els.length}-mal vor.`, withAttr(openTag(els[1]).replace(/\sid=("[^"]*"|'[^']*'|\S+)/, ''), `id="${id}-2"`), 'IDs müssen eindeutig sein, sonst zeigen Labels/ARIA auf das falsche Element.')

  const vp = root.querySelector('meta[name=viewport]')
  const vpc = (vp && attr(vp, 'content')) || ''
  const maxScale = vpc.match(/maximum-scale\s*=\s*([\d.]+)/i)
  if (/user-scalable\s*=\s*(no|0)/i.test(vpc) || (maxScale && Number(maxScale[1]) < 2)) {
    add('meta-viewport', vp, 'Der Viewport verhindert das Vergrößern der Seite.', '<meta name="viewport" content="width=device-width, initial-scale=1">', 'user-scalable=no und maximum-scale entfernen.')
  }

  for (const f of root.querySelectorAll('iframe')) {
    if (!hasNonEmpty(f, 'title') && !hasNonEmpty(f, 'aria-label') && attr(f, 'aria-hidden') !== 'true') add('frame-title', f, 'iframe ohne title.', withAttr(openTag(f), 'title="[Inhalt, z. B. Anfahrtskarte]"'), 'Der Titel beschreibt den eingebetteten Inhalt.')
  }

  if (root.querySelector('body') && !root.querySelector('main, [role=main]')) add('landmark-main', root.querySelector('body'), 'Kein <main>-Bereich gefunden.', '<main id="inhalt">…Hauptinhalt…</main>', 'Mit <main> springen Screenreader direkt zum Inhalt.')

  for (const el of root.querySelectorAll('[tabindex]')) {
    if (Number(attr(el, 'tabindex')) > 0) add('tabindex-positive', el, `tabindex="${attr(el, 'tabindex')}" verändert die Tab-Reihenfolge.`, openTag(el).replace(/tabindex=("[^"]*"|'[^']*'|\S+)/, 'tabindex="0"'), 'Nur 0 oder -1 verwenden; Reihenfolge über das HTML steuern.')
  }

  for (const m of root.querySelectorAll('video[autoplay], audio[autoplay]')) {
    if (!m.hasAttribute('muted')) add('autoplay-media', m, 'Medien starten automatisch mit Ton.', withAttr(openTag(m).replace(/\sautoplay(=("[^"]*"|'[^']*'|\S+))?/, ''), 'controls'), 'Kein Autoplay mit Ton, oder muted + Bedienelemente.')
  }

  for (const t of root.querySelectorAll('table')) {
    if (attr(t, 'role') === 'presentation') continue
    const rows = t.querySelectorAll('tr')
    if (rows.length >= 3 && !t.querySelector('th')) add('table-headers', t, 'Tabelle mit Daten, aber ohne <th>-Kopfzellen.', '<tr><th scope="col">[Spalte 1]</th><th scope="col">[Spalte 2]</th></tr>', 'Kopfzellen mit <th scope="col|row"> auszeichnen; Layout-Tabellen mit role="presentation".')
  }

  for (const el of root.querySelectorAll('[aria-hidden=true]')) {
    const focusable = [el, ...el.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')].filter((x) => x.tagName && (/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(x.tagName) ? !(x.tagName === 'A' && !x.hasAttribute('href')) : x.hasAttribute('tabindex')) && attr(x, 'tabindex') !== '-1')
    if (focusable.length) add('aria-hidden-focusable', focusable[0], 'Element ist mit aria-hidden versteckt, aber per Tastatur erreichbar.', withAttr(openTag(focusable[0]), 'tabindex="-1"'), 'Versteckte Elemente aus der Tab-Reihenfolge nehmen oder aria-hidden entfernen.')
  }

  for (const el of root.querySelectorAll('[style]')) {
    const style = attr(el, 'style')
    const fg = parseColor(styleProp(style, 'color'))
    const bg = parseColor(styleProp(style, 'background-color') || styleProp(style, 'background'))
    if (fg && bg && text(el)) {
      const ratio = contrast(fg, bg)
      const size = parseFloat(styleProp(style, 'font-size') || '')
      const large = size >= 24 || (size >= 18.66 && /bold|[6-9]00/.test(styleProp(style, 'font-weight') || ''))
      const need = large ? 3 : 4.5
      if (ratio < need) add('color-contrast-inline', el, `Kontrast ${ratio.toFixed(2)}:1 (benötigt ${need}:1).`, `/* Beispiel mit ausreichendem Kontrast */\ncolor: #1f2937; background-color: ${styleProp(style, 'background-color') || '#ffffff'};`, 'Nur direkt am Element gesetzte Farben werden geprüft; CSS-Dateien erfordern eine Browser-Prüfung.')
    }
  }
  return out
}

/** Same-origin links for crawling. */
export function extractLinks(html, baseUrl) {
  const root = parse(html)
  const base = new URL(baseUrl)
  const links = new Set()
  for (const a of root.querySelectorAll('a[href]')) {
    try {
      const u = new URL(attr(a, 'href'), base)
      if (u.origin !== base.origin || !/^https?:$/.test(u.protocol)) continue
      if (/\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|mp4|mp3)$/i.test(u.pathname)) continue
      u.hash = ''
      links.add(u.toString())
    } catch { /* ignore invalid */ }
  }
  return [...links]
}
