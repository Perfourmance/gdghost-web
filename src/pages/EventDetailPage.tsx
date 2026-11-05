import { useEffect, useState } from 'react'
import { Camera } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import {
  useCertificationList,
  useEventDetail,
  type CertificationItem,
  type EventDetail,
} from '@/features/events/api'
import { CertificationSheet, type CertificationTarget } from '@/features/events/CertificationSheet'
import { CertificationStateBadge, EventStateBadge } from '@/features/events/EventBits'
import { AuthorLink } from '@/features/questions/AnswerList'
import { useLoadMore } from '@/hooks/useLoadMore'
import { toApiError } from '@/lib/api'
import { formatDay, formatDayRange, formatRelative, useNowEveryMinute } from '@/lib/time'

/** 이벤트 상세 · 인증 올리기 (S36) — 안내 · 내 인증 현황 · 참여 순위 · 인증 글. 반려된 인증은 기간 안에 다시 올린다 */
export function EventDetailPage() {
  const { eventId } = useParams()
  const id = Number(eventId)
  const validId = Number.isInteger(id) && id > 0
  const { data: me } = useMe()
  const location = useLocation()
  const detail = useEventDetail(id, validId && me != null)

  if (!me) {
    return (
      <SubPageLayout fallback="/events">
        <LockPanel
          next={location.pathname + location.hash}
          title="이벤트는 부원만 볼 수 있어요"
          buttonText="로그인하고 이벤트 보기"
        />
      </SubPageLayout>
    )
  }

  const notFound = !validId || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')

  return (
    <SubPageLayout fallback="/events">
      {notFound && (
        <div className="rounded-2xl bg-card px-6 py-10 text-center">
          <p className="text-lg font-bold text-title">이벤트를 찾을 수 없어요</p>
          <p className="mt-1 text-sm text-muted-foreground">없는 이벤트예요.</p>
          <Link to="/events" replace className={buttonVariants({ size: 'lg', className: 'mt-6 h-12 w-full' })}>
            이벤트 목록으로
          </Link>
        </div>
      )}

      {!notFound && detail.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      )}

      {!notFound && detail.isError && (
        <div className="space-y-3 rounded-xl bg-card p-5 text-center" role="alert">
          <p className="text-sm">이벤트를 불러오지 못했어요.</p>
          <Button variant="secondary" onClick={() => detail.refetch()}>
            다시 시도
          </Button>
        </div>
      )}

      {detail.data && <EventBody event={detail.data} />}
    </SubPageLayout>
  )
}

function EventBody({ event }: { event: EventDetail }) {
  const location = useLocation()
  const certifications = useCertificationList(event.id, true)
  const [sheet, setSheet] = useState<CertificationTarget | null>(null)
  const ongoing = event.state === 'ONGOING'
  const items = certifications.data?.pages.flatMap((p) => p.items) ?? []

  // #certification-{id}로 들어오면 그 인증으로 내려간다 (인증 결과 알림)
  useEffect(() => {
    if (!certifications.data || !location.hash) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' })
  }, [certifications.data, location.hash])

  function openResubmit(id: number, rejectReason: string) {
    setSheet({ mode: 'resubmit', id, rejectReason, item: items.find((c) => c.id === id) ?? null })
  }

  return (
    <article>
      <EventStateBadge state={event.state} />
      <h1 className="mt-2 text-[22px] leading-snug font-bold text-title">{event.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{formatDayRange(event.startDate, event.endDate)}</p>

      {/* 내 인증 현황 + 올리기 */}
      <section className="mt-5 rounded-xl bg-card px-4 py-4">
        <p className="text-sm">
          내 인증 <b className="text-lg text-title tabular-nums">{event.my.approvedCount}</b>회
          {event.my.pendingCount > 0 && (
            <span className="text-muted-foreground"> · 확인 대기 {event.my.pendingCount}건</span>
          )}
        </p>

        {event.my.rejected.length > 0 && (
          <ul className="mt-3 space-y-2">
            {event.my.rejected.map((r) => (
              <li key={r.id} className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm">
                <p className="font-bold text-destructive">반려된 인증이 있어요</p>
                <p className="mt-0.5 text-foreground">{r.rejectReason}</p>
                {ongoing ? (
                  <Button size="sm" variant="secondary" className="mt-2" onClick={() => openResubmit(r.id, r.rejectReason)}>
                    다시 올리기
                  </Button>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">이벤트 기간이 끝나서 다시 올릴 수 없어요.</p>
                )}
              </li>
            ))}
          </ul>
        )}

        {ongoing ? (
          <Button size="lg" className="mt-4 h-12 w-full" onClick={() => setSheet({ mode: 'create' })}>
            <Camera aria-hidden />
            인증 올리기
          </Button>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {event.state === 'UPCOMING'
              ? `${formatDay(event.startDate)}부터 인증을 올릴 수 있어요.`
              : '끝난 이벤트라 인증을 올릴 수 없어요.'}
          </p>
        )}
      </section>

      {event.pendingCount != null && (
        <p className="mt-3 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-text">
          확인을 기다리는 인증이 <b className="font-bold">{event.pendingCount}건</b> 있어요. 운영 페이지에서 확인해요.
        </p>
      )}

      {event.description && <LinkifiedText text={event.description} className="mt-6 text-[15px] leading-relaxed" />}

      {event.requirement && (
        <section className="mt-6">
          <h2 className="text-base font-bold text-title">필요한 것</h2>
          <p className="mt-1.5 text-sm">{event.requirement}</p>
        </section>
      )}

      {event.guideSteps.length > 0 && (
        <section className="mt-6">
          <h2 className="text-base font-bold text-title">인증 방법</h2>
          <ol className="mt-2 space-y-2">
            {event.guideSteps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-text">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-base font-bold text-title">참여 순위</h2>
        {event.ranking.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">아직 인증된 사람이 없어요. 첫 번째로 인증해 보세요.</p>
        ) : (
          <ol className="mt-2 divide-y rounded-xl bg-card">
            {event.ranking.map((r) => (
              <li key={r.member.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-6 text-center font-bold text-brand-text tabular-nums">{r.rank}</span>
                <span className="min-w-0 flex-1 truncate">
                  {r.member.nickname == null ? (
                    <span className="text-muted-foreground">탈퇴한 부원</span>
                  ) : (
                    <Link to={`/members/${r.member.id}`} className="font-bold text-title hover:underline">
                      {r.member.nickname}
                    </Link>
                  )}
                  {r.member.nickname != null && (
                    <span className="ml-1 text-xs text-muted-foreground">{r.member.generation}기</span>
                  )}
                </span>
                <span className="text-muted-foreground tabular-nums">{r.approvedCount}회</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <CertificationFeed
        list={certifications}
        items={items}
        ongoing={ongoing}
        onResubmit={(c) => openResubmit(c.id, c.rejectReason ?? '')}
      />

      <CertificationSheet
        eventId={event.id}
        requirement={event.requirement}
        photoRequired={event.photoRequired}
        target={sheet}
        onClose={() => setSheet(null)}
      />
    </article>
  )
}

function CertificationFeed({
  list,
  items,
  ongoing,
  onResubmit,
}: {
  list: ReturnType<typeof useCertificationList>
  items: CertificationItem[]
  ongoing: boolean
  onResubmit: (item: CertificationItem) => void
}) {
  const now = useNowEveryMinute()
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 3)

  return (
    <section className="mt-8">
      <h2 className="text-base font-bold text-title">인증 글</h2>
      <div className="mt-2 space-y-3">
        {list.isPending && <Skeleton className="h-40 w-full rounded-xl" />}
        {list.isError && (
          <div className="space-y-3 rounded-xl bg-card p-5 text-center" role="alert">
            <p className="text-sm">인증 글을 불러오지 못했어요.</p>
            <Button variant="secondary" onClick={() => list.refetch()}>
              다시 시도
            </Button>
          </div>
        )}
        {list.isSuccess && items.length === 0 && (
          <p className="text-sm text-muted-foreground">아직 올라온 인증이 없어요.</p>
        )}

        {items.map((c) => (
          <article key={c.id} id={`certification-${c.id}`} className="scroll-mt-20 rounded-xl bg-card px-4 py-3.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                <AuthorLink author={c.author} />
                <span className="ml-1.5 text-xs text-muted-foreground">{formatRelative(c.createdAt, now)}</span>
              </span>
              <CertificationStateBadge state={c.state} />
            </div>

            {c.photos.length > 0 && (
              <div className={`mt-2.5 grid gap-1.5 ${c.photos.length === 1 ? 'grid-cols-1' : c.photos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {[...c.photos]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((p, i) => (
                    <a key={p.objectKey} href={p.url} target="_blank" rel="noopener noreferrer" className="block">
                      <img
                        src={p.url}
                        alt={`인증 사진 ${i + 1}`}
                        loading="lazy"
                        className={`w-full rounded-lg bg-muted object-cover ${c.photos.length === 1 ? 'max-h-80' : 'aspect-square'}`}
                      />
                    </a>
                  ))}
              </div>
            )}

            <p className="mt-2 text-[15px] leading-relaxed">{c.body}</p>

            {c.state === 'REJECTED' && c.rejectReason && (
              <div className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm">
                <span className="font-bold text-destructive">반려 사유</span> {c.rejectReason}
                {c.mine && ongoing && (
                  <Button size="sm" variant="secondary" className="mt-2 block" onClick={() => onResubmit(c)}>
                    다시 올리기
                  </Button>
                )}
              </div>
            )}
          </article>
        ))}

        {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
        {list.isFetchingNextPage && <Skeleton className="h-40 w-full rounded-xl" />}
        {showMoreButton && (
          <Button variant="secondary" className="w-full" onClick={() => list.fetchNextPage()}>
            더보기
          </Button>
        )}
      </div>
    </section>
  )
}
