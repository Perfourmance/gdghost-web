import { Bookmark, CalendarDays, House, MessageCircle, MessagesSquare, type LucideIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import { cn } from '@/lib/utils'

interface Tab {
  to: string
  label: string
  icon: LucideIcon
  /** 이 탭에 속하는 다른 주소 (탭 안의 세그먼트) */
  also?: string[]
}

// 정의서의 하단 탭 5개. 주소는 백엔드가 만드는 링크(/questions/{id} 등)와 맞춘다
const TABS: Tab[] = [
  { to: '/', label: '홈', icon: House },
  { to: '/questions', label: '질문', icon: MessageCircle, also: ['/members'] },
  { to: '/schedules', label: '일정', icon: CalendarDays, also: ['/recruits', '/events'] },
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
  const { pathname } = useLocation()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-card pb-[env(safe-area-inset-bottom)]" aria-label="주 메뉴">
      <ul className="mx-auto flex h-16 max-w-md">
        {TABS.map(({ to, label, icon: Icon, also }) => (
          <li key={to} className="flex flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) => tabClass({ isActive: isActive || (also?.includes(pathname) ?? false) })}
            >
              <Icon className="size-6" aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
