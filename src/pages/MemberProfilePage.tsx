import type { ReactNode } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import mascot from '@/assets/mascot/default.png'
import { LinkifiedText } from '@/components/LinkifiedText'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { EmptyCard } from '@/features/content/Cards'
import {
  useMemberActivities,
  useMemberProfile,
  type ActivityItem,
  type ActivityType,
  type ContactType,
  type MemberProfile,
} from '@/features/member/api'
import { memberStatusLabel, positionLabel } from '@/features/member/labels'
import { StaffBadge } from '@/features/member/StaffBadge'
import { useLoadMore } from '@/hooks/useLoadMore'
import { toApiError } from '@/lib/api'
import { formatRelative, useNowEveryMinute } from '@/lib/time'
import { cn } from '@/lib/utils'

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
        <LockPanel next={location.pathname} title="프로필은 부원만 볼 수 있어요" />
      </SubPageLayout>
    )
  }

  const notFound = !validId || (profile.isError && toApiError(profile.error).code === 'NOT_FOUND')

  return (
    <SubPageLayout fallback="/members">
      <div className="pb-10">
        {notFound && <GoneNotice />}

        {!notFound && profile.isPending && (
          <div className="space-y-4">
            <Skeleton className="mx-auto size-24 rounded-full" />
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        )}

        {!notFound && profile.isError && (
          <div className="space-y-3 rounded-xl bg-card p-5 text-center" role="alert">
            <p className="text-sm">프로필을 불러오지 못했어요.</p>
            <Button variant="secondary" onClick={() => profile.refetch()}>
              다시 시도
            </Button>
          </div>
        )}

        {profile.data && (
          <>
            <ProfileHeader profile={profile.data} mine={profile.data.id === me.id} />
            {/* key: 다른 부원으로 바뀌면 탭 상태를 새로 */}
            <Activities key={profile.data.id} profile={profile.data} mine={profile.data.id === me.id} />
          </>
        )}
      </div>
    </SubPageLayout>
  )
}

function ProfileHeader({ profile, mine }: { profile: MemberProfile; mine: boolean }) {
  const now = useNowEveryMinute()
  const realInfo = [
    profile.name,
    profile.department,
    profile.studentNo && `${profile.studentNo}학번`,
  ].filter(Boolean) as string[]

  return (
    <>
      {/* 프로필 사진 기능이 없어 모두 마스코트 (디자인 가이드 4장) */}
      <div className="mx-auto flex size-24 items-center justify-center overflow-hidden rounded-full bg-card">
        <img src={mascot} alt="" className="w-16" />
      </div>

      <h1 className="mt-5 flex items-center gap-2 text-[22px] font-bold text-title">
        {profile.nickname}
        {profile.isStaff && <StaffBadge />}
      </h1>
      <p className="mt-1 text-sm text-brand-text">
        {profile.generation}기 · {memberStatusLabel(profile.status)} · {positionLabel(profile.position)}
      </p>
      {/* 실명 · 학과 · 학번은 부원에게만 보인다 (이 화면은 부원 전용) */}
      {realInfo.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{realInfo.join(' · ')}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <AcceptTag on={profile.acceptQuestion}>{profile.acceptQuestion ? '질문 받는 중' : '질문 안 받음'}</AcceptTag>
        <AcceptTag on={profile.acceptCoffee}>{profile.acceptCoffee ? '커피챗 받는 중' : '커피챗 안 받음'}</AcceptTag>
      </div>

      {profile.statusNote && (
        <div className="mt-6 rounded-xl bg-card px-4 py-3.5">
          <p className="text-xs font-bold text-brand-text">근황</p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{profile.statusNote}</p>
          {profile.statusNoteUpdatedAt && (
            <p className="mt-1.5 text-xs text-muted-foreground">{formatRelative(profile.statusNoteUpdatedAt, now)} 업데이트</p>
          )}
        </div>
      )}

      {profile.bio && (
        <Section title="소개">
          <LinkifiedText text={profile.bio} className="text-sm leading-relaxed text-foreground" />
        </Section>
      )}

      {profile.interests.length > 0 && (
        <Section title="관심 분야">
          <ul className="space-y-3">
            {profile.interests.map((interest) => (
              <li key={interest.name}>
                <p className="text-sm font-bold text-title">{interest.name}</p>
                {interest.skills.length > 0 && <Tags items={interest.skills} className="mt-1.5" />}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {profile.experiences.length > 0 && (
        <Section title="경험">
          <Tags items={profile.experiences} />
        </Section>
      )}

      {profile.contacts.length > 0 && (
        <Section title="연락 수단">
          <ul className="space-y-2 text-sm">
            {profile.contacts.map((c) => (
              <li key={c.type} className="flex gap-3">
                <span className="w-16 shrink-0 text-muted-foreground">{CONTACT_LABELS[c.type] ?? '기타'}</span>
                <ContactValue type={c.type} value={c.value} />
              </li>
            ))}
          </ul>
          {mine && <p className="mt-2 text-xs text-muted-foreground">비공개로 둔 연락 수단도 나에게는 보여요.</p>}
        </Section>
      )}
    </>
  )
}

const CONTACT_LABELS: Record<ContactType, string> = {
  LINKEDIN: '링크드인',
  INSTA: '인스타그램',
  KAKAO: '카카오톡',
  PHONE: '전화',
}

/** 주소면 링크, 전화번호면 걸기, 나머지(아이디)는 글자 그대로 */
function ContactValue({ type, value }: { type: ContactType; value: string }) {
  if (type === 'PHONE') {
    return (
      <a href={`tel:${value.replace(/-/g, '')}`} className="break-all text-brand-text underline underline-offset-2">
        {value}
      </a>
    )
  }
  return <LinkifiedText text={value} className="min-w-0 break-all text-foreground" />
}

function AcceptTag({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'rounded-md px-2 py-1 text-xs',
        on ? 'bg-brand-soft font-bold text-brand-text' : 'bg-muted text-muted-foreground',
      )}
    >
      {children}
    </span>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 border-t pt-5">
      <h2 className="mb-3 text-base font-bold text-title">{title}</h2>
      {children}
    </section>
  )
}

function Tags({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)}>
      {items.map((item) => (
        <li key={item} className="rounded-md border px-2 py-1 text-xs text-foreground">
          {item}
        </li>
      ))}
    </ul>
  )
}

const TABS: { type: ActivityType; label: string; count: (p: MemberProfile) => number; empty: string }[] = [
  { type: 'ANSWER', label: '답변', count: (p) => p.stats.answerCount, empty: '아직 남긴 답변이 없어요.' },
  { type: 'QUESTION', label: '질문', count: (p) => p.stats.questionCount, empty: '아직 남긴 질문이 없어요.' },
  { type: 'SHARE', label: '공유', count: (p) => p.stats.shareCount, empty: '아직 올린 공유가 없어요.' },
  { type: 'FEED', label: '피드', count: (p) => p.stats.feedCount, empty: '아직 올린 피드가 없어요.' },
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
    setParams(next, { replace: true })
  }

  const items = list.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <section className="mt-8 border-t pt-5">
      <h2 className="sr-only">활동 기록</h2>
      <div role="tablist" aria-label="활동 기록" className="grid grid-cols-4 rounded-lg bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.type}
            type="button"
            role="tab"
            aria-selected={tab.type === t.type}
            onClick={() => selectTab(t.type)}
            className={cn(
              'rounded-md py-2 text-sm transition-colors',
              tab.type === t.type ? 'bg-brand-soft font-bold text-brand-text' : 'text-muted-foreground',
            )}
          >
            {t.label} <span className="tabular-nums">{t.count(profile)}</span>
          </button>
        ))}
      </div>

      {/* 본인 조회에만 익명 글이 섞여 온다. 개수는 익명을 빼고 센다 */}
      {mine && (tab.type === 'ANSWER' || tab.type === 'QUESTION') && (
        <p className="mt-3 text-xs text-muted-foreground">익명으로 쓴 글은 나에게만 보이고, 개수에는 들어가지 않아요.</p>
      )}

      <div role="tabpanel" className="mt-4 space-y-2">
        {list.isPending && [0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px] w-full rounded-xl" />)}

        {list.isError && (
          <div className="space-y-3 rounded-xl bg-card p-5 text-center" role="alert">
            <p className="text-sm">활동 기록을 불러오지 못했어요.</p>
            <Button variant="secondary" onClick={() => list.refetch()}>
              다시 시도
            </Button>
          </div>
        )}

        {list.isSuccess && items.length === 0 && <EmptyCard>{tab.empty}</EmptyCard>}

        {items.map((item) => (
          <ActivityCard key={`${item.type}-${item.targetId}-${item.createdAt}`} item={item} now={now} />
        ))}

        {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
        {isFetchingNextPage && <Skeleton className="h-[76px] w-full rounded-xl" />}
        {showMoreButton && (
          <Button variant="secondary" className="w-full" onClick={() => fetchNextPage()}>
            더보기
          </Button>
        )}
        {list.isFetchNextPageError && (
          <Button variant="secondary" className="w-full" onClick={() => fetchNextPage()}>
            더 불러오지 못했어요. 다시 시도
          </Button>
        )}
      </div>
    </section>
  )
}

/** 질문 · 답변은 그 질문으로. 공유 · 피드 화면은 F17 · F18에서 생기면 링크를 붙인다 */
function activityPath(item: ActivityItem): string | null {
  if (item.type === 'ANSWER' || item.type === 'QUESTION') return `/questions/${item.targetId}`
  return null
}

function ActivityCard({ item, now }: { item: ActivityItem; now: number }) {
  const path = activityPath(item)
  const content = (
    <>
      <div className="flex items-center gap-1.5">
        {item.adopted && (
          <span className="rounded bg-brand px-1.5 py-0.5 text-[11px] font-bold text-white">
            {item.type === 'QUESTION' ? '채택 완료' : '채택'}
          </span>
        )}
        {item.anonymous && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground">익명</span>
        )}
        {item.title && <p className="line-clamp-1 flex-1 text-[15px] font-bold text-title">{item.title}</p>}
      </div>
      {item.snippet && (
        <p className={cn('line-clamp-2 text-sm text-muted-foreground', item.title && 'mt-1')}>{item.snippet}</p>
      )}
      <p className="mt-1.5 text-xs text-muted-foreground">
        {item.type === 'ANSWER' && '이 질문에 답변 · '}
        {formatRelative(item.createdAt, now)}
      </p>
    </>
  )
  const className = 'block rounded-xl bg-card px-4 py-3.5'
  if (!path) return <div className={className}>{content}</div>
  return (
    <Link to={path} className={cn(className, 'transition-colors hover:bg-accent')}>
      {content}
    </Link>
  )
}

/** 없거나 탈퇴 · 정지한 부원 — 안내 후 목록으로 (IA 2장) */
function GoneNotice() {
  return (
    <div className="rounded-2xl bg-card px-6 py-10 text-center">
      <p className="text-lg font-bold text-title">부원을 찾을 수 없어요</p>
      <p className="mt-1 text-sm text-muted-foreground">탈퇴했거나 없는 부원이에요.</p>
      <Link to="/members" replace className={buttonVariants({ size: 'lg', className: 'mt-6 h-12 w-full' })}>
        부원 목록으로
      </Link>
    </div>
  )
}
