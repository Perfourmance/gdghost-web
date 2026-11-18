import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Calm, DotChips, EmptyState, IconStar, IconX, Pill } from '@/components/story'
import { useEventList, type CertificationState } from '@/features/events/api'
import { authorName } from '@/features/member/author'
import { contentErrorMessage, useOpsCertifications, useReviewCertification, type OpsCertification } from '@/features/ops/content'
import { Pager } from '@/features/ops/OpsBits'
import { formatDate } from '@/lib/time'
import { PhotoGrid } from '@/features/uploads/PhotoGrid'
import { toApiError } from '@/lib/api'
import { REVIEW_COLORS } from '@/lib/categoryColors'
import { cn } from '@/lib/utils'

const STATES: { value: CertificationState; label: string }[] = [
  { value: 'PENDING', label: '확인 대기' },
  { value: 'APPROVED', label: '승인' },
  { value: 'REJECTED', label: '반려' },
]

/** 운영 · 인증 확인 (S72) — 여러 이벤트를 한 곳에서, 오래된 순. 승인 · 반려(사유 2–100자) */
export function OpsCertificationsPage() {
  const [params, setParams] = useSearchParams()
  const state = (STATES.find((s) => s.value === params.get('state'))?.value ?? 'PENDING') as CertificationState
  const eventId = Number(params.get('eventId')) || null
  const page = Math.max(0, Number(params.get('page')) || 0)
  const list = useOpsCertifications(state, eventId, page)
  const events = useEventList(true)

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value == null) next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true, preventScrollReset: true })
  }

  return (
    <div className="gh-av">
      <DotChips
        label="상태"
        value={state}
        onChange={(v) => set('state', v === 'PENDING' ? null : v)}
        options={STATES.map((st) => ({ value: st.value, label: st.label, color: REVIEW_COLORS[st.value] }))}
      />
      <select aria-label="이벤트" className="gh-osel" value={eventId ?? ''} onChange={(e) => set('eventId', e.target.value || null)}>
        <option value="">모든 이벤트</option>
        {events.data?.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      {list.data && (
        <p className="gh-ocnt">
          <b>{list.data.total}</b>건 {state === 'PENDING' ? '기다리는 중' : ''} · 오래된 순
        </p>
      )}
      <div className={cn(list.isPlaceholderData && 'opacity-60')}>
        {list.isPending && <div className="gh-ops-skel !h-72" />}
        {list.isError && (
          <EmptyState
            row
            pose="shh"
            title="인증을 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => list.refetch()}>
                다시 시도
              </Pill>
            }
          />
        )}
        {list.isSuccess && list.data.items.length === 0 && (
          <Calm>{state === 'PENDING' ? '확인을 기다리는 인증이 없어요.' : '해당하는 인증이 없어요.'}</Calm>
        )}
        {list.data?.items.map((c) => (
          <CertCard key={c.id} cert={c} />
        ))}
      </div>
      {list.data && <Pager page={list.data.page} size={list.data.size} total={list.data.total} onChange={(p) => set('page', String(p))} />}
    </div>
  )
}

const STATE_TEXT: Record<CertificationState, string> = { PENDING: '확인 대기', APPROVED: '승인', REJECTED: '반려' }

function CertCard({ cert: c }: { cert: OpsCertification }) {
  const review = useReviewCertification()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const onError = (e: unknown) => setError(contentErrorMessage(toApiError(e)))

  function approve() {
    setError(null)
    review.mutate({ id: c.id, decision: 'APPROVE' }, { onError })
  }

  function reject() {
    if (reason.trim().length < 2) return
    setError(null)
    review.mutate({ id: c.id, decision: 'REJECT', rejectReason: reason.trim() }, { onError })
  }

  return (
    <article className={cn('gh-acard', c.state === 'PENDING' && 'is-wait')}>
      <div className="gh-ev">
        <IconStar />
        <span>{c.event.name}</span>
        <em className={cn(c.state === 'APPROVED' && 'is-ok', c.state === 'REJECTED' && 'is-bad')}>{STATE_TEXT[c.state]}</em>
      </div>
      <div className="gh-pol">
        {c.photos.length > 0 && <PhotoGrid photos={c.photos} alt="인증 사진" />}
        <p>{c.body}</p>
        <div className="gh-by">
          <b>{authorName(c.author)}</b>
          {c.mine && '(나)'}
          {formatDate(c.createdAt)}
        </div>
        {c.rejectReason && <p className="gh-rej">반려 사유: {c.rejectReason}</p>}
      </div>

      {c.state === 'PENDING' &&
        (rejecting ? (
          <>
            <div className="gh-rej-in">
              <input
                aria-label="반려 사유"
                autoFocus
                maxLength={100}
                placeholder="사유 (부원에게 보여요, 2자 이상)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="gh-do">
              <button type="button" className="is-no" onClick={() => setRejecting(false)}>
                취소
              </button>
              <button type="button" className="is-reject" disabled={review.isPending || reason.trim().length < 2} onClick={reject}>
                반려하기
              </button>
            </div>
          </>
        ) : (
          <div className="gh-do">
            <button type="button" className="is-no" disabled={review.isPending} onClick={() => setRejecting(true)}>
              <IconX />
              반려
            </button>
            <button type="button" className="is-yes" disabled={review.isPending} onClick={approve}>
              <IconStar />
              승인 · 별 켜기
            </button>
          </div>
        ))}
      {error && (
        <p className="mt-2 text-sm text-gh-error-night" role="alert">
          {error}
        </p>
      )}
    </article>
  )
}
