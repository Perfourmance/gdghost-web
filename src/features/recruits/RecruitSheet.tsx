import { useState } from 'react'
import { LinkifiedText } from '@/components/LinkifiedText'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { recruitKindLabel } from '@/features/content/labels'
import {
  recruitErrorMessage,
  useRecruitActions,
  useRecruitDetail,
  type RecruitDetail,
} from '@/features/recruits/api'
import { PersonName, RecruitStateBadge } from '@/features/recruits/RecruitBits'
import { formatMeetAt } from '@/features/recruits/format'
import { toApiError } from '@/lib/api'
import { useNowEveryMinute } from '@/lib/time'

/** 모집 상세 시트 (S33) — 참여 · 마감 전 참여 취소 · 개설자는 모집 닫기 (F5-04) */
export function RecruitSheet({ recruitId, onClose }: { recruitId: number | null; onClose: () => void }) {
  const detail = useRecruitDetail(recruitId)
  const notFound = detail.isError && toApiError(detail.error).code === 'NOT_FOUND'

  return (
    <Sheet open={recruitId != null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] max-w-md gap-0 overflow-y-auto rounded-t-2xl border-0 bg-card px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {detail.isPending && (
          <div className="space-y-3">
            <SheetTitle className="sr-only">모집 불러오는 중</SheetTitle>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        )}

        {detail.isError && (
          <div className="py-4 text-center">
            <SheetTitle className="text-lg font-bold text-title">
              {notFound ? '모집을 찾을 수 없어요' : '모집을 불러오지 못했어요'}
            </SheetTitle>
            <SheetDescription className="mt-1 text-sm text-muted-foreground">
              {notFound ? '없는 모집이에요.' : '잠시 뒤 다시 시도해 주세요.'}
            </SheetDescription>
            {!notFound && (
              <Button variant="secondary" className="mt-4" onClick={() => detail.refetch()}>
                다시 시도
              </Button>
            )}
          </div>
        )}

        {detail.data && <RecruitBody key={detail.data.id} recruit={detail.data} />}
      </SheetContent>
    </Sheet>
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
      <div className="flex items-center gap-2">
        <p className="text-xs font-bold text-brand-text">{recruitKindLabel(recruit.kind)}</p>
        <RecruitStateBadge state={recruit.state} />
      </div>
      <SheetTitle className="mt-1.5 text-lg leading-snug font-bold text-title">{recruit.title}</SheetTitle>
      <SheetDescription className="sr-only">모집 상세</SheetDescription>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex gap-3">
          <dt className="w-14 shrink-0 text-muted-foreground">만나는 때</dt>
          <dd className="font-bold text-title">{formatMeetAt(recruit.meetAt)}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-14 shrink-0 text-muted-foreground">인원</dt>
          <dd className="tabular-nums">
            <b className="text-title">{recruit.joinedCount}</b> / {recruit.capacity}명
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-14 shrink-0 text-muted-foreground">연 사람</dt>
          <dd>
            <PersonName person={recruit.author} className="font-bold text-title" />
          </dd>
        </div>
      </dl>

      {recruit.memo && (
        <LinkifiedText text={recruit.memo} className="mt-4 rounded-lg bg-background px-3 py-2.5 text-sm leading-relaxed" />
      )}

      <section className="mt-5">
        <h3 className="text-sm font-bold text-title">참여한 사람 {recruit.participants.length}명</h3>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {recruit.participants.map((p) => (
            <li key={p.id} className="rounded-full bg-background px-3 py-1 text-sm">
              <PersonName person={p} />
              {p.id === recruit.author.id && <span className="ml-1 text-xs text-muted-foreground">연 사람</span>}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 space-y-2">
        {error && (
          <p className="text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {recruit.mine ? (
          recruit.state === 'OPEN' ? (
            <Button
              variant="secondary"
              size="lg"
              className="h-12 w-full"
              disabled={pending}
              onClick={() => run(close, '모집을 닫을까요? 닫으면 다시 열 수 없어요.')}
            >
              {close.isPending ? '닫는 중…' : '모집 닫기'}
            </Button>
          ) : (
            <p className="text-center text-sm text-muted-foreground">마감된 모집이에요.</p>
          )
        ) : recruit.joined ? (
          canLeave ? (
            <Button
              variant="secondary"
              size="lg"
              className="h-12 w-full"
              disabled={pending}
              onClick={() => run(leave, '참여를 취소할까요?')}
            >
              {leave.isPending ? '취소하는 중…' : '참여 취소'}
            </Button>
          ) : (
            <p className="text-center text-sm text-muted-foreground">마감돼서 참여를 취소할 수 없어요.</p>
          )
        ) : recruit.state === 'OPEN' ? (
          <Button size="lg" className="h-12 w-full" disabled={pending} onClick={() => run(join)}>
            {join.isPending ? '참여하는 중…' : '참여하기'}
          </Button>
        ) : (
          <Button size="lg" className="h-12 w-full" disabled>
            마감된 모집이에요
          </Button>
        )}

        {(recruit.joined || recruit.mine) && !timePassed && (
          <p className="text-center text-xs text-muted-foreground">만나기 3일 전과 하루 전에 알림을 보내 드려요.</p>
        )}
        {!recruit.joined && recruit.state === 'OPEN' && (
          <p className="text-center text-xs text-muted-foreground">
            참여해도 연 사람에게 알림은 가지 않아요. 메모를 보고 직접 연락해 주세요.
          </p>
        )}
      </div>
    </div>
  )
}
