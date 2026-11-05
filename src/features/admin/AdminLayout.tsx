import { NavLink, Outlet } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { ADMIN_BASE } from '@/features/admin/api'
import { useMe } from '@/features/auth/session'
import { cn } from '@/lib/utils'
import { NotFoundPage } from '@/pages/NotFoundPage'

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
    <SubPageLayout fallback="/">
      <h1 className="text-[22px] leading-snug font-bold text-title">어드민</h1>
      <nav aria-label="어드민 메뉴" className="-mx-4 mt-3 overflow-x-auto border-b px-4 [scrollbar-width:none]">
        <ul className="flex w-max gap-4">
          {TABS.map((t) => (
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
  )
}
