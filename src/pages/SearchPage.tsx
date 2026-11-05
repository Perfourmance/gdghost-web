import { useEffect, useState, type ReactNode } from 'react'
import { ChevronRight, Search, X } from 'lucide-react'
import { useLocation, useSearchParams } from 'react-router'
import { LoadError } from '@/components/PageStates'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { EmptyCard, QuestionCard, ScheduleCard, type CardTarget } from '@/features/content/Cards'
import { MemberCard } from '@/features/member/MemberCard'
import {
  QUERY_MAX,
  QUERY_MIN,
  useSearchAll,
  useSearchType,
  type SearchItems,
  type SearchType,
} from '@/features/search/api'
import { ShareListCard } from '@/features/shares/ShareBits'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useLoadMore } from '@/hooks/useLoadMore'
import { toApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'
import { useNowEveryMinute } from '@/lib/time'
import { cn } from '@/lib/utils'

const TYPES: { type: SearchType; label: string; group: 'members' | 'questions' | 'shares' | 'schedules' }[] = [
  { type: 'MEMBER', label: '부원', group: 'members' },
  { type: 'QUESTION', label: '질문', group: 'questions' },
  { type: 'SHARE', label: '공유', group: 'shares' },
  { type: 'SCHEDULE', label: '일정', group: 'schedules' },
]

const TARGET: CardTarget = { member: true, onLocked: () => {} }

/** 검색 (S60) — 부원 · 질문 · 공유 · 일정. 전체는 종류별 5개, 종류 탭을 고르면 그 종류만 이어서. 주소에 q · type을 둔다 */
export function SearchPage() {
  const { data: me } = useMe()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const [text, setText] = useState(params.get('q') ?? '')
  const debounced = useDebouncedValue(text.trim(), 400)
  const rawType = params.get('type')
  const type = TYPES.find((t) => t.type === rawType)?.type ?? null

  // 입력이 멈추면 주소에 반영 (뒤로 와도 검색어 유지)
  useEffect(() => {
    const next = new URLSearchParams(params)
    if (debounced) next.set('q', debounced)
    else next.delete('q')
    if (next.toString() !== params.toString()) setParams(next, { replace: true, preventScrollReset: true })
  }, [debounced, params, setParams])

  if (!me) {
    return (
      <SubPageLayout>
        <LockPanel next={location.pathname + location.search} title="검색은 부원만 쓸 수 있어요" />
      </SubPageLayout>
    )
  }

  const q = debounced.length >= QUERY_MIN ? debounced : null

  function selectType(next: SearchType | null) {
    const p = new URLSearchParams(params)
    if (next) p.set('type', next)
    else p.delete('type')
    setParams(p, { replace: true, preventScrollReset: true })
  }

  return (
    <SubPageLayout>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          // 들어오자마자 바로 쓸 수 있게
          autoFocus
          aria-label="검색어"
          maxLength={QUERY_MAX}
          placeholder="부원 · 질문 · 공유 · 일정 찾기"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-12 w-full rounded-lg border border-input bg-card pr-10 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <button
            type="button"
            aria-label="검색어 지우기"
            onClick={() => setText('')}
            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="-mx-4 mt-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex w-max gap-4 text-sm" role="tablist" aria-label="검색 종류">
          {[{ type: null, label: '전체' } as const, ...TYPES].map((t) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={type === t.type}
              onClick={() => selectType(t.type)}
              className={cn('py-1.5', type === t.type ? 'font-bold text-brand-text' : 'text-muted-foreground')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 pb-10">
        {q == null ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {text.trim().length > 0 && text.trim().length < QUERY_MIN
              ? `${QUERY_MIN}자 이상 입력하면 찾아요.`
              : '닉네임, 관심 분야, 질문 제목, 태그, 일정 이름으로 찾을 수 있어요.'}
          </p>
        ) : type ? (
          <TypeResults key={`${type}-${q}`} type={type} q={q} />
        ) : (
          <AllResults q={q} onMore={selectType} />
        )}
      </div>
    </SubPageLayout>
  )
}

function ItemCard<T extends SearchType>({ type, item, now }: { type: T; item: SearchItems[T]; now: number }) {
  switch (type) {
    case 'MEMBER':
      return <MemberCard member={item as SearchItems['MEMBER']} />
    case 'QUESTION':
      return <QuestionCard question={item as SearchItems['QUESTION']} target={TARGET} now={now} />
    case 'SHARE':
      return <ShareListCard share={item as SearchItems['SHARE']} target={TARGET} now={now} />
    default:
      return <ScheduleCard schedule={item as SearchItems['SCHEDULE']} target={TARGET} />
  }
}

function searchError(error: unknown): string {
  const apiError = toApiError(error)
  if (apiError.code === 'VALIDATION_FAILED') return `검색어는 ${QUERY_MIN}–${QUERY_MAX}자로 입력해 주세요.`
  return commonErrorMessage(apiError)
}

function AllResults({ q, onMore }: { q: string; onMore: (type: SearchType) => void }) {
  const all = useSearchAll(q)
  const now = useNowEveryMinute()

  if (all.isPending) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[80px] w-full rounded-xl" />
        ))}
      </div>
    )
  }
  if (all.isError) return <LoadError text={searchError(all.error)} onRetry={() => all.refetch()} />

  const groups = TYPES.map((t) => ({ ...t, ...all.data[t.group] }))
  if (groups.every((g) => g.total === 0)) return <EmptyCard>'{q}'에 맞는 결과가 없어요.</EmptyCard>

  return (
    <div className="space-y-8">
      {groups
        .filter((g) => g.total > 0)
        .map((g) => (
          <Section
            key={g.type}
            title={`${g.label} ${g.total}`}
            more={g.total > g.items.length ? () => onMore(g.type) : undefined}
          >
            {g.items.map((item) => (
              <ItemCard key={item.id} type={g.type} item={item} now={now} />
            ))}
          </Section>
        ))}
    </div>
  )
}

function Section({ title, more, children }: { title: string; more?: () => void; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-title">{title}</h2>
        {more && (
          <button type="button" onClick={more} className="flex items-center text-xs text-muted-foreground hover:text-foreground">
            더보기
            <ChevronRight className="size-4" aria-hidden />
          </button>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function TypeResults({ type, q }: { type: SearchType; q: string }) {
  const list = useSearchType(type, q)
  const now = useNowEveryMinute()
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 3)
  const items = list.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="space-y-2">
      {list.isPending && [0, 1, 2].map((i) => <Skeleton key={i} className="h-[80px] w-full rounded-xl" />)}
      {list.isError && <LoadError text={searchError(list.error)} onRetry={() => list.refetch()} />}
      {list.isSuccess && items.length === 0 && <EmptyCard>'{q}'에 맞는 결과가 없어요.</EmptyCard>}
      {items.map((item) => (
        <ItemCard key={item.id} type={type} item={item} now={now} />
      ))}
      {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
      {list.isFetchingNextPage && <Skeleton className="h-[80px] w-full rounded-xl" />}
      {showMoreButton && (
        <Button variant="secondary" className="w-full" onClick={() => list.fetchNextPage()}>
          더보기
        </Button>
      )}
    </div>
  )
}
