import type { CSSProperties, ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { cn } from '@/lib/utils'
import { IconBack, IconBell, IconBookmark, IconCalendar, IconChat, IconFeed, IconHome, IconSearch, IconUser } from './icons'

/** GDGhost 글자 로고 (GDG 하늘색) */
export function StoryLogo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('gh-logo', className)} aria-label="홈으로">
      <b>GDG</b>host
    </Link>
  )
}

/** 메인 탭 화면 상단 — 로고 + 유리 캡슐(검색 · 알림[앰버 배지] · 내 정보) */
export function StoryTopBar({ unread = 0, menu }: { unread?: number; menu?: ReactNode }) {
  return (
    <header className="gh-top">
      <StoryLogo />
      <nav className="gh-cap" aria-label="내 메뉴">
        <Link to="/search" aria-label="검색">
          <IconSearch />
        </Link>
        <Link to="/notifications" aria-label={unread > 0 ? `읽지 않은 알림 ${unread}개` : '알림'}>
          <IconBell />
          {unread > 0 && <span className="gh-badge">{unread > 99 ? '99+' : unread}</span>}
        </Link>
        {menu ?? (
          <Link to="/settings" aria-label="내 정보">
            <IconUser />
          </Link>
        )}
      </nav>
    </header>
  )
}

/** 낮 상단 — 로고 + 밤색 로그인 알약 */
export function StoryDayTopBar({ loginTo = '/login' }: { loginTo?: string }) {
  return (
    <header className="gh-top">
      <StoryLogo />
      <Link to={loginTo} className="gh-login-pill">
        <i aria-hidden />
        로그인
      </Link>
    </header>
  )
}

/** 하위 화면 상단 — 뒤로 · 가운데 로고 · (메뉴) */
export function SubBar({ onBack, right }: { onBack: () => void; right?: ReactNode }) {
  return (
    <header className="gh-subbar">
      <button type="button" className="gh-nb" aria-label="뒤로" onClick={onBack}>
        <IconBack />
      </button>
      <div>
        <StoryLogo />
      </div>
      <div>{right}</div>
    </header>
  )
}

const TABS = [
  { to: '/', label: '홈', icon: IconHome },
  { to: '/questions', label: '질문', icon: IconChat, also: ['/members'] },
  { to: '/schedules', label: '일정', icon: IconCalendar, also: ['/recruits', '/events'] },
  { to: '/shares', label: '공유', icon: IconBookmark },
  { to: '/feed', label: '피드', icon: IconFeed },
]

/** 아래 탭 — 바닥 막대 + 선택 탭 위 앰버 별 점 (낮 / 밤 색만 다름) */
export function StoryTabs({ day = false, current }: { day?: boolean; /** 견본처럼 탭 주소가 아닌 곳에서 켤 탭 */ current?: string }) {
  const { pathname: here } = useLocation()
  const pathname = current ?? here
  return (
    <nav className={cn('gh-tabs', day && 'is-day')} aria-label="주 메뉴">
      {TABS.map(({ to, label, icon: Icon, also }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => cn(((current ? current === to : isActive) || also?.includes(pathname)) && 'is-on')}
        >
          <Icon />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

/** 큰 제목 전환 — "질문 · 부원"처럼 큰 글자가 곧 탭. 하나뿐이면 제목 + 앰버 점 */
export function BigTitle({ items }: { items: { to?: string; label: string; on?: boolean }[] }) {
  if (items.length === 1) {
    return (
      <div className="gh-big is-single">
        <h1 className="is-on">{items[0].label}</h1>
      </div>
    )
  }
  return (
    <nav className="gh-big">
      {items.map((it) => (
        <Link key={it.label} to={it.to ?? '#'} className={cn(it.on && 'is-on')} aria-current={it.on ? 'page' : undefined}>
          {it.label}
        </Link>
      ))}
    </nav>
  )
}

interface Option<T extends string> {
  value: T
  label: ReactNode
  color?: string
}

/** 글자 탭 — 선택 = 흰 글자 + 앰버 밑줄 */
export function TextTabs<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  return (
    <div className={cn('gh-texttabs', className)} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={cn(o.value === value && 'is-on')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** 분류 칩 — 색 점 둥근 칩, 선택 = 흰 바탕 밤색 글자 */
export function DotChips<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  return (
    <div className={cn('gh-dotchips', className)} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          className={cn(o.value === value && 'is-on')}
          style={{ '--c': o.color } as CSSProperties}
          onClick={() => onChange(o.value)}
        >
          {o.color && <i aria-hidden />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** 작은 테두리 칩 (켜고 끄기, 한 번 더 누르면 해제) */
export function LineChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[]
  value: T | null
  onChange: (v: T | null) => void
  label: string
}) {
  return (
    <div className="gh-linechips" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          className={cn(o.value === value && 'is-on')}
          onClick={() => onChange(o.value === value ? null : o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** 글자 정렬 — 선택 앞에 앰버 점 */
export function SortLinks<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="gh-sort" role="group" aria-label="정렬">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          className={cn(o.value === value && 'is-on')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** 작은 스위치 필터 (질문 목록의 내 질문 · 답변 기다리는 질문만) */
export function FilterSwitches({ items }: { items: { label: string; on: boolean; onToggle: () => void }[] }) {
  return (
    <div className="gh-filters">
      {items.map((it) => (
        <button key={it.label} type="button" aria-pressed={it.on} onClick={it.onToggle}>
          <i aria-hidden />
          {it.label}
        </button>
      ))}
    </div>
  )
}
