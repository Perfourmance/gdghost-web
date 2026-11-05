import { CalendarPlus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Chip } from '@/components/Chip'
import { SegmentTabs } from '@/components/layout/SegmentTabs'
import { SCHEDULE_SEGMENTS } from '@/components/layout/segments'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockSheet } from '@/features/auth/LockSheet'
import { useMe } from '@/features/auth/session'
import { useLockSheet } from '@/features/auth/useLockSheet'
import { EmptyCard, ScheduleCard, type CardTarget } from '@/features/content/Cards'
import { scheduleKindLabel } from '@/features/content/labels'
import { SCHEDULE_KINDS, useScheduleRange } from '@/features/schedules/api'
import {
  addMonths,
  coversDay,
  daysInMonth,
  monthKey,
  parseMonth,
  todayKst,
  ymd,
} from '@/features/schedules/calendar'
import { MonthCalendar } from '@/features/schedules/MonthCalendar'

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

  const target: CardTarget = { member, onLocked: lock.open }
  const writePath = day ? `${WRITE_PATH}?date=${day}` : WRITE_PATH
  const dayLabel = day ? `${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일` : `${month}월`

  return (
    <div className="pb-20">
      <h1 className="sr-only">일정</h1>
      <SegmentTabs items={SCHEDULE_SEGMENTS} label="일정 탭" />

      <div className="-mx-4 mt-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex w-max gap-2">
          <Chip selected={kind == null} onClick={() => update({ kind: null })}>
            전체
          </Chip>
          {SCHEDULE_KINDS.map((k) => (
            <Chip key={k} selected={kind === k} onClick={() => update({ kind: kind === k ? null : k })}>
              {scheduleKindLabel(k)}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <MonthCalendar
          year={year}
          month={month}
          today={today}
          selected={day}
          schedules={schedules}
          onSelect={(d) => update({ day: d })}
          onMove={move}
        />
      </div>

      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-base font-bold text-title">{dayLabel} 일정</h2>
        {day && (
          <button type="button" className="text-sm text-muted-foreground" onClick={() => update({ day: null })}>
            {month}월 전체 보기
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {range.isPending && [0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px] w-full rounded-xl" />)}

        {range.isError && !range.data && (
          <div className="space-y-3 rounded-xl bg-card p-5 text-center" role="alert">
            <p className="text-sm">일정을 불러오지 못했어요.</p>
            <Button variant="secondary" onClick={() => range.refetch()}>
              다시 시도
            </Button>
          </div>
        )}

        {range.isSuccess && shown.length === 0 && (
          <EmptyCard>
            {day ? '이날은 일정이 없어요.' : '이번 달 일정이 없어요.'}
            {member && ' 공모전이나 채용 일정을 알고 있다면 등록해 주세요.'}
          </EmptyCard>
        )}

        {shown.map((s) => (
          <ScheduleCard key={s.id} schedule={s} target={target} />
        ))}
      </div>

      {/* 일정 등록 — 하단 탭 위에 떠 있다. 비회원은 잠금 안내 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 mx-auto flex max-w-md justify-end px-4">
        {member ? (
          <Link to={writePath} className={writeButtonClass}>
            <CalendarPlus aria-hidden />
            일정 등록
          </Link>
        ) : (
          <button type="button" className={writeButtonClass} onClick={() => lock.open(WRITE_PATH)}>
            <CalendarPlus aria-hidden />
            일정 등록
          </button>
        )}
      </div>

      {lock.next === WRITE_PATH ? (
        <LockSheet
          next={lock.next}
          onClose={lock.close}
          title="일정은 부원만 등록할 수 있어요"
          description="GDGoC SMU 부원으로 로그인하면 공모전 · 채용 일정을 함께 모을 수 있어요."
        />
      ) : (
        <LockSheet next={lock.next} onClose={lock.close} title="일정 내용은 부원만 볼 수 있어요" />
      )}
    </div>
  )
}

const WRITE_PATH = '/schedules/new'

const writeButtonClass = buttonVariants({
  size: 'lg',
  className: 'pointer-events-auto h-12 rounded-full px-5 text-[15px] font-bold shadow-lg',
})
