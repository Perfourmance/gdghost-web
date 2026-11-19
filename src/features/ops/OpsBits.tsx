import type { ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { EmptyState, Ghost, IconBack, PillLink, StorySubPage } from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { cn } from '@/lib/utils'
import '@/styles/ops.css'

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
      <LockPanel next={location.pathname + location.search} title="운영진 전용 페이지" />
    )
  }
  if (me.role !== 'STAFF') {
    return (
      <StorySubPage>
        <div className="px-4 pt-8">
          <EmptyState pose="shh" title="운영진만 볼 수 있어요" action={<PillLink to="/" className="mt-3">홈으로</PillLink>}>
            운영진으로 지정되면 설정에 ‘운영 관리’가 생겨요.
          </EmptyState>
        </div>
      </StorySubPage>
    )
  }
  return <>{children}</>
}

/** 운영 페이지 틀 — 시안 admin-final '망루의 등불'. 하늘 + 제목 + 가로 메뉴 + 내용 */
export function OpsLayout() {
  return (
    <OpsGuard>
      <StorySubPage fallback="/settings" className="gh-ops">
        <div className="gh-ops-sky">
          <div className="gh-ops-ttl">
            <h1>운영</h1>
            <p>마을 망루에서 불빛을 살펴요</p>
          </div>
          <Ghost pose="lantern" className="gh-ops-peek" />
          <nav aria-label="운영 메뉴" className="gh-ops-menu">
            {OPS_TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} replace>
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="gh-ops-body gh-bridge">
          <Outlet />
        </div>
      </StorySubPage>
    </OpsGuard>
  )
}

/** 운영 목록의 쪽 번호 — 이전 · N / M · 다음 */
export function Pager({ page, size, total, onChange }: { page: number; size: number; total: number; onChange: (page: number) => void }) {
  const last = Math.max(0, Math.ceil(total / size) - 1)
  if (last === 0) return null
  return (
    <div className="gh-pager">
      <button type="button" disabled={page <= 0} onClick={() => onChange(page - 1)} aria-label="이전 쪽">
        <IconBack />
      </button>
      <span className="tabular-nums">
        {page + 1} / {last + 1}
      </span>
      <button type="button" disabled={page >= last} onClick={() => onChange(page + 1)} aria-label="다음 쪽">
        <IconBack className="rotate-180" />
      </button>
    </div>
  )
}

/** 운영 화면 상단의 작은 숫자 칸 */
export function StatTile({ label, value, to, strong }: { label: string; value: ReactNode; to?: string; strong?: boolean }) {
  const body = (
    <>
      <small>{label}</small>
      <b className="tabular-nums">{value}</b>
    </>
  )
  const cls = cn('gh-stat', strong && 'is-strong')
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
