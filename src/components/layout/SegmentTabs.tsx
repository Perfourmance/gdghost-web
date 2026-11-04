import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

/**
 * 탭 안의 세그먼트 — 질문 탭은 `질문 / 부원`, 일정 탭은 `일정 / 모집 / 이벤트` (IA 2장).
 * 화면 제목 자리에 큰 글씨로 나란히, 고른 쪽만 진하게
 */
export function SegmentTabs({ items, label }: { items: { to: string; label: string }[]; label: string }) {
  return (
    <nav aria-label={label} className="flex gap-4">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          replace
          className={({ isActive }) =>
            cn('text-xl font-bold transition-colors', isActive ? 'text-title' : 'text-muted-foreground hover:text-title')
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
