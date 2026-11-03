import { cn } from '@/lib/utils'

/** GDGhost 로고 — "GDG"는 파랑, "host"는 본문 글씨색 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('font-bold tracking-tight', className)}>
      <span className="text-brand">GDG</span>
      <span className="text-title">host</span>
    </span>
  )
}
