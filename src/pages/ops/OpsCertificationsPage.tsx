import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Chip } from '@/components/Chip'
import { LoadError } from '@/components/PageStates'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyCard } from '@/features/content/Cards'
import { useEventList, type CertificationState } from '@/features/events/api'
import { CertificationStateBadge } from '@/features/events/EventBits'
import { authorName } from '@/features/member/author'
import { contentErrorMessage, useOpsCertifications, useReviewCertification, type OpsCertification } from '@/features/ops/content'
import { Pager } from '@/features/ops/OpsBits'
import { formatDate } from '@/lib/time'
import { PhotoGrid } from '@/features/uploads/PhotoGrid'
import { toApiError } from '@/lib/api'
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
    setParams(next, { replace: true })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {STATES.map((s) => (
          <Chip key={s.value} selected={state === s.value} onClick={() => set('state', s.value === 'PENDING' ? null : s.value)}>
            {s.label}
          </Chip>
        ))}
        <select
          aria-label="이벤트"
          value={eventId ?? ''}
          onChange={(e) => set('eventId', e.target.value || null)}
          className="h-9 max-w-full rounded-md border bg-card px-2 text-sm"
        >
          <option value="">모든 이벤트</option>
          {events.data?.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>
      {list.data && <p className="mt-3 text-xs text-muted-foreground">{list.data.total}건 · 오래된 순</p>}
      <div className={cn('mt-2 space-y-3', list.isPlaceholderData && 'opacity-60')}>
        {list.isPending && <Skeleton className="h-48 w-full rounded-xl" />}
        {list.isError && <LoadError text="인증을 불러오지 못했어요." onRetry={() => list.refetch()} />}
        {list.isSuccess && list.data.items.length === 0 && (
          <EmptyCard>{state === 'PENDING' ? '확인을 기다리는 인증이 없어요.' : '해당하는 인증이 없어요.'}</EmptyCard>
        )}
        {list.data?.items.map((c) => (
          <CertCard key={c.id} cert={c} />
        ))}
      </div>
      {list.data && <Pager page={list.data.page} size={list.data.size} total={list.data.total} onChange={(p) => set('page', String(p))} />}
    </div>
  )
}

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
    <article className="rounded-xl bg-card px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-bold text-brand-text">{c.event.name}</p>
        <CertificationStateBadge state={c.state} />
      </div>
      <p className="mt-1 text-sm">
        <b className="text-title">{authorName(c.author)}</b>
        {c.mine && <span className="ml-1 text-xs text-brand-text">(나)</span>}
        <span className="ml-1.5 text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
      </p>
      <PhotoGrid photos={c.photos} alt="인증 사진" className="mt-2.5" />
      <p className="mt-2 text-[15px] leading-relaxed">{c.body}</p>
      {c.rejectReason && <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">반려 사유: {c.rejectReason}</p>}

      {c.state === 'PENDING' &&
        (rejecting ? (
          <div className="mt-3">
            <input
              aria-label="반려 사유"
              autoFocus
              maxLength={100}
              placeholder="사유 (부원에게 보여요, 2자 이상)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-base outline-none md:text-sm"
            />
            <div className="mt-2 flex gap-2">
              <Button variant="destructive" size="sm" disabled={review.isPending || reason.trim().length < 2} onClick={reject}>
                반려하기
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>
                취소
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" className="h-10" disabled={review.isPending} onClick={() => setRejecting(true)}>
              반려
            </Button>
            <Button className="h-10" disabled={review.isPending} onClick={approve}>
              승인
            </Button>
          </div>
        ))}
      {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
    </article>
  )
}
