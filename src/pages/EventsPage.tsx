import { Link } from 'react-router'
import { SegmentTabs } from '@/components/layout/SegmentTabs'
import { SCHEDULE_SEGMENTS } from '@/components/layout/segments'
import { BigTitle, EmptyState, Ghost, IconCamera, IconPeople, Pill, StoryTopBar } from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { useEventList, type EventState, type EventSummary } from '@/features/events/api'
import { todayKst } from '@/features/schedules/calendar'
import { formatDay } from '@/lib/time'
import { cn } from '@/lib/utils'
import '@/styles/schedules.css'

const SECTIONS: { state: EventState; title: string; count: string; empty?: string }[] = [
  { state: 'ONGOING', title: '지금 지나가는 별똥별', count: '진행 중' },
  { state: 'UPCOMING', title: '곧 올 별똥별', count: '예정' },
  { state: 'ENDED', title: '지나간 별똥별', count: '지난 이벤트' },
]
const STATE_TEXT: Record<EventState, string> = { ONGOING: '진행 중', UPCOMING: '예정', ENDED: '지난 이벤트' }
const STATE_CLASS: Record<EventState, string> = { ONGOING: 'is-live', UPCOMING: 'is-soon', ENDED: 'is-gone' }

/** 이벤트 목록 (S35) — 시안 event-final '별똥별 지도'. 진행 중 · 예정 · 지난 이벤트, 내 인증 횟수 (F5-05) */
export function EventsPage() {
  const { data: me } = useMe()
  const list = useEventList(me != null)

  if (!me) {
    return (
      <div className="pb-4">
        <h1 className="sr-only">이벤트</h1>
        <SegmentTabs items={SCHEDULE_SEGMENTS} label="일정 탭" />
        <div className="mt-6">
          <LockPanel next="/events" title="이벤트는 부원만 볼 수 있어요." buttonText="로그인하고 이벤트 보기" />
        </div>
      </div>
    )
  }

  return (
    <div className="pb-28">
      <div className="gh-ev-top">
        <StoryTopBar unread={me.unreadNotificationCount} />
        <Ghost pose="star" className="gh-speek" />
        <BigTitle
          items={[
            { to: '/schedules', label: '일정' },
            { to: '/recruits', label: '모집' },
            { to: '/events', label: '이벤트', on: true },
          ]}
        />
      </div>

      {list.isPending && <div className="gh-sskel !h-56" aria-label="불러오는 중" />}
      {list.isError && (
        <div className="px-4 pt-6">
          <EmptyState
            row
            pose="shh"
            title="이벤트를 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => list.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}
      {list.data && list.data.length === 0 && (
        <div className="px-4 pt-6">
          <EmptyState pose="star" title="아직 별똥별이 없어요">
            운영진이 이벤트를 열면 여기 지나가요.
          </EmptyState>
        </div>
      )}

      {list.data && list.data.length > 0 && (
        <>
          <EventMap events={list.data} />
          {SECTIONS.map(({ state, title, count }) => {
            const events = list.data.filter((e) => e.state === state)
            if (events.length === 0) return null
            return (
              <section key={state}>
                <h2 className="gh-esh">
                  {title}
                  <small>
                    {count} {events.length}
                  </small>
                </h2>
                <div className="gh-ecards">
                  {events.map((e) => (
                    <EventCard key={e.id} event={e} />
                  ))}
                </div>
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}

function dayRange(e: EventSummary) {
  return e.endDate && e.endDate !== e.startDate ? `${formatDay(e.startDate)} ~ ${formatDay(e.endDate)}` : formatDay(e.startDate)
}

function EventCard({ event: e }: { event: EventSummary }) {
  const mine = e.my.approvedCount > 0 || e.my.pendingCount > 0
  return (
    <Link to={`/events/${e.id}`} className={cn('gh-ec', STATE_CLASS[e.state])}>
      <div className="gh-top">
        <h3>{e.name}</h3>
        <span className={cn('gh-est', STATE_CLASS[e.state])}>{STATE_TEXT[e.state] ?? '이벤트'}</span>
      </div>
      <div className="gh-m">
        <span>{dayRange(e)}</span>
        <span aria-label={`${e.participantCount}명 참여`}>
          <IconPeople />
          {e.participantCount}
        </span>
        {mine && (
          <span className="gh-me">
            <IconCamera />내 인증 {e.my.approvedCount}
            {e.my.pendingCount > 0 && ` · 대기 ${e.my.pendingCount}`}
          </span>
        )}
      </div>
    </Link>
  )
}

const DAY = 86_400_000
const toDay = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY)

/** 별똥별 지도 — 가로 = 날짜(앞뒤 달 포함), 줄마다 이벤트 하나. 진행 중 = 오늘까지 앰버 꼬리 + 별 머리 */
function EventMap({ events }: { events: EventSummary[] }) {
  const todayStr = todayKst()
  const today = toDay(todayStr)
  // 오늘 기준 앞 2달 ~ 뒤 3달 안의 이벤트만, 최대 6줄
  const shown = events
    .filter((e) => toDay(e.endDate ?? e.startDate) >= today - 62 && toDay(e.startDate) <= today + 92)
    .sort((a, b) => toDay(a.startDate) - toDay(b.startDate))
    .slice(0, 6)
  if (shown.length === 0) return null

  const startDates = shown.map((e) => new Date(`${e.startDate}T00:00:00Z`))
  const thisMonth = Date.parse(`${todayStr.slice(0, 7)}-01T00:00:00Z`)
  const first = new Date(Math.min(...startDates.map((d) => d.getTime()), thisMonth))
  const from = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1) / DAY
  const lastEnd = Math.max(...shown.map((e) => toDay(e.endDate ?? e.startDate)), today)
  const lastDate = new Date(lastEnd * DAY)
  const to = Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth() + 1, 1) / DAY
  const span = to - from
  const x = (d: number) => `${((d - from) / span) * 100}%`

  const months: { label: string; at: number; year: number; month: number }[] = []
  for (let d = new Date(from * DAY); d.getTime() / DAY < to; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    months.push({ label: `${d.getUTCMonth() + 1}월`, at: d.getTime() / DAY, year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 })
  }

  return (
    <section className="gh-map" aria-label="이벤트 기간 지도">
      <div className="gh-map-t">
        <b>별똥별 지도</b>
        <small>
          {months[0]?.label} ~ {months[months.length - 1]?.label}
        </small>
      </div>
      <div className="gh-plot" style={{ height: 40 + shown.length * 38 }}>
        {months.map((m) => (
          <div key={`${m.year}-${m.month}`} className="gh-mon" style={{ left: x(m.at) }}>
            <span>{m.label}</span>
          </div>
        ))}
        {shown.map((e, i) => {
          const a = toDay(e.startDate)
          const b = toDay(e.endDate ?? e.startDate) + 1
          const k = e.state === 'ONGOING' ? 'is-live' : e.state === 'UPCOMING' ? 'is-soon' : 'is-past'
          const done = `${(Math.min(Math.max(today - a, 0), b - a) / (b - a)) * 100}%`
          return (
            <div key={e.id} className={cn('gh-tr', k)} style={{ left: x(a), width: `${((b - a) / span) * 100}%`, top: 40 + i * 38 }}>
              <span className="gh-lb">
                {e.name}
                {e.my.approvedCount > 0 && ` · 내 인증 ${e.my.approvedCount}`}
              </span>
              {k === 'is-live' && (
                <>
                  <i className="gh-done" style={{ width: done }} />
                  <i className="gh-head" style={{ left: done }} />
                </>
              )}
            </div>
          )
        })}
        <div className="gh-today" style={{ left: x(today) }}>
          <span>오늘</span>
        </div>
      </div>
    </section>
  )
}
