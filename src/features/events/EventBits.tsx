import { Link } from 'react-router'
import type { CertificationState, EventState, EventSummary } from '@/features/events/api'
import { formatDayRange } from '@/lib/time'
import { cn } from '@/lib/utils'

const EVENT_STATE_TEXT: Record<EventState, string> = { ONGOING: '진행 중', UPCOMING: '예정', ENDED: '지난 이벤트' }

export function EventStateBadge({ state }: { state: EventState }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold',
        state === 'ONGOING' ? 'bg-brand-soft text-brand-text' : 'bg-muted text-muted-foreground',
      )}
    >
      {EVENT_STATE_TEXT[state] ?? '이벤트'}
    </span>
  )
}

/** 내 글에만 보이는 확인 대기 · 반려 표시 (인증된 글은 표시 없음) */
export function CertificationStateBadge({ state }: { state: CertificationState }) {
  if (state === 'APPROVED') return null
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold',
        state === 'REJECTED' ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground',
      )}
    >
      {state === 'REJECTED' ? '반려' : '확인 대기'}
    </span>
  )
}

export function EventCard({ event }: { event: EventSummary }) {
  const ended = event.state === 'ENDED'
  return (
    <Link
      to={`/events/${event.id}`}
      className={cn('block rounded-xl bg-card px-4 py-3.5 transition-colors hover:bg-accent', ended && 'opacity-70')}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-[15px] leading-snug font-bold text-title">{event.name}</p>
        <EventStateBadge state={event.state} />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {formatDayRange(event.startDate, event.endDate)}
        <span aria-hidden> · </span>
        {event.participantCount}명 참여
      </p>
      {(event.my.approvedCount > 0 || event.my.pendingCount > 0) && (
        <p className="mt-1 text-xs font-bold text-brand-text">
          내 인증 {event.my.approvedCount}회
          {event.my.pendingCount > 0 && (
            <span className="font-normal text-muted-foreground"> · 확인 대기 {event.my.pendingCount}건</span>
          )}
        </p>
      )}
    </Link>
  )
}
