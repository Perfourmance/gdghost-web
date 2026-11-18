import { Fragment, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import {
  EmptyState,
  Ghost,
  IconChat,
  IconCup,
  IconSend,
  IconSparkle,
  IconStar,
  Pill,
  PillLink,
  StorySubPage,
} from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { CoffeeChatSheet, type CoffeeTarget } from '@/features/coffee/CoffeeChatSheet'
import {
  useMemberActivities,
  useMemberProfile,
  type ActivityItem,
  type ActivityType,
  type ContactType,
  type MemberProfile,
} from '@/features/member/api'
import { contactLabel, memberStatusLabel, positionLabel } from '@/features/member/labels'
import { useLoadMore } from '@/hooks/useLoadMore'
import { toApiError } from '@/lib/api'
import { formatMonthDay, formatRelative, useNowEveryMinute } from '@/lib/time'
import { colorOf, ROOF_COLORS } from '@/lib/categoryColors'
import { cn } from '@/lib/utils'
import '@/styles/members.css'

/** 프로필 (S24) — 소개 · 관심 분야 · 경험 · 연락 수단, 아래 활동 기록 탭. 닉네임을 누르면 어디서든 여기로 */
export function MemberProfilePage() {
  const { memberId } = useParams()
  const id = Number(memberId)
  const validId = Number.isInteger(id) && id > 0
  const { data: me } = useMe()
  const location = useLocation()
  const profile = useMemberProfile(id, validId && me != null)

  if (!me) {
    return (
      <SubPageLayout fallback="/members">
        <LockPanel next={location.pathname} title="프로필은 부원만 볼 수 있어요." />
      </SubPageLayout>
    )
  }

  const notFound = !validId || (profile.isError && toApiError(profile.error).code === 'NOT_FOUND')
  const mine = profile.data?.id === me.id

  return (
    <StorySubPage fallback="/members" className={cn(!mine && profile.data && 'gh-pf')}>
      {notFound && <GoneNotice />}

      {!notFound && profile.isPending && <div className="gh-mskel mx-4 mt-6 !h-72" aria-label="불러오는 중" />}

      {!notFound && profile.isError && (
        <div className="px-4 pt-4">
          <EmptyState
            row
            pose="shh"
            title="프로필을 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => profile.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}

      {profile.data && (
        <>
          <ProfileHeader profile={profile.data} mine={mine} />
          {/* key: 다른 부원으로 바뀌면 탭 상태를 새로 */}
          <Activities key={profile.data.id} profile={profile.data} mine={mine} />
          {!mine && <CoffeeDock profile={profile.data} />}
          <div className="h-10" />
        </>
      )}
    </StorySubPage>
  )
}

function ProfileHeader({ profile, mine }: { profile: MemberProfile; mine: boolean }) {
  const now = useNowEveryMinute()
  const realInfo = [profile.name, profile.department, profile.studentNo && `${profile.studentNo}학번`].filter(Boolean) as string[]
  // 창문 불 = 커피챗 받는 중
  const lit = profile.acceptCoffee

  return (
    <>
      <div className="gh-pf-sky">
        <div className={cn('gh-pf-scene', !lit && 'is-off')}>
          <div className="gh-pf-glow" />
          <div className="gh-pf-ground" />
          <div className="gh-pf-house" style={{ '--r': colorOf(ROOF_COLORS, profile.position) } as CSSProperties}>
            <i className="gh-pf-chim" />
            <div className="gh-pf-roof">
              <span>{positionLabel(profile.position)}</span>
            </div>
            <div className="gh-pf-wall">
              {/* 프로필 사진 기능이 없어 모두 유령 (디자인 가이드 4장) */}
              <div className="gh-pf-win">
                <Ghost pose="b" alt={`${profile.nickname} 프로필`} />
              </div>
              <div className="gh-pf-door" />
            </div>
          </div>
          <div className="gh-pf-mail" aria-hidden>
            <div>
              <b />
            </div>
            <i />
          </div>
          {profile.acceptQuestion && (
            <span className="gh-pf-tag is-q">
              <IconChat />
              질문 받는 중
            </span>
          )}
          {profile.acceptCoffee && (
            <span className="gh-pf-tag is-c">
              <IconCup />
              커피챗 받는 중
            </span>
          )}
        </div>
      </div>

      <section className="gh-pf-who">
        <h1>
          {profile.nickname}
          {profile.isStaff && <span className="gh-staff">운영진</span>}
        </h1>
        <div className="gh-m1">
          {profile.generation}기 · {memberStatusLabel(profile.status)} · {positionLabel(profile.position)}
        </div>
        {/* 실명 · 학과 · 학번은 부원에게만 보인다 (이 화면은 부원 전용) */}
        {realInfo.length > 0 && <div className="gh-m2">{realInfo.join(' · ')}</div>}
        {!profile.acceptQuestion && <div className="gh-m2">지금은 질문을 받지 않아요</div>}
        {mine && (
          <div className="gh-pf-mine">
            <PillLink to="/profile/edit">프로필 수정</PillLink>
            <PillLink to="/coffee-chats" soft>
              내 커피챗
            </PillLink>
            <PillLink to="/settings" soft>
              설정
            </PillLink>
          </div>
        )}
      </section>

      {profile.statusNote && (
        <div className="gh-pf-note">
          <small>문 앞 쪽지 · 요즘</small>
          <b>{profile.statusNote}</b>
          {profile.statusNoteUpdatedAt && <span>{formatRelative(profile.statusNoteUpdatedAt, now)}에 붙였어요</span>}
        </div>
      )}

      {(profile.bio || profile.interests.length > 0 || profile.experiences.length > 0 || profile.contacts.length > 0) && (
        <section className="gh-rooms">
          {profile.bio && (
            <div className="gh-room">
              <h2>
                <IconChat />
                이런 이야기 해 줄 수 있어요
              </h2>
              <LinkifiedText text={profile.bio} className="gh-rp" />
            </div>
          )}
          {profile.interests.length > 0 && (
            <div className="gh-room">
              <h2>
                <IconStar />
                관심 분야
              </h2>
              <div className="gh-rchips">
                {profile.interests.map((interest) => (
                  <Fragment key={interest.name}>
                    <span>{interest.name}</span>
                    {interest.skills.map((skill) => (
                      <span key={skill} className="is-sub">
                        {skill}
                      </span>
                    ))}
                  </Fragment>
                ))}
              </div>
            </div>
          )}
          {profile.experiences.length > 0 && (
            <div className="gh-room">
              <h2>
                <IconSparkle />
                걸어 온 길
              </h2>
              <div className="gh-rchips is-ex">
                {profile.experiences.map((e) => (
                  <span key={e}>{e}</span>
                ))}
              </div>
            </div>
          )}
          {profile.contacts.length > 0 && (
            <div className="gh-room">
              <h2>
                <IconSend />
                연락 수단
              </h2>
              <ul className="gh-contacts">
                {profile.contacts.map((c) => (
                  <li key={c.type}>
                    <span>{contactLabel(c.type)}</span>
                    <ContactValue type={c.type} value={c.value} />
                  </li>
                ))}
              </ul>
              {mine && <small>비공개 연락 수단은 나만 볼 수 있어요.</small>}
            </div>
          )}
        </section>
      )}
    </>
  )
}

/** 아래 커피챗 막대 — 받지 않음 · 응답 대기 · 다시 신청 대기 기간이면 버튼 대신 안내 (F3-06) */
function CoffeeDock({ profile }: { profile: MemberProfile }) {
  const [target, setTarget] = useState<CoffeeTarget | null>(null)
  const { myRequestState, availableAt } = profile.coffeeChat

  let title = '창문에 불이 켜져 있어요'
  let text: ReactNode = '지금 커피챗을 받고 있어요'
  let canRequest = true
  if (!profile.acceptCoffee) {
    title = '창문 불이 꺼져 있어요'
    text = '지금은 커피챗을 받지 않아요'
    canRequest = false
  } else if (myRequestState === 'REQUESTED') {
    title = '쪽지를 보냈어요'
    text = (
      <>
        수락하면 연락 방법을 볼 수 있어요. <Link to="/coffee-chats?tab=sent">보낸 신청 보기</Link>
      </>
    )
    canRequest = false
  } else if (availableAt != null) {
    // 서버가 거절 · 만료 후 14일 안일 때만 준다
    title = '조금 쉬었다 다시 두드려요'
    text = `${formatMonthDay(availableAt)}부터 다시 신청할 수 있어요`
    canRequest = false
  }

  return (
    <div className="gh-dock">
      <div>
        <div>
          <b>{title}</b>
          {text}
        </div>
        {canRequest && (
          <button type="button" onClick={() => setTarget({ id: profile.id, nickname: profile.nickname })}>
            <IconCup />
            커피챗 신청
          </button>
        )}
      </div>
      <CoffeeChatSheet target={target} onClose={() => setTarget(null)} />
    </div>
  )
}

/** 주소면 링크, 전화번호면 걸기, 나머지(아이디)는 글자 그대로 */
function ContactValue({ type, value }: { type: ContactType; value: string }) {
  if (type === 'PHONE') return <a href={`tel:${value.replace(/-/g, '')}`}>{value}</a>
  return <LinkifiedText text={value} />
}

const TABS: { type: ActivityType; label: string; count: (p: MemberProfile) => number; empty: string }[] = [
  { type: 'ANSWER', label: '답변', count: (p) => p.stats.answerCount, empty: '아직 남긴 답장이 없어요' },
  { type: 'QUESTION', label: '질문', count: (p) => p.stats.questionCount, empty: '아직 띄운 질문이 없어요' },
  { type: 'SHARE', label: '공유', count: (p) => p.stats.shareCount, empty: '아직 공유한 글이 없어요' },
  { type: 'FEED', label: '피드', count: (p) => p.stats.feedCount, empty: '아직 올린 글이 없어요' },
]

/** 활동 기록 — `답변 / 질문 / 공유 / 피드` 탭(옆에 개수), 고른 탭만 불러오고 탭마다 무한 스크롤 (IA S24) */
function Activities({ profile, mine }: { profile: MemberProfile; mine: boolean }) {
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((t) => t.type === params.get('tab')) ?? TABS[0]
  const now = useNowEveryMinute()
  const list = useMemberActivities(profile.id, tab.type, true)
  const { isFetchingNextPage, fetchNextPage } = list
  // 프로필 아래라 첫 20개 뒤로는 바로 더보기
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 1)

  function selectTab(type: ActivityType) {
    const next = new URLSearchParams(params)
    if (type === TABS[0].type) next.delete('tab')
    else next.set('tab', type)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const items = list.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <section>
      <h2 className="sr-only">활동 기록</h2>
      <div role="tablist" aria-label="활동 기록" className="gh-pf-tabs">
        {TABS.map((t) => (
          <button key={t.type} type="button" role="tab" aria-selected={tab.type === t.type} onClick={() => selectTab(t.type)}>
            <span>
              {t.label}
              <sup>{t.count(profile)}</sup>
            </span>
          </button>
        ))}
      </div>

      {/* 본인 조회에만 익명 글이 섞여 온다. 개수는 익명을 빼고 센다 */}
      {mine && (tab.type === 'ANSWER' || tab.type === 'QUESTION') && (
        <p className="gh-pf-anon">이 프로필에서 익명 글은 나만 볼 수 있고, 글 수에서는 빠져요.</p>
      )}

      <div role="tabpanel">
        {list.isPending && <div className="gh-mskel mx-4 mt-5 !h-28" aria-label="불러오는 중" />}

        {list.isError && (
          <div className="px-4 pt-4">
            <EmptyState
              row
              pose="shh"
              title="활동 기록을 불러오지 못했어요"
              action={
                <Pill soft className="mt-2" onClick={() => list.refetch()}>
                  다시 시도
                </Pill>
              }
            />
          </div>
        )}

        {list.isSuccess && items.length === 0 && (
          <div className="px-4 pt-4">
            <EmptyState row pose="star" title={tab.empty} />
          </div>
        )}

        {items.length > 0 && (
          <div className="gh-tl">
            {items.map((item) => (
              <ActivityCard key={`${item.type}-${item.targetId}-${item.createdAt}`} item={item} now={now} />
            ))}
          </div>
        )}

        {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
        {isFetchingNextPage && <div className="gh-mskel mx-4 !h-20" />}
        {(showMoreButton || list.isFetchNextPageError) && (
          <button type="button" className="gh-mmore" onClick={() => fetchNextPage()}>
            {list.isFetchNextPageError ? '더 불러오지 못했어요. 다시 시도' : '더보기'}
          </button>
        )}
      </div>
    </section>
  )
}

/** 질문 · 답변은 그 질문으로, 공유 · 피드는 그 글로 */
function activityPath(item: ActivityItem): string | null {
  if (item.type === 'ANSWER' || item.type === 'QUESTION') return `/questions/${item.targetId}`
  if (item.type === 'SHARE') return `/shares/${item.targetId}`
  if (item.type === 'FEED') return `/feed/${item.targetId}`
  return null
}

function ActivityCard({ item, now }: { item: ActivityItem; now: number }) {
  const path = activityPath(item)
  const pick = item.adopted
  const content = (
    <>
      {(pick || item.anonymous) && (
        <div className={cn('gh-st', !pick && 'is-anon')}>
          {pick && (item.type === 'QUESTION' ? '★ 채택 완료' : '★ 채택된 답')}
          {pick && item.anonymous && ' · '}
          {item.anonymous && '익명'}
        </div>
      )}
      {item.title && <h4>{item.title}</h4>}
      {item.snippet && <p>{item.snippet}</p>}
      <div className="gh-d">
        {formatRelative(item.createdAt, now)}
        {item.type === 'ANSWER' && ' · 이 질문에 답했어요'}
      </div>
    </>
  )
  if (!path) return <article className={cn(pick && 'is-pick')}>{content}</article>
  return (
    <Link to={path} className={cn(pick && 'is-pick')}>
      {content}
    </Link>
  )
}

/** 없거나 탈퇴 · 정지한 부원 — 안내 후 목록으로 (IA 2장) */
function GoneNotice() {
  return (
    <div className="px-4 pt-6">
      <EmptyState pose="shh" title="부원을 찾을 수 없어요" action={<PillLink to="/members" className="mt-3">부원 목록으로</PillLink>}>
        탈퇴했거나 없는 부원이에요.
      </EmptyState>
    </div>
  )
}
