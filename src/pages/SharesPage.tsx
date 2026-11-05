import { useState } from 'react'
import { PencilLine, Search, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Chip } from '@/components/Chip'
import { LoadError } from '@/components/PageStates'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockSheet } from '@/features/auth/LockSheet'
import { useMe } from '@/features/auth/session'
import { useLockSheet } from '@/features/auth/useLockSheet'
import { EmptyCard, type CardTarget } from '@/features/content/Cards'
import { SHARE_CATEGORY_KEYS, shareCategoryLabel } from '@/features/content/labels'
import { QUERY_MAX, QUERY_MIN, useShareList, type ShareFilters, type ShareSort } from '@/features/shares/api'
import { ShareListCard } from '@/features/shares/ShareBits'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useLoadMore } from '@/hooks/useLoadMore'
import { useNowEveryMinute } from '@/lib/time'
import { cn } from '@/lib/utils'

const WRITE_PATH = '/shares/new'

/** 공유 목록 (S40) — 분류 칩 · 저장순 / 최신순 · 검색(부원만) · 무한 스크롤. 필터는 주소에 둔다 */
export function SharesPage() {
  const { data: me } = useMe()
  const member = me != null
  const [params, setParams] = useSearchParams()
  const lock = useLockSheet()
  const now = useNowEveryMinute()

  const rawCategory = params.get('category')
  const category = rawCategory && SHARE_CATEGORY_KEYS.includes(rawCategory) ? rawCategory : null
  const sort: ShareSort = params.get('sort') === 'LATEST' ? 'LATEST' : 'SAVED'

  // 검색어는 입력이 멈추면 주소에 반영 (2자 미만은 검색하지 않음)
  const [query, setQuery] = useState(params.get('q') ?? '')
  const debounced = useDebouncedValue(query.trim(), 400)
  const q = member && debounced.length >= QUERY_MIN ? debounced : null

  const filters: ShareFilters = { category, sort, q }
  const list = useShareList(filters, member)
  const { isFetchingNextPage, fetchNextPage } = list
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 3)

  function setFilter(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value == null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const target: CardTarget = { member, onLocked: lock.open }
  const shares = list.data?.pages.flatMap((page) => page.items) ?? []
  const tooShort = query.trim().length > 0 && query.trim().length < QUERY_MIN

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-title">공유</h1>
        {member && (
          <Link to="/saved-shares" className="text-sm text-muted-foreground hover:text-foreground">
            저장한 공유
          </Link>
        )}
      </div>

      {/* 검색은 부원만 (비회원이 q를 쓰면 401) */}
      {member && (
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="공유 검색"
            maxLength={QUERY_MAX}
            placeholder="제목이나 태그로 찾기"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-card pr-9 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label="검색어 지우기"
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}
      {tooShort && <p className="mt-1.5 text-xs text-muted-foreground">{QUERY_MIN}자 이상 입력하면 찾아요.</p>}

      <div className="-mx-4 mt-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex w-max gap-2">
          <Chip selected={category == null} onClick={() => setFilter('category', null)}>
            전체
          </Chip>
          {SHARE_CATEGORY_KEYS.map((c) => (
            <Chip key={c} selected={category === c} onClick={() => setFilter('category', category === c ? null : c)}>
              {shareCategoryLabel(c)}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-4 text-sm" role="group" aria-label="정렬">
        {(
          [
            ['SAVED', '저장 많은 순'],
            ['LATEST', '최신순'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={sort === value}
            onClick={() => setFilter('sort', value === 'SAVED' ? null : value)}
            className={cn(sort === value ? 'font-bold text-brand-text' : 'text-muted-foreground')}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {list.isPending && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[92px] w-full rounded-xl" />)}

        {list.isError && <LoadError text="공유를 불러오지 못했어요." onRetry={() => list.refetch()} />}

        {list.isSuccess && shares.length === 0 && (
          <EmptyCard>
            {q ? `'${q}'에 맞는 공유가 없어요.` : category ? '이 분류에는 아직 공유가 없어요.' : '아직 공유가 없어요. 아는 정보를 나눠 주세요.'}
          </EmptyCard>
        )}

        {shares.map((s) => (
          <ShareListCard key={s.id} share={s} target={target} now={now} />
        ))}

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

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 mx-auto flex max-w-md justify-end px-4">
        {member ? (
          <Link to={WRITE_PATH} className={writeButtonClass}>
            <PencilLine aria-hidden />
            공유하기
          </Link>
        ) : (
          <button type="button" className={writeButtonClass} onClick={() => lock.open(WRITE_PATH)}>
            <PencilLine aria-hidden />
            공유하기
          </button>
        )}
      </div>

      {lock.next === WRITE_PATH ? (
        <LockSheet
          next={lock.next}
          onClose={lock.close}
          title="공유는 부원만 올릴 수 있어요"
          description="GDGoC SMU 부원으로 로그인하면 정보를 나눌 수 있어요."
        />
      ) : (
        <LockSheet next={lock.next} onClose={lock.close} title="공유 글은 부원만 볼 수 있어요" />
      )}
    </div>
  )
}

const writeButtonClass = buttonVariants({
  size: 'lg',
  className: 'pointer-events-auto h-12 rounded-full px-5 text-[15px] font-bold shadow-lg',
})
