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

/** 모집 목록의 한 장 — 자리 = 등불(앉은 자리는 켜짐). 누르면 상세 시트 */
export function RecruitCard({ recruit, onOpen }: { recruit: RecruitSummary; onOpen: (id: number) => void }) {
  const closed = recruit.state === 'CLOSED'
  const seats = Math.min(recruit.capacity, 12)
  return (
    <button
      type="button"
      onClick={() => onOpen(recruit.id)}
      className={cn('gh-rc', closed && 'is-closed', (recruit.mine || recruit.joined) && 'is-mine')}
    >
      <div className="gh-top">
        <span className="gh-lab">{recruitKindLabel(recruit.kind)}</span>
        <span className={cn('gh-est', !closed && 'is-live')}>{closed ? '마감' : '모집 중'}</span>
      </div>
      <h3>{recruit.title}</h3>
      <p className="gh-when">{formatMeetAt(recruit.meetAt)}</p>
      <div className="gh-seats" aria-label={`${recruit.capacity}명 중 ${recruit.joinedCount}명 참여`}>
        {Array.from({ length: seats }, (_, i) => (
          <i key={i} className={cn(i < recruit.joinedCount && 'is-on')} aria-hidden />
        ))}
        <span>
          {recruit.joinedCount} / {recruit.capacity}
        </span>
        {(recruit.mine || recruit.joined) && <span className="is-me">{recruit.mine ? '내가 연 모집' : '참여 중'}</span>}
      </div>
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
