import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cx } from './cx'

type Variant = 'ghost' | 'solid' | 'accent' | 'outline'
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'icon'
  active?: boolean
}

export function Button({ variant = 'ghost', size = 'md', active, className, children, ...rest }: ButtonProps) {
  const v: Record<Variant, string> = {
    ghost: 'text-fg-2 hover:text-fg hover:bg-bg-3',
    solid: 'bg-bg-3 text-fg hover:bg-line border border-line',
    accent: 'bg-accent text-[#0b0d12] hover:brightness-105 font-medium',
    outline: 'border border-line text-fg-2 hover:text-fg hover:border-line-2',
  }
  const s = {
    sm: 'h-7 px-2.5 text-[12px] gap-1.5 rounded-md',
    md: 'h-8 px-3 text-[13px] gap-2 rounded-lg',
    icon: 'h-8 w-8 rounded-lg justify-center',
  }
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center select-none whitespace-nowrap transition-colors duration-100 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        v[variant],
        s[size],
        active && 'bg-bg-3 text-fg',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; title?: string }[]
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div className={cx('inline-flex items-center rounded-lg bg-bg-3 p-0.5 border border-line', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          title={o.title}
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-md transition-colors duration-100 select-none whitespace-nowrap',
            size === 'sm' ? 'h-6 px-2 text-[11.5px]' : 'h-7 px-3 text-[12.5px]',
            o.value === value ? 'bg-bg-2 text-fg shadow-sm' : 'text-fg-3 hover:text-fg-2',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] uppercase tracking-[0.08em] text-fg-3 font-medium">{children}</span>
      {hint !== undefined && <span className="font-mono text-[11px] text-fg-2 tabular-nums">{hint}</span>}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-1 text-[12.5px] text-fg-2 hover:text-fg"
    >
      <span>{label}</span>
      <span className={cx('relative h-4 w-7 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-line-2')}>
        <span
          className={cx(
            'absolute top-0.5 h-3 w-3 rounded-full bg-bg-2 shadow transition-transform',
            checked ? 'translate-x-3.5' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}

export function Divider() {
  return <div className="h-px w-full bg-line" />
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line bg-bg-3 px-1 font-mono text-[10px] text-fg-3">{children}</kbd>
}

