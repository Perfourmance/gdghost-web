import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import { EmptyState, Ghost, IconCamera, IconStar, Pill, PillLink, StorySubPage } from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import {
  useCertificationList,
  useEventDetail,
  type CertificationItem,
  type EventDetail,
} from '@/features/events/api'
import { CertificationSheet, type CertificationTarget } from '@/features/events/CertificationSheet'
import { AuthorLink } from '@/features/questions/AnswerList'
import { useLoadMore } from '@/hooks/useLoadMore'
import { toApiError } from '@/lib/api'
import { todayKst } from '@/features/schedules/calendar'
import { formatDay, formatRelative, useNowEveryMinute } from '@/lib/time'
import { cn } from '@/lib/utils'
import '@/styles/schedules.css'

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
      <LockPanel
          next={location.pathname + location.hash}
          title="이벤트는 부원만 볼 수 있어요."
          buttonText="로그인하고 이벤트 보기"
        />
    )
  }

  const notFound = !validId || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')

  return (
    <StorySubPage fallback="/events">
      {notFound && (
        <div className="px-4 pt-6">
          <EmptyState pose="shh" title="이벤트를 찾을 수 없어요" action={<PillLink to="/events" className="mt-3">이벤트 목록으로</PillLink>}>
            없는 이벤트예요.
          </EmptyState>
        </div>
      )}

      {!notFound && detail.isPending && <div className="gh-sskel !h-60" aria-label="불러오는 중" />}

      {!notFound && detail.isError && (
        <div className="px-4 pt-4">
          <EmptyState
            row
            pose="shh"
            title="이벤트를 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => detail.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}

      {detail.data && <EventBody event={detail.data} />}
    </StorySubPage>
  )
}

const STATE_TEXT: Record<EventDetail['state'], string> = { ONGOING: '진행 중', UPCOMING: '예정', ENDED: '지난 이벤트' }
const toDay = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000)
const shortDay = (date: string) => `${Number(date.slice(5, 7))}.${Number(date.slice(8))}`

/** 인증 방법 별자리 — 최대 4단계를 별로 잇는다 */
const STEP_SPOTS = [
  [27, 27],
  [107, 73],
  [59, 127],
  [187, 155],
]

function GuideSteps({ steps }: { steps: string[] }) {
  const spots = STEP_SPOTS.slice(0, steps.length)
  return (
    <div className="gh-steps">
      <svg viewBox="0 0 358 200" preserveAspectRatio="none" fill="none" aria-hidden>
        <path
          d={spots.map(([x, y], i) => `${i ? 'L' : 'M'}${x + 13} ${y + 13}`).join(' ')}
          stroke="rgba(245,185,82,.5)"
          strokeWidth="1.6"
          strokeDasharray="4 6"
        />
      </svg>
      <ol>
        {steps.slice(0, 4).map((step, i) => (
          <li key={i} className={cn('gh-sp', i === spots.length - 1 && 'is-last')} style={{ left: spots[i][0], top: spots[i][1] }}>
            <i>{i + 1}</i>
            {step}
          </li>
        ))}
      </ol>
    </div>
  )
}

function EventBody({ event }: { event: EventDetail }) {
  const location = useLocation()
  const certifications = useCertificationList(event.id, true)
  const [sheet, setSheet] = useState<CertificationTarget | null>(null)
  const ongoing = event.state === 'ONGOING'
  const items = certifications.data?.pages.flatMap((p) => p.items) ?? []
  const today = toDay(todayKst())
  const total = toDay(event.endDate) - toDay(event.startDate)
  const progress = total <= 0 ? (event.state === 'ENDED' ? 100 : 0) : Math.max(0, Math.min(1, (today - toDay(event.startDate)) / total)) * 100

  // #certification-{id}로 들어오면 그 인증으로 내려간다 (인증 결과 알림)
  useEffect(() => {
    if (!certifications.data || !location.hash) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' })
  }, [certifications.data, location.hash])

  function openResubmit(id: number, rejectReason: string) {
    setSheet({ mode: 'resubmit', id, rejectReason, item: items.find((c) => c.id === id) ?? null })
  }

  return (
    <article className={cn('gh-ed', event.state === 'ENDED' && 'is-gone')}>
      <div className="gh-ed-top">
        <div className="gh-ed-hero">
          <i className="gh-streak" aria-hidden />
          <div className="gh-ed-tt">
            <span className={cn('gh-est', event.state === 'ONGOING' ? 'is-live' : event.state === 'UPCOMING' && 'is-soon')}>
              {STATE_TEXT[event.state] ?? '이벤트'}
            </span>
            <h1>{event.name}</h1>
            <div className="gh-w">
              {formatDay(event.startDate)} ~ {formatDay(event.endDate)}
            </div>
            <div className="gh-ebar" aria-hidden>
              <i style={{ width: `${progress}%` }} />
              {ongoing && <b style={{ left: `${progress}%` }} />}
            </div>
            <div className="gh-eends">
              <span>{shortDay(event.startDate)} 시작</span>
              <span>{shortDay(event.endDate)} 끝</span>
            </div>
          </div>
        </div>
      </div>

      {/* 내 인증 현황 + 올리기 */}
      <section className="gh-emine">
        <div className="gh-row">
          <Ghost pose="star" />
          <div>
            <small>내가 띄운 별</small>
            <b>
              {event.my.approvedCount}
              <span>회 인증</span>
            </b>
          </div>
          {event.my.pendingCount > 0 && <span className="gh-pend">확인 대기 {event.my.pendingCount}건</span>}
        </div>

        {event.my.rejected.map((r) => (
          <div key={r.id} className="gh-rej">
            <b>반려된 인증이 있어요</b>
            {r.rejectReason}
            {ongoing ? (
              <button type="button" className="gh-up is-small" onClick={() => openResubmit(r.id, r.rejectReason)}>
                다시 올리기
              </button>
            ) : (
              <small>이벤트 기간이 끝나서 다시 올릴 수 없어요.</small>
            )}
          </div>
        ))}

        {ongoing ? (
          <button type="button" className="gh-up" onClick={() => setSheet({ mode: 'create' })}>
            <IconCamera />
            인증 올리기
          </button>
        ) : (
          <p>
            {event.state === 'UPCOMING' ? `${formatDay(event.startDate)}부터 인증을 올릴 수 있어요.` : '끝난 이벤트라 인증을 올릴 수 없어요.'}
          </p>
        )}
      </section>

      {event.pendingCount != null && (
        <p className="gh-staffnote">
          확인을 기다리는 인증이 <b>{event.pendingCount}건</b> 있어요. 운영 페이지에서 확인할 수 있어요.
        </p>
      )}

      {(event.description || event.requirement) && (
        <div className="gh-esay">
          {event.description && <LinkifiedText text={event.description} />}
          {event.requirement && (
            <div className="gh-need">
              <small>필요한 것</small>
              {event.requirement}
            </div>
          )}
        </div>
      )}

      {event.guideSteps.length > 0 && (
        <>
          <h2 className="gh-esh">
            인증 방법<small>별 {Math.min(event.guideSteps.length, 4)}개를 이어요</small>
          </h2>
          <GuideSteps steps={event.guideSteps} />
        </>
      )}

      <h2 className="gh-esh">
        참여 순위<small>{event.ranking.length}명</small>
      </h2>
      {event.ranking.length === 0 ? (
        <div className="px-4">
          <EmptyState row pose="star" title="아직 인증한 부원이 없어요">
            첫 별을 띄워 보세요.
          </EmptyState>
        </div>
      ) : (
        <ol className="gh-rank">
          {event.ranking.map((r) => (
            <li key={r.member.id} className="gh-rk">
              <span className={cn('gh-n', r.rank > 3 && 'is-low')}>{r.rank}</span>
              {r.member.nickname == null ? (
                <b className="text-gh-sub">탈퇴한 부원</b>
              ) : (
                <b>
                  <Link to={`/members/${r.member.id}`}>{r.member.nickname}</Link>
                  <span>{r.member.generation}기</span>
                </b>
              )}
              <em>
                <IconStar />
                {r.approvedCount}회
              </em>
            </li>
          ))}
        </ol>
      )}

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
    <section>
      <h2 className="gh-esh">
        인증 글{list.isSuccess && <small>{items.length}</small>}
      </h2>
      {list.isPending && <div className="gh-sskel" />}
      {list.isError && (
        <div className="px-4">
          <EmptyState
            row
            pose="shh"
            title="인증 글을 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => list.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}
      {list.isSuccess && items.length === 0 && (
        <div className="px-4">
          <EmptyState row pose="glass" title="아직 올라온 인증이 없어요" />
        </div>
      )}

      {items.length > 0 && (
        <div className="gh-log">
          {items.map((c) => (
            <article key={c.id} id={`certification-${c.id}`} className={cn('gh-lg', c.state !== 'APPROVED' && 'is-wait')}>
              <div className="gh-who">
                <b>
                  <AuthorLink author={c.author} className="" />
                </b>
                {formatRelative(c.createdAt, now)}
                {c.state !== 'APPROVED' && <span className={cn('gh-tag', c.state === 'REJECTED' && 'is-bad')}>{c.state === 'REJECTED' ? '반려' : '확인 대기'}</span>}
              </div>
              {c.photos.length > 0 && (
                <div className="gh-photos" style={{ gridTemplateColumns: `repeat(${Math.min(c.photos.length, 3)}, 1fr)` }}>
                  {[...c.photos]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((p, i) => (
                      <a key={p.objectKey} href={p.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={p.url}
                          alt={`인증 사진 ${i + 1}`}
                          loading="lazy"
                          className={c.photos.length === 1 ? 'max-h-72' : 'aspect-square'}
                        />
                      </a>
                    ))}
                </div>
              )}
              <p>{c.body}</p>
              {c.state === 'REJECTED' && c.rejectReason && (
                <div className="gh-rej">
                  <b>반려 사유</b>
                  {c.rejectReason}
                  {c.mine && ongoing && (
                    <button type="button" className="gh-up is-small" onClick={() => onResubmit(c)}>
                      다시 올리기
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
      {list.isFetchingNextPage && <div className="gh-sskel" />}
      {showMoreButton && (
        <button type="button" className="gh-emore" onClick={() => list.fetchNextPage()}>
          더보기
        </button>
      )}
    </section>
  )
}
