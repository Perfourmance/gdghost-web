import { Link } from 'react-router'
import type { MemberSummary } from '@/features/member/api'
import { memberStatusLabel, positionLabel } from '@/features/member/labels'
import { StaffBadge } from '@/features/member/StaffBadge'

/** 시안 08 카드 — `3기 · 졸업` → 닉네임 → 포지션 · 관심 분야 · 답변 수, 근황 한 줄 */
export function MemberCard({ member }: { member: MemberSummary }) {
  const meta = [positionLabel(member.position), ...member.interestTags.slice(0, 2), `답변 ${member.answerCount}`]
  return (
    <Link to={`/members/${member.id}`} className="block rounded-xl bg-card px-4 py-3.5 transition-colors hover:bg-accent">
      <p className="text-xs font-bold text-brand-text">
        {member.generation}기 · {memberStatusLabel(member.status)}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-[15px] font-bold text-title">
        {member.nickname}
        {member.isStaff && <StaffBadge />}
      </p>
      {member.statusNote && <p className="mt-1 line-clamp-1 text-sm text-foreground">{member.statusNote}</p>}
      <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        {meta.map((item, i) => (
          <span key={`${i}-${item}`} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>·</span>}
            {item}
          </span>
        ))}
        {member.acceptCoffee && (
          <>
            <span aria-hidden>·</span>
            <span className="text-brand-text">커피챗 받는 중</span>
          </>
        )}
      </p>
    </Link>
  )
}
