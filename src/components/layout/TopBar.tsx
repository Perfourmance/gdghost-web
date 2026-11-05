import { Bell, Search, UserRound } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Logo } from '@/components/Logo'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useMe } from '@/features/auth/session'
import { loginPath, useLogout } from '@/features/auth/useAuthActions'

const iconLinkClass = 'relative flex size-10 items-center justify-center rounded-lg text-foreground hover:bg-accent'

/** 상단 바 — 비회원은 로그인 버튼, 회원은 검색 · 알림 · 내 프로필 */
export function TopBar() {
  const { data: me } = useMe()
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useLogout()

  return (
    <header className="sticky top-0 z-10 border-b bg-card">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <Link to="/" aria-label="홈으로">
          <Logo className="text-xl" />
        </Link>

        {me ? (
          <nav className="flex items-center gap-1" aria-label="내 메뉴">
            <Link to="/search" className={iconLinkClass} aria-label="검색">
              <Search className="size-5" />
            </Link>
            <Link
              to="/notifications"
              className={iconLinkClass}
              aria-label={me.unreadNotificationCount > 0 ? `알림 ${me.unreadNotificationCount}개 안 읽음` : '알림'}
            >
              <Bell className="size-5" />
              {me.unreadNotificationCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] leading-4 font-bold text-white">
                  {me.unreadNotificationCount > 99 ? '99+' : me.unreadNotificationCount}
                </span>
              )}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className={iconLinkClass} aria-label="내 메뉴 열기">
                <UserRound className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => navigate(`/members/${me.id}`)}>내 프로필</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>설정</DropdownMenuItem>
                <DropdownMenuItem disabled={logout.isPending} onClick={() => logout.mutate()}>
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        ) : (
          <Link to={loginPath(location.pathname + location.search)} className="px-2 py-1 text-sm font-bold text-brand-text">
            로그인
          </Link>
        )}
      </div>
    </header>
  )
}
