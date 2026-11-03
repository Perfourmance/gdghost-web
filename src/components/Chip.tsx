import { cn } from '@/lib/utils'

interface ChipProps {
  selected: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}

/** 고르는 칩 — 선택되면 파란 글씨 + 파란 기운 배경 (디자인 가이드 4장) */
export function Chip({ selected, disabled, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-md border px-3 py-1.5 text-sm transition-colors',
        selected
          ? 'border-brand-text bg-brand-soft font-bold text-brand-text'
          : 'border-border bg-card text-foreground hover:bg-accent',
        disabled && 'cursor-not-allowed opacity-40 hover:bg-card',
      )}
    >
      {children}
    </button>
  )
}
