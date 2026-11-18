import type { CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BigTitle, DotChips, EmptyState, Fab, Ghost, IconBack, IconCalendar, Pill, StoryDayTopBar, StoryTopBar, Ticket } from '@/components/story'
import { DayRetry, DayTicket } from '@/components/day/Day'
import { LockSheet } from '@/features/auth/LockSheet'
import { useMe } from '@/features/auth/session'
import { useLockSheet } from '@/features/auth/useLockSheet'
import { scheduleKindLabel } from '@/features/content/labels'
import { SCHEDULE_KINDS, useScheduleRange, type ScheduleSummary } from '@/features/schedules/api'
import {
  addMonths,
  coversDay,
  daysInMonth,
  monthKey,
  parseMonth,
  todayKst,
  ymd,
} from '@/features/schedules/calendar'
import { StarCalendar } from '@/features/schedules/StarCalendar'
import { colorOf, SCHEDULE_COLORS } from '@/lib/categoryColors'
import { formatDay } from '@/lib/time'
import '@/styles/schedules.css'

/** 캘린더 (S30) — 월간 달력 + 아래 목록. 날짜를 고르면 그날 일정만. 달 · 날짜 · 분류는 주소에 둔다(뒤로 와도 유지) */
export function SchedulesPage() {
  const { data: me } = useMe()
  const member = me != null
  const [params, setParams] = useSearchParams()
  const lock = useLockSheet()

  const today = todayKst()
  const current = parseMonth(params.get('month')) ?? parseMonth(today.slice(0, 7))!
  const { year, month } = current
  const from = ymd(year, month, 1)
  const to = ymd(year, month, daysInMonth(year, month))
  const rawDay = params.get('day')
  const day = rawDay && rawDay >= from && rawDay <= to ? rawDay : null
  const rawKind = params.get('kind')
  const kind = rawKind && (SCHEDULE_KINDS as readonly string[]).includes(rawKind) ? rawKind : null

  const range = useScheduleRange(from, to, kind, member)
  const schedules = range.data ?? []
  const shown = day ? schedules.filter((s) => coversDay(s, day)) : schedules

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value == null) next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true, preventScrollReset: true })
  }

  function move(diff: number) {
    const target = addMonths(year, month, diff)
    const key = monthKey(target.year, target.month)
    // 이번 달로 돌아오면 주소에서 뺀다
    update({ month: key === today.slice(0, 7) ? null : key, day: null })
  }

  const writePath = day ? `${WRITE_PATH}?date=${day}` : WRITE_PATH
  const dayLabel = day ? `${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일` : `${month}월`

  if (!member) {
    return (
      <div className="gh-dayback pb-28">
        <StoryDayTopBar loginTo="/login?next=%2Fschedules" />
        <BigTitle
          items={[
            { to: '/schedules', label: '일정', on: true },
            { to: '/recruits', label: '모집' },
            { to: '/events', label: '이벤트' },
          ]}
        />
        <p className="gh-gdesc">
          <b>일정 제목</b>은 누구나 볼 수 있어요. 자세한 내용은 부원이 되면 열려요.
        </p>
        <div className="gh-gmonth">
          <button type="button" aria-label="이전 달" onClick={() => move(-1)}>
            <IconBack />
          </button>
          <b aria-live="polite">
            {year}년 {month}월
          </b>
          <button type="button" aria-label="다음 달" onClick={() => move(1)}>
            <IconBack className="rotate-180" />
          </button>
        </div>
        {range.isPending && (
          <div className="space-y-2.5 px-4 pt-[18px]" aria-label="불러오는 중">
            {[0, 1].map((i) => (
              <div key={i} className="gh-day-skeleton" />
            ))}
          </div>
        )}
        {range.isError && !range.data && (
          <div className="px-4 pt-[18px]">
            <DayRetry onRetry={() => range.refetch()}>일정을 불러오지 못했어요.</DayRetry>
          </div>
        )}
        {range.isSuccess && schedules.length === 0 && (
          <div className="px-4 pt-[18px]">
            <EmptyState row pose="star" title="이번 달은 조용해요">
              새 일정이 뜨면 여기 걸어 둘게요.
            </EmptyState>
          </div>
        )}
        {schedules.length > 0 && (
          <div className="gh-glist">
            {schedules.map((s) => (
              <DayTicket
                key={s.id}
                startDate={s.startDate}
                endDate={s.endDate}
                category={scheduleKindLabel(s.kind)}
                official={s.isOfficial}
                title={s.title}
                onClick={() => lock.open(`/schedules/${s.id}`)}
              />
            ))}
          </div>
        )}
        <LockSheet next={lock.next} onClose={lock.close} title="일정 내용은 부원이 되면 열려요" />
      </div>
    )
  }

  const isThisMonth = today.slice(0, 7) === monthKey(year, month)
  const past = shown.filter((s) => (s.dDay ?? 0) < 0)
  const upcoming = shown.filter((s) => (s.dDay ?? 0) >= 0)

  return (
    <div className="pb-44">
      <div className="gh-ssky">
        <StoryTopBar unread={me.unreadNotificationCount} />
        <BigTitle
          items={[
            { to: '/schedules', label: '일정', on: true },
            { to: '/recruits', label: '모집' },
            { to: '/events', label: '이벤트' },
          ]}
        />
        <p className="gh-sdesc">다가오는 날은 별이 되어 떠 있어요</p>
        <Ghost pose="star" className="gh-speek" />
        <DotChips
          label="분류"
          value={kind ?? 'ALL'}
          onChange={(v) => update({ kind: v === 'ALL' ? null : v })}
          options={[
            { value: 'ALL', label: '전체' },
            ...SCHEDULE_KINDS.map((k) => ({ value: k, label: scheduleKindLabel(k), color: colorOf(SCHEDULE_COLORS, k) })),
          ]}
        />
      </div>

      <StarCalendar year={year} month={month} today={today} selected={day} schedules={schedules} onSelect={(d) => update({ day: d })} onMove={move} />

      <h2 className="gh-ssh">
        {day ? `${dayLabel}의 별` : `${month}월의 은하수`}
        {range.isSuccess && !day && (
          <small>
            지나간 별 {past.length} · 떠오를 별 {upcoming.length}
          </small>
        )}
        {day && (
          <button type="button" onClick={() => update({ day: null })}>
            {month}월 전체 보기
          </button>
        )}
      </h2>

      {range.isPending && [0, 1].map((i) => <div key={i} className="gh-sskel" />)}

      {range.isError && !range.data && (
        <div className="px-4 pt-2">
          <EmptyState
            row
            pose="shh"
            title="일정을 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => range.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}

      {range.isSuccess && shown.length === 0 && (
        <div className="px-4 pt-2">
          <EmptyState row pose="star" title={day ? '이날은 뜬 별이 없어요' : '이번 달은 조용한 밤이에요'}>
            공모전이나 채용 일정을 알고 있다면 띄워 주세요.
          </EmptyState>
        </div>
      )}

      {shown.length > 0 && (
        <div className="gh-road">
          {past.map((s) => (
            <Link key={s.id} to={`/schedules/${s.id}`} className="gh-past">
              <div className="gh-t">
                <em style={{ '--c': colorOf(SCHEDULE_COLORS, s.kind) } as CSSProperties}>{scheduleKindLabel(s.kind)}</em>
                {s.isOfficial && ' 공식'} · {dayRange(s)}
                {s.place && ` · ${s.place}`}
              </div>
              <b>{s.title}</b>
              <span className="gh-x">지남</span>
            </Link>
          ))}
          {isThisMonth && !day && (
            <div className="gh-now">
              <Ghost pose="lantern" />
              <div>
                오늘 · {formatDay(today)}
                <small>여기서부터 별이 떠 있어요</small>
              </div>
            </div>
          )}
          {upcoming.map((s) => (
            <div key={s.id} className="gh-tw">
              <Ticket
                to={`/schedules/${s.id}`}
                color={colorOf(SCHEDULE_COLORS, s.kind)}
                category={scheduleKindLabel(s.kind)}
                official={s.isOfficial}
                title={s.title}
                when={[dayRange(s), s.place].filter(Boolean).join(' · ')}
                dday={dDayText(s.dDay)}
                ddayCaption={s.endDate && s.endDate !== s.startDate ? '마감까지' : '남았어요'}
              />
            </div>
          ))}
        </div>
      )}

      {/* 일정 등록 — 하단 탭 위에 떠 있다 */}
      <Fab to={writePath} icon={<IconCalendar />}>
        날 하나 띄우기
      </Fab>
    </div>
  )
}

const WRITE_PATH = '/schedules/new'

function dDayText(dDay: number | undefined): string | undefined {
  if (dDay == null) return undefined
  return dDay === 0 ? 'D-DAY' : `D-${dDay}`
}

/** "11.16(월) ~ 11.30(월)" (제목 글꼴에 en dash가 없어 ~) */
function dayRange(s: ScheduleSummary): string {
  return s.endDate && s.endDate !== s.startDate ? `${formatDay(s.startDate)} ~ ${formatDay(s.endDate)}` : formatDay(s.startDate)
}
