import { useState } from 'react'
import { Megaphone, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { LoadError } from '@/components/PageStates'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyCard } from '@/features/content/Cards'
import { useEventList, type EventSummary } from '@/features/events/api'
import { EventStateBadge } from '@/features/events/EventBits'
import { contentErrorMessage, usePublishEventNotice } from '@/features/ops/content'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { toApiError } from '@/lib/api'
import { formatDayRange } from '@/lib/time'

/** 운영 · 이벤트 (S72) — 만들기 · 수정 · 공지로 발행 · 그 이벤트의 인증 확인으로 */
export function OpsEventsPage() {
  const list = useEventList(true)
  const [publishing, setPublishing] = useState<EventSummary | null>(null)

  return (
    <div>
      <Link to="/ops/events/new" className={buttonVariants({ className: 'h-11 w-full' })}>
        <Plus aria-hidden />
        이벤트 만들기
      </Link>
      <div className="mt-4 space-y-2">
        {list.isPending && [0, 1].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        {list.isError && <LoadError text="이벤트를 불러오지 못했어요." onRetry={() => list.refetch()} />}
        {list.isSuccess && list.data.length === 0 && <EmptyCard>아직 이벤트가 없어요.</EmptyCard>}
        {list.data?.map((e) => (
          <article key={e.id} className="rounded-xl bg-card px-4 py-3.5">
            <div className="flex items-center gap-2">
              <EventStateBadge state={e.state} />
              {!e.photoRequired && <span className="text-xs text-muted-foreground">사진 없이도 인증</span>}
            </div>
            <Link to={`/events/${e.id}`} className="mt-1 block text-[15px] font-bold text-title hover:underline">
              {e.name}
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDayRange(e.startDate, e.endDate)} · 참여 {e.participantCount}명 · 인증 {e.approvedCount}건
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/ops/events/${e.id}/edit`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                수정
              </Link>
              <Link to={`/ops/certifications?eventId=${e.id}`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                인증 확인
              </Link>
              {e.state !== 'ENDED' && (
                <Button variant="secondary" size="sm" onClick={() => setPublishing(e)}>
                  <Megaphone aria-hidden />
                  공지로 발행
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
      <PublishSheet event={publishing} onClose={() => setPublishing(null)} />
    </div>
  )
}

function PublishSheet({ event, onClose }: { event: EventSummary | null; onClose: () => void }) {
  return (
    <Sheet open={event != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-md gap-0 rounded-t-2xl border-0 bg-card px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {event && <PublishForm key={event.id} event={event} />}
      </SheetContent>
    </Sheet>
  )
}

function PublishForm({ event }: { event: EventSummary }) {
  const publish = usePublishEventNotice(event.id)
  const keyFor = useIdempotencyKey()
  const [pinned, setPinned] = useState(true)
  const [mustRead, setMustRead] = useState(false)
  const [doneId, setDoneId] = useState<number | null>(null)

  function submit() {
    const input = { isPinned: pinned, isMustRead: mustRead }
    publish.mutate({ input, key: keyFor({ eventId: event.id, ...input }) }, { onSuccess: (n) => setDoneId(n.id) })
  }

  if (doneId) {
    return (
      <div className="text-center">
        <SheetTitle className="text-lg font-bold text-title">공지로 올렸어요</SheetTitle>
        <SheetDescription className="mt-1 text-sm text-muted-foreground">부원 디스코드 채널에도 올라갔어요.</SheetDescription>
        <Link to={`/notices/${doneId}`} className={buttonVariants({ size: 'lg', className: 'mt-5 h-12 w-full' })}>
          공지 보기
        </Link>
      </div>
    )
  }

  return (
    <div>
      <SheetTitle className="text-lg font-bold text-title">'{event.name}' 공지로 발행</SheetTitle>
      <SheetDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
        설명과 4단계 안내로 공지를 만들어요. 마감일은 이벤트 끝나는 날이에요.
      </SheetDescription>
      <div className="mt-4 space-y-3 text-sm">
        <label className="flex items-center gap-2.5">
          <Checkbox checked={pinned} onCheckedChange={(on) => setPinned(on === true)} />홈 위에 고정
        </label>
        <label className="flex items-center gap-2.5">
          <Checkbox checked={mustRead} onCheckedChange={(on) => setMustRead(on === true)} />필독
        </label>
      </div>
      {publish.isError && <p className="mt-3 text-sm text-destructive">{contentErrorMessage(toApiError(publish.error))}</p>}
      <Button size="lg" className="mt-5 h-12 w-full" disabled={publish.isPending} onClick={submit}>
        {publish.isPending ? '올리는 중…' : '공지로 올리기'}
      </Button>
    </div>
  )
}
