import { useState } from 'react'
import { LinkifiedText } from '@/components/LinkifiedText'
import { FieldError, LoadingDots, Pill, StoryButton, StorySheet } from '@/components/story'
import { recruitKindLabel } from '@/features/content/labels'
import {
  recruitErrorMessage,
  useRecruitActions,
  useRecruitDetail,
  type RecruitDetail,
} from '@/features/recruits/api'
import { PersonName } from '@/features/recruits/RecruitBits'
import { formatMeetAt } from '@/features/recruits/format'
import { toApiError } from '@/lib/api'
import { useNowEveryMinute } from '@/lib/time'
import { cn } from '@/lib/utils'
import '@/styles/schedules.css'

/** 모집 상세 시트 (S33) — 참여 · 마감 전 참여 취소 · 개설자는 모집 닫기 (F5-04) */
export function RecruitSheet({ recruitId, onClose }: { recruitId: number | null; onClose: () => void }) {
  const detail = useRecruitDetail(recruitId)
  const notFound = detail.isError && toApiError(detail.error).code === 'NOT_FOUND'

  const title = detail.data?.title ?? (detail.isError ? (notFound ? '모집을 찾을 수 없어요' : '모집을 불러오지 못했어요') : '모집을 불러오는 중')

  return (
    <StorySheet
      open={recruitId != null}
      onOpenChange={(next) => !next && onClose()}
      kicker={detail.data ? recruitKindLabel(detail.data.kind) : undefined}
      title={title}
      description={detail.isError ? (notFound ? '없는 모집이에요.' : '잠시 뒤 다시 시도해 주세요.') : undefined}
    >
      {detail.isPending && <LoadingDots className="mt-6" />}
      {detail.isError && !notFound && (
        <Pill soft className="mt-4" onClick={() => detail.refetch()}>
          다시 시도
        </Pill>
      )}
      {detail.data && <RecruitBody key={detail.data.id} recruit={detail.data} />}
    </StorySheet>
  )
}

function RecruitBody({ recruit }: { recruit: RecruitDetail }) {
  const { join, leave, close } = useRecruitActions(recruit.id)
  const [error, setError] = useState<string | null>(null)
  const pending = join.isPending || leave.isPending || close.isPending

  const now = useNowEveryMinute()
  const timePassed = Date.parse(recruit.meetAt) <= now
  // 개설자가 정원 전에 닫은 모집은 취소도 막힌다 (다 차서 닫힌 건 시간이 남았으면 취소 가능)
  const closedEarly = recruit.state === 'CLOSED' && recruit.joinedCount < recruit.capacity
  const canLeave = recruit.joined && !recruit.mine && !timePassed && !closedEarly

  function run(action: { mutate: (variables: void, options: { onError: (e: Error) => void }) => void }, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return
    setError(null)
    action.mutate(undefined, { onError: (e) => setError(recruitErrorMessage(toApiError(e))) })
  }

  return (
    <div>
      <dl className="gh-rinfo">
        <div>
          <dt>상태</dt>
          <dd>
            <span className={cn('gh-est', recruit.state === 'OPEN' && 'is-live')}>{recruit.state === 'OPEN' ? '모집 중' : '마감'}</span>
          </dd>
        </div>
        <div>
          <dt>만나는 때</dt>
          <dd className="font-title">{formatMeetAt(recruit.meetAt)}</dd>
        </div>
        <div>
          <dt>자리</dt>
          <dd>
            <div className="gh-seats !mt-0">
              {Array.from({ length: Math.min(recruit.capacity, 12) }, (_, i) => (
                <i key={i} className={cn(i < recruit.joinedCount && 'is-on')} aria-hidden />
              ))}
              <span>
                {recruit.joinedCount} / {recruit.capacity}명
              </span>
            </div>
          </dd>
        </div>
        <div>
          <dt>연 사람</dt>
          <dd className="font-title">
            <PersonName person={recruit.author} />
          </dd>
        </div>
      </dl>

      {recruit.memo && <LinkifiedText text={recruit.memo} className="gh-rmemo" />}

      <section className="gh-rppl">
        <h3>참여한 사람 {recruit.participants.length}명</h3>
        <ul>
          {recruit.participants.map((p) => (
            <li key={p.id}>
              <PersonName person={p} />
              {p.id === recruit.author.id && <small>연 사람</small>}
            </li>
          ))}
        </ul>
      </section>

      <div className="gh-racts">
        <FieldError>{error}</FieldError>

        {recruit.mine ? (
          recruit.state === 'OPEN' ? (
            <StoryButton tone="glass" disabled={pending} onClick={() => run(close, '모집을 닫을까요? 다시 열 수 없어요.')}>
              {close.isPending ? '닫는 중…' : '모집 닫기'}
            </StoryButton>
          ) : (
            <p>모집이 마감됐어요.</p>
          )
        ) : recruit.joined ? (
          canLeave ? (
            <StoryButton tone="glass" disabled={pending} onClick={() => run(leave, '참여를 취소할까요?')}>
              {leave.isPending ? '취소하는 중…' : '참여 취소'}
            </StoryButton>
          ) : (
            <p>마감된 모집은 참여를 취소할 수 없어요.</p>
          )
        ) : recruit.state === 'OPEN' ? (
          <StoryButton disabled={pending} onClick={() => run(join)}>
            {join.isPending ? '참여하는 중…' : '빈 자리에 등불 켜기'}
          </StoryButton>
        ) : (
          <StoryButton tone="glass" disabled>
            마감된 모집이에요
          </StoryButton>
        )}

        {(recruit.joined || recruit.mine) && !timePassed && <p>만나기 3일 전과 하루 전에 알려요.</p>}
        {!recruit.joined && recruit.state === 'OPEN' && <p>참여 알림은 가지 않아요. 메모를 보고 모집을 연 사람에게 연락해 주세요.</p>}
      </div>
    </div>
  )
}
