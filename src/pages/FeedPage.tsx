import { useLocation, useSearchParams } from 'react-router'
import { DotChips, EmptyState, Fab, Ghost, HangingNote, IconPencil, Pill, StoryTopBar } from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { FEED_CATEGORY_KEYS, feedCategoryLabel } from '@/features/content/labels'
import { useFeedList } from '@/features/feed/api'
import { authorName } from '@/features/member/author'
import { useLoadMore } from '@/hooks/useLoadMore'
import { colorOf, FEED_COLORS } from '@/lib/categoryColors'
import { formatRelative, useNowEveryMinute } from '@/lib/time'
import '@/styles/feed.css'

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

  if (!me) {
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
    <div className="pb-44">
      <div className="gh-fsky">
        <StoryTopBar unread={me.unreadNotificationCount} />
        <div className="gh-fttl">
          <h1>피드</h1>
        </div>
        <p className="gh-fdesc">오늘 마을에서 있었던 일</p>
        <Ghost pose="b" className="gh-fpeek" />
        <DotChips
          label="분류"
          value={category ?? 'ALL'}
          onChange={(v) => setCategory(v === 'ALL' ? null : v)}
          options={[
            { value: 'ALL', label: '전체' },
            ...FEED_CATEGORY_KEYS.map((c) => ({ value: c, label: feedCategoryLabel(c), color: colorOf(FEED_COLORS, c) })),
          ]}
        />
      </div>

      {list.isPending && [0, 1].map((i) => <div key={i} className="gh-fskel" />)}
      {list.isError && (
        <div className="px-4 pt-6">
          <EmptyState
            row
            pose="shh"
            title="피드를 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => list.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}
      {list.isSuccess && posts.length === 0 && (
        <div className="px-4 pt-6">
          <EmptyState pose="b" title={category ? '이 줄은 아직 비어 있어요' : '아직 걸린 하루가 없어요'}>
            오늘 있었던 일을 첫 쪽지로 걸어 주세요.
          </EmptyState>
        </div>
      )}

      {posts.map((post, i) => (
        <div key={post.id}>
          {i > 0 && <div className="gh-fgap" />}
          <HangingNote
            to={`/feed/${post.id}`}
            index={i}
            color={colorOf(FEED_COLORS, post.category)}
            photo={[...post.photos].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url}
            text={post.body}
            author={authorName(post.author)}
            date={formatRelative(post.createdAt, now)}
            category={feedCategoryLabel(post.category)}
            likes={post.likeCount}
            liked={post.liked}
            comments={post.commentCount}
          />
        </div>
      ))}

      {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
      {isFetchingNextPage && <div className="gh-fskel" />}
      {(showMoreButton || list.isFetchNextPageError) && (
        <button type="button" className="gh-fmore" onClick={() => fetchNextPage()}>
          {list.isFetchNextPageError ? '더 불러오지 못했어요. 다시 시도' : '더보기'}
        </button>
      )}

      <Fab to="/feed/new" icon={<IconPencil />}>
        하루 걸어 두기
      </Fab>
    </div>
  )
}
