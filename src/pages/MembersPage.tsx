import { Search } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { Chip } from '@/components/Chip'
import { SegmentTabs } from '@/components/layout/SegmentTabs'
import { QUESTION_SEGMENTS } from '@/components/layout/segments'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { EmptyCard } from '@/features/content/Cards'
import { useMemberList, type MemberFilters } from '@/features/member/api'
import { MemberCard } from '@/features/member/MemberCard'
import { MEMBER_STATUSES, type MemberStatus } from '@/features/member/labels'
import { useLoadMore } from '@/hooks/useLoadMore'

// 기수 칩은 1–4기 (디자인 가이드 6장). 그보다 늦은 기수가 가입해 있으면 그 기수까지 늘린다
const MIN_GENERATIONS = 4

/** 부원 목록 (S23) — 기수 · 상태 필터, 무한 스크롤. 필터는 주소에 둔다(뒤로 와도 유지) */
export function MembersPage() {
  const { data: me } = useMe()
  const location = useLocation()

  return (
    <div className="pb-4">
      <h1 className="sr-only">부원</h1>
      <SegmentTabs items={QUESTION_SEGMENTS} label="질문 탭" />
      {me ? (
        <MemberDirectory maxGeneration={Math.max(MIN_GENERATIONS, me.generation)} />
      ) : (
        <div className="mt-5">
          <LockPanel next={location.pathname} title="부원 목록은 부원만 볼 수 있어요" />
        </div>
      )}
    </div>
  )
}

function MemberDirectory({ maxGeneration }: { maxGeneration: number }) {
  const [params, setParams] = useSearchParams()
  const generations = Array.from({ length: maxGeneration }, (_, i) => i + 1)

  const rawGeneration = Number(params.get('generation'))
  const generation = generations.includes(rawGeneration) ? rawGeneration : null
  const rawStatus = params.get('status')
  const status = MEMBER_STATUSES.some((s) => s.value === rawStatus) ? (rawStatus as MemberStatus) : null
  const filters: MemberFilters = { generation, status }

  const list = useMemberList(filters)
  const { isFetchingNextPage, fetchNextPage } = list
  // 처음 60개까지 저절로, 그다음은 더보기
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 3)

  function setFilter(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value == null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const members = list.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">기수를 넘어 같은 동아리를 거쳐 간 사람들</p>
        {/* 선배 찾기 (IA S25 — 부원 목록 상단) */}
        <Link to="/find-senior" className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'shrink-0' })}>
          <Search aria-hidden />
          선배 찾기
        </Link>
      </div>

      {/* 기수 칩 — 가로로 밀어서 본다 */}
      <div className="-mx-4 mt-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex w-max gap-2">
          <Chip selected={generation == null} onClick={() => setFilter('generation', null)}>
            전체
          </Chip>
          {generations.map((g) => (
            <Chip
              key={g}
              selected={generation === g}
              onClick={() => setFilter('generation', generation === g ? null : String(g))}
            >
              {g}기
            </Chip>
          ))}
        </div>
      </div>

      {/* 상태는 글씨 토글 — 한 번 더 누르면 해제 */}
      <div className="mt-3 flex gap-4 text-sm" role="group" aria-label="상태">
        {MEMBER_STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            aria-pressed={status === s.value}
            onClick={() => setFilter('status', status === s.value ? null : s.value)}
            className={status === s.value ? 'font-bold text-brand-text' : 'text-muted-foreground'}
          >
            {status === s.value ? '✓ ' : ''}
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {list.isPending && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[92px] w-full rounded-xl" />)}

        {list.isError && (
          <div className="space-y-3 rounded-xl bg-card p-5 text-center" role="alert">
            <p className="text-sm">부원 목록을 불러오지 못했어요.</p>
            <Button variant="secondary" onClick={() => list.refetch()}>
              다시 시도
            </Button>
          </div>
        )}

        {list.isSuccess && members.length === 0 && (
          <EmptyCard>
            {generation != null || status != null ? '조건에 맞는 부원이 없어요.' : '아직 부원이 없어요.'}
          </EmptyCard>
        )}

        {members.map((m) => (
          <MemberCard key={m.id} member={m} />
        ))}

        {/* 첫 페이지를 받은 뒤에만 바닥을 지켜본다 */}
        {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
        {isFetchingNextPage && <Skeleton className="h-[92px] w-full rounded-xl" />}
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
    </>
  )
}

