import { PencilLine } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { Chip } from '@/components/Chip'
import { LoadError } from '@/components/PageStates'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { EmptyCard } from '@/features/content/Cards'
import { FEED_CATEGORY_KEYS, feedCategoryLabel } from '@/features/content/labels'
import { useFeedList } from '@/features/feed/api'
import { FeedPostView } from '@/features/feed/FeedBits'
import { useLoadMore } from '@/hooks/useLoadMore'
import { useNowEveryMinute } from '@/lib/time'

/** 피드 (S50) — 분류 칩 · 최신순 무한 스크롤. 비회원은 블라인드(API가 401이라 부르지 않는다) */
export function FeedPage() {
  const { data: me } = useMe()
  const member = me != null
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const now = useNowEveryMinute()

  const raw = params.get('category')
  const category = raw && FEED_CATEGORY_KEYS.includes(raw) ? raw : null
  const list = useFeedList(category, member)
  const { isFetchingNextPage, fetchNextPage } = list
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 3)

  if (!member) {
    return (
      <div className="pb-4">
        <h1 className="text-xl font-bold text-title">피드</h1>
        {/* 블러 처리한 가짜 카드 위에 가입 안내 — 실제 글은 받지 않는다 */}
        <div className="relative mt-4">
          <div aria-hidden className="pointer-events-none space-y-3 blur-sm select-none">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl bg-card px-4 py-4">
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="mt-3 h-3 w-full rounded bg-muted" />
                <div className="mt-2 h-3 w-4/5 rounded bg-muted" />
                <div className="mt-3 h-32 w-full rounded-lg bg-muted" />
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 top-6">
            <LockPanel next={location.pathname} title="피드는 부원끼리만 나눠요" buttonText="로그인하고 피드 보기" />
          </div>
        </div>
      </div>
    )
  }

  function setCategory(value: string | null) {
    const next = new URLSearchParams(params)
    if (value == null) next.delete('category')
    else next.set('category', value)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const posts = list.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="pb-20">
      <h1 className="text-xl font-bold text-title">피드</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip selected={category == null} onClick={() => setCategory(null)}>
          전체
        </Chip>
        {FEED_CATEGORY_KEYS.map((c) => (
          <Chip key={c} selected={category === c} onClick={() => setCategory(category === c ? null : c)}>
            {feedCategoryLabel(c)}
          </Chip>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {list.isPending && [0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        {list.isError && <LoadError text="피드를 불러오지 못했어요." onRetry={() => list.refetch()} />}
        {list.isSuccess && posts.length === 0 && (
          <EmptyCard>{category ? '이 분류에는 아직 글이 없어요.' : '아직 올라온 글이 없어요. 오늘 있었던 일을 나눠 보세요.'}</EmptyCard>
        )}

        {posts.map((post) => (
          <FeedPostView key={post.id} post={post} now={now} />
        ))}

        {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
        {isFetchingNextPage && <Skeleton className="h-40 w-full rounded-xl" />}
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
        <Link
          to="/feed/new"
          className={buttonVariants({
            size: 'lg',
            className: 'pointer-events-auto h-12 rounded-full px-5 text-[15px] font-bold shadow-lg',
          })}
        >
          <PencilLine aria-hidden />
          글쓰기
        </Link>
      </div>
    </div>
  )
}
