// Minimal, safe Markdown renderer (no HTML injection): headings, lists, code, quotes, tables, links, emphasis.
import { Fragment } from 'react'

const SAFE_URL = /^(https?:\/\/|\/|#|mailto:)/i

function inline(text, keyBase = '') {
  const out = []
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)\s]+\))|(\*[^*\s][^*]*\*)|(_[^_\s][^_]*_)/g
  let last = 0
  let m
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    const k = `${keyBase}-${i++}`
    if (m[1]) out.push(<code key={k}>{t.slice(1, -1)}</code>)
    else if (m[2]) out.push(<strong key={k}>{inline(t.slice(2, -2), k)}</strong>)
    else if (m[3]) {
      const [, label, url] = t.match(/\[([^\]]+)\]\(([^)\s]+)\)/)
      out.push(SAFE_URL.test(url)
        ? <a key={k} href={url} target={url.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{label}</a>
        : label)
    } else out.push(<em key={k}>{inline(t.slice(1, -1), k)}</em>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export default function Markdown({ children, className = 'prose-junis' }) {
  const src = String(children ?? '').replace(/\r\n/g, '\n')
  const lines = src.split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('```')) {
      const buf = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++])
      i++
      blocks.push(<pre key={blocks.length}><code>{buf.join('\n')}</code></pre>)
      continue
    }
    const h = line.match(/^(#{1,4})\s+(.*)/)
    if (h) {
      const Tag = `h${Math.min(3, h[1].length)}`
      blocks.push(<Tag key={blocks.length}>{inline(h[2], `h${i}`)}</Tag>)
      i++
      continue
    }
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const head = cells(line)
      i += 2
      const rows = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]))
      blocks.push(
        <table key={blocks.length}>
          <thead><tr>{head.map((c, j) => <th key={j}>{inline(c, `th${j}`)}</th>)}</tr></thead>
          <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j}>{inline(c, `td${ri}${j}`)}</td>)}</tr>)}</tbody>
        </table>,
      )
      continue
    }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line)
      const items = []
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ''))
        i++
      }
      const List = ordered ? 'ol' : 'ul'
      blocks.push(<List key={blocks.length}>{items.map((it, j) => <li key={j}>{inline(it, `li${i}${j}`)}</li>)}</List>)
      continue
    }
    if (/^>\s?/.test(line)) {
      const buf = []
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''))
      blocks.push(<blockquote key={blocks.length}>{inline(buf.join(' '), `q${i}`)}</blockquote>)
      continue
    }
    if (!line.trim()) {
      i++
      continue
    }
    const buf = []
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|>\s?|\s*([-*•]|\d+[.)])\s+)/.test(lines[i])) buf.push(lines[i++])
    blocks.push(
      <p key={blocks.length}>
        {buf.map((b, j) => <Fragment key={j}>{j > 0 && <br />}{inline(b, `p${i}${j}`)}</Fragment>)}
      </p>,
    )
  }
  return <div className={className}>{blocks}</div>
}
