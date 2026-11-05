import { Link } from 'react-router'
import { recruitKindLabel } from '@/features/content/labels'
import type { RecruitPerson, RecruitSummary } from '@/features/recruits/api'
import { formatMeetAt } from '@/features/recruits/format'
import { cn } from '@/lib/utils'

/** 모집중 · 마감 표시 */
export function RecruitStateBadge({ state }: { state: 'OPEN' | 'CLOSED' }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold',
        state === 'OPEN' ? 'bg-brand-soft text-brand-text' : 'bg-muted text-muted-foreground',
      )}
    >
      {state === 'OPEN' ? '모집중' : '마감'}
    </span>
  )
}

/** 모집 목록의 한 줄. 누르면 상세 시트 */
export function RecruitCard({ recruit, onOpen }: { recruit: RecruitSummary; onOpen: (id: number) => void }) {
  const closed = recruit.state === 'CLOSED'
  return (
    <button
      type="button"
      onClick={() => onOpen(recruit.id)}
      className={cn(
        'block w-full rounded-xl bg-card px-4 py-3.5 text-left transition-colors hover:bg-accent',
        closed && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-brand-text">{recruitKindLabel(recruit.kind)}</p>
        <RecruitStateBadge state={recruit.state} />
      </div>
      <p className="mt-1 line-clamp-2 text-[15px] leading-snug font-bold text-title">{recruit.title}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {formatMeetAt(recruit.meetAt)}
        <span aria-hidden> · </span>
        <span className="tabular-nums">
          {recruit.joinedCount} / {recruit.capacity}명
        </span>
        {(recruit.mine || recruit.joined) && (
          <>
            <span aria-hidden> · </span>
            <span className="font-bold text-brand-text">{recruit.mine ? '내가 연 모집' : '참여 중'}</span>
          </>
        )}
      </p>
    </button>
  )
}

/** 참여자 · 개설자 이름. 탈퇴했으면 링크 없이 '탈퇴한 부원' */
export function PersonName({ person, className }: { person: RecruitPerson; className?: string }) {
  if (person.nickname == null) return <span className={cn('text-muted-foreground', className)}>탈퇴한 부원</span>
  return (
    <Link to={`/members/${person.id}`} className={cn('hover:underline', className)}>
      {person.nickname}
    </Link>
  )
}
