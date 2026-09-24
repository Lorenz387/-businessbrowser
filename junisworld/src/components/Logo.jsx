import { useId } from 'react'

export function LogoMark({ className = 'size-7' }) {
  const id = `jw-g-${useId().replace(/:/g, '')}`
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38BDF8" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <circle cx="44" cy="11" r="7" fill="#2563EB" />
      <path d="M37 21h11v19c0 12-8.5 19-19.5 19S10 51.5 10 43l11-3.5c0 5 3.3 8.5 7.5 8.5S37 44.5 37 38z" fill={`url(#${id})`} />
    </svg>
  )
}

export default function Logo({ small }) {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <LogoMark className={small ? 'size-6' : 'size-7'} />
      <span className={small ? 'text-[15px] tracking-tight' : 'text-[17px] tracking-tight'}>
        <span className="font-bold">Junis</span>
        <span className="font-normal">World</span>
      </span>
    </span>
  )
}
