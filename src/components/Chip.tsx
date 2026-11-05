import { Circle, CircleCheck } from 'lucide-react'
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

/** 켜고 끄는 글씨 필터 — 동그라미 체크로 누를 수 있는 것임을 보여 준다. 한 번 더 누르면 해제 */
export function FilterToggle({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: React.ReactNode }) {
  const Icon = checked ? CircleCheck : Circle
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 py-1.5 text-sm transition-colors',
        checked ? 'font-bold text-brand-text' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="size-4" aria-hidden />
      {children}
    </button>
  )
}
