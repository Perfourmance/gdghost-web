import { Bookmark, CalendarDays, House, MessageCircle, MessagesSquare, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

interface Tab {
  to: string
  label: string
  icon: LucideIcon
}

// 정의서의 하단 탭 5개. 주소는 백엔드가 만드는 링크(/questions/{id} 등)와 맞춘다
const TABS: Tab[] = [
  { to: '/', label: '홈', icon: House },
  { to: '/questions', label: '질문', icon: MessageCircle },
  { to: '/schedules', label: '일정', icon: CalendarDays },
  { to: '/shares', label: '공유', icon: Bookmark },
  { to: '/feed', label: '피드', icon: MessagesSquare },
]

function tabClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex flex-1 flex-col items-center justify-center gap-1 text-[11px]',
    isActive ? 'font-bold text-brand-text' : 'text-muted-foreground',
  )
}

export function BottomTabs() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-card pb-[env(safe-area-inset-bottom)]" aria-label="주 메뉴">
      <ul className="mx-auto flex h-16 max-w-md">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex flex-1">
            <NavLink to={to} end={to === '/'} className={tabClass}>
              <Icon className="size-6" aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
