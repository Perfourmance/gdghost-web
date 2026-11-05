import { ChevronLeft, ChevronRight } from 'lucide-react'
import { coversDay, monthCells } from '@/features/schedules/calendar'
import type { ScheduleSummary } from '@/features/schedules/api'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 월간 달력 (F5-01). 일정이 있는 날은 점, 날짜를 누르면 그날만. 다시 누르면 선택 해제 */
export function MonthCalendar({
  year,
  month,
  today,
  selected,
  schedules,
  onSelect,
  onMove,
}: {
  year: number
  month: number
  today: string
  selected: string | null
  schedules: ScheduleSummary[]
  onSelect: (day: string | null) => void
  onMove: (diff: number) => void
}) {
  const cells = monthCells(year, month)

  return (
    <div className="rounded-2xl bg-card px-3 pt-3 pb-2">
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => onMove(-1)}
          aria-label="이전 달"
          className="flex size-9 items-center justify-center rounded-lg hover:bg-accent"
        >
          <ChevronLeft className="size-5" />
        </button>
        <p className="text-base font-bold text-title" aria-live="polite">
          {year}년 {month}월
        </p>
        <button
          type="button"
          onClick={() => onMove(1)}
          aria-label="다음 달"
          className="flex size-9 items-center justify-center rounded-lg hover:bg-accent"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 text-center text-[11px] text-muted-foreground" aria-hidden>
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={cn('py-1', i === 0 && 'text-destructive/80')}>
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <span key={`empty-${i}`} />
          const items = schedules.filter((s) => coversDay(s, day))
          const soon = items.some((s) => s.deadlineSoon)
          const isSelected = day === selected
          const isToday = day === today
          const date = Number(day.slice(8))
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(isSelected ? null : day)}
              aria-pressed={isSelected}
              aria-label={`${month}월 ${date}일${isToday ? ' 오늘' : ''}${items.length ? `, 일정 ${items.length}개` : ''}`}
              className="flex h-11 flex-col items-center justify-center gap-0.5"
            >
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-full text-sm tabular-nums',
                  isSelected
                    ? 'bg-primary font-bold text-primary-foreground'
                    : isToday
                      ? 'font-bold text-brand-text ring-1 ring-brand-text'
                      : 'text-foreground',
                )}
              >
                {date}
              </span>
              <span
                aria-hidden
                className={cn(
                  'size-1 rounded-full',
                  items.length === 0 ? 'bg-transparent' : soon ? 'bg-brand-text' : 'bg-muted-foreground/60',
                )}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
