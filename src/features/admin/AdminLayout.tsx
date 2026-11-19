import { NavLink, Outlet } from 'react-router'
import { Ghost, StorySubPage } from '@/components/story'
import { ADMIN_BASE } from '@/features/admin/api'
import { useMe } from '@/features/auth/session'
import { NotFoundPage } from '@/pages/NotFoundPage'
import '@/styles/ops.css'

const TABS = [
  { to: ADMIN_BASE, label: '에러', end: true },
  { to: `${ADMIN_BASE}/batches`, label: '배치' },
  { to: `${ADMIN_BASE}/ai`, label: 'AI' },
  { to: `${ADMIN_BASE}/tools`, label: '내보내기 · 계정' },
]

/** 어드민 (S80) — 개발자만. 다른 사람에게는 없는 주소처럼 보인다 (서버도 404) */
export function AdminLayout() {
  const { data: me, isPending } = useMe()
  if (isPending) return null
  if (me?.role !== 'DEV') return <NotFoundPage />

  return (
    <StorySubPage fallback="/" className="gh-ops">
      <div className="gh-ops-sky">
        <div className="gh-ops-ttl">
          <h1>어드민</h1>
          <p>마을 지하 기계실 · 개발자만</p>
        </div>
        <Ghost pose="glass" className="gh-ops-peek" />
        <nav aria-label="어드민 메뉴" className="gh-ops-menu">
          {TABS.map((t) => (
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
  )
}
