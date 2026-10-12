import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = (props: P) => ({
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

export const Play = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 5v14l11-7z" fill="currentColor" stroke="none" />
  </svg>
)
export const Pause = (p: P) => (
  <svg {...base(p)}>
    <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
  </svg>
)
export const Pen = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)
export const Cursor = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 4l7.5 16 2.5-6.5L20.5 11z" />
  </svg>
)
export const Upload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </svg>
)
export const Download = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 4v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </svg>
)
export const Sun = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)
export const Moon = (p: P) => (
  <svg {...base(p)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
)
export const Cube = (p: P) => (
  <svg {...base(p)}>
    <path d="m12 2 8 4.5v11L12 22l-8-4.5v-11L12 2Z" />
    <path d="m4 6.5 8 4.5 8-4.5M12 11v11" />
  </svg>
)
export const Square = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
)
export const X = (p: P) => (
  <svg {...base(p)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)
export const Copy = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a1 1 0 0 1 1-1h10" />
  </svg>
)
export const Check = (p: P) => (
  <svg {...base(p)}>
    <path d="m5 12 5 5L20 7" />
  </svg>
)
export const Trash = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
)
export const Record = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
  </svg>
)
export const Chevron = (p: P) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)
export const Sigma = (p: P) => (
  <svg {...base(p)}>
    <path d="M18 5H6l6 7-6 7h12" />
  </svg>
)
export const Panel = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </svg>
)
export const Logo = (p: P) => (
  <svg width={22} height={22} viewBox="0 0 64 64" {...p}>
    <circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" strokeWidth="3" opacity=".35" />
    <circle cx="46" cy="24" r="10" fill="none" stroke="currentColor" strokeWidth="3" opacity=".6" />
    <circle cx="52" cy="17" r="4" fill="none" stroke="var(--accent)" strokeWidth="3" />
    <path d="M32 32 L46 24 L52 17 L55 14" stroke="var(--accent)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
  </svg>
)
