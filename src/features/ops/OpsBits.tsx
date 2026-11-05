import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button, buttonVariants } from '@/components/ui/button'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { cn } from '@/lib/utils'

/** 운영 페이지 탭 (IA S70–S76) */
const OPS_TABS = [
  { to: '/ops', label: '홈', end: true },
  { to: '/ops/notices', label: '공지' },
  { to: '/ops/events', label: '이벤트' },
  { to: '/ops/certifications', label: '인증 확인' },
  { to: '/ops/reports', label: '신고' },
  { to: '/ops/routing', label: '라우팅' },
  { to: '/ops/members', label: '부원' },
  { to: '/ops/invite-codes', label: '초대 코드' },
]

/** 운영진만 — 로그인 안 했으면 잠금, 운영진이 아니면 안내 (서버도 403) */
export function OpsGuard({ children }: { children: ReactNode }) {
  const { data: me, isPending } = useMe()
  const location = useLocation()
  // 앱 시작 때 RootLayout이 로딩 화면을 보여 주므로 여기서는 비워 둔다
  if (isPending) return null
  if (!me) {
    return (
      <SubPageLayout>
        <LockPanel next={location.pathname + location.search} title="운영 페이지는 운영진만 볼 수 있어요" />
      </SubPageLayout>
    )
  }
  if (me.role !== 'STAFF') {
    return (
      <SubPageLayout>
        <div className="rounded-2xl bg-card px-6 py-10 text-center">
          <p className="text-lg font-bold text-title">운영진만 볼 수 있어요</p>
          <p className="mt-1 text-sm text-muted-foreground">운영진으로 지정되면 설정에 `관리` 메뉴가 생겨요.</p>
          <Link to="/" replace className={buttonVariants({ size: 'lg', className: 'mt-6 h-12 w-full' })}>
            홈으로
          </Link>
        </div>
      </SubPageLayout>
    )
  }
  return <>{children}</>
}

/** 운영 페이지 틀 — 제목 + 가로 탭 + 내용 */
export function OpsLayout() {
  return (
    <OpsGuard>
      <SubPageLayout fallback="/settings">
        <h1 className="text-[22px] leading-snug font-bold text-title">운영</h1>
        <nav aria-label="운영 메뉴" className="-mx-4 mt-3 overflow-x-auto border-b px-4 [scrollbar-width:none]">
          <ul className="flex w-max gap-4">
            {OPS_TABS.map((t) => (
              <li key={t.to}>
                <NavLink
                  to={t.to}
                  end={t.end}
                  replace
                  className={({ isActive }) =>
                    cn(
                      'block border-b-2 py-2.5 text-sm transition-colors',
                      isActive ? 'border-brand-text font-bold text-brand-text' : 'border-transparent text-muted-foreground',
                    )
                  }
                >
                  {t.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="pt-5 pb-12">
          <Outlet />
        </div>
      </SubPageLayout>
    </OpsGuard>
  )
}

/** 운영 목록의 쪽 번호 — 이전 · N / M · 다음 */
export function Pager({ page, size, total, onChange }: { page: number; size: number; total: number; onChange: (page: number) => void }) {
  const last = Math.max(0, Math.ceil(total / size) - 1)
  if (last === 0) return null
  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-sm">
      <Button variant="secondary" size="icon" disabled={page <= 0} onClick={() => onChange(page - 1)} aria-label="이전 쪽">
        <ChevronLeft />
      </Button>
      <span className="text-muted-foreground tabular-nums">
        {page + 1} / {last + 1}
      </span>
      <Button variant="secondary" size="icon" disabled={page >= last} onClick={() => onChange(page + 1)} aria-label="다음 쪽">
        <ChevronRight />
      </Button>
    </div>
  )
}

/** 운영 화면 상단의 작은 숫자 칸 */
export function StatTile({ label, value, to, strong }: { label: string; value: ReactNode; to?: string; strong?: boolean }) {
  const body = (
    <>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-xl font-bold tabular-nums', strong ? 'text-brand-text' : 'text-title')}>{value}</p>
    </>
  )
  const cls = 'block rounded-xl bg-card px-4 py-3'
  return to ? (
    <Link to={to} className={cn(cls, 'transition-colors hover:bg-accent')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
