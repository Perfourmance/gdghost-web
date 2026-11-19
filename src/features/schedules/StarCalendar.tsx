import type { CSSProperties } from 'react'
import { IconBack } from '@/components/story'
import { coversDay, monthCells } from '@/features/schedules/calendar'
import type { ScheduleSummary } from '@/features/schedules/api'
import { colorOf, SCHEDULE_COLORS } from '@/lib/categoryColors'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/**
 * 밤하늘 달력 (schedule-final, F5-01). 일정이 있는 날 = 분류 색 별, 오늘 = 앰버 달.
 * 날짜를 누르면 그날만, 다시 누르면 선택 해제
 */
export function StarCalendar({
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
    <section className="gh-cal">
      <div className="gh-cal-h">
        <button type="button" onClick={() => onMove(-1)} aria-label="이전 달">
          <IconBack />
        </button>
        <b aria-live="polite">
          <small>{year}</small>
          {month}월의 밤하늘
        </b>
        <button type="button" onClick={() => onMove(1)} aria-label="다음 달">
          <IconBack className="rotate-180" />
        </button>
      </div>

      <div className="gh-cal-g">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={cn('gh-wd', i === 0 && 'is-sun')} aria-hidden>
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={`empty-${i}`} />
          const items = schedules.filter((s) => coversDay(s, day))
          // 분류마다 별 하나 (최대 3개)
          const kinds = [...new Set(items.map((s) => s.kind))].slice(0, 3)
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
              className={cn(day < today && 'is-past', isToday && 'is-today')}
            >
              <span>{date}</span>
              {kinds.length > 0 && (
                <div className="gh-st" aria-hidden>
                  {kinds.map((k) => (
                    <i key={k} style={{ '--c': colorOf(SCHEDULE_COLORS, k) } as CSSProperties} />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
