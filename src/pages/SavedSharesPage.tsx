import { useLocation } from 'react-router'
import { Bookmark, EmptyState, Pill, PillLink, Shelf, StorySubPage } from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { shareCategoryLabel } from '@/features/content/labels'
import { authorName } from '@/features/member/author'
import { useSavedShares } from '@/features/shares/api'
import { useLoadMore } from '@/hooks/useLoadMore'
import { colorOf, SHARE_COLORS } from '@/lib/categoryColors'
import { formatRelative, useNowEveryMinute } from '@/lib/time'
import '@/styles/shares.css'

/** 저장한 공유 (설정 · 공유 목록에서) — 최근 저장한 순 */
export function SavedSharesPage() {
  const { data: me } = useMe()
  const location = useLocation()
  const list = useSavedShares(me != null)
  const now = useNowEveryMinute()
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 3)

  if (!me) {
    return (
      <LockPanel next={location.pathname} title="로그인하면 저장한 글을 볼 수 있어요." />
    )
  }

  const items = list.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <StorySubPage fallback="/settings" className="pb-16">
      <div className="gh-shttl !pt-1">
        <h1>저장한 공유</h1>
      </div>
      <p className="gh-shdesc">내 책장에 꽂아 둔 책갈피 · 최근에 꽂은 순</p>

      {list.isPending && <div className="gh-shskel" aria-label="불러오는 중" />}
      {list.isError && (
        <div className="px-4 pt-4">
          <EmptyState
            row
            pose="shh"
            title="저장한 공유를 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => list.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}
      {list.isSuccess && items.length === 0 && (
        <div className="px-4 pt-6">
          <EmptyState pose="glass" title="아직 꽂아 둔 책갈피가 없어요" action={<PillLink to="/shares" className="mt-3">공유 둘러보기</PillLink>}>
            마음에 드는 글의 리본을 누르면 여기 모여요.
          </EmptyState>
        </div>
      )}
      {items.length > 0 && (
        <div className="gh-shelfwrap">
          <Shelf>
            {items.map((s) => (
              <Bookmark
                key={s.id}
                to={`/shares/${s.id}`}
                color={colorOf(SHARE_COLORS, s.category)}
                category={shareCategoryLabel(s.category)}
                title={s.title}
                tags={s.tags}
                by={`${authorName(s.author)} · ${formatRelative(s.createdAt, now)}`}
                saved
                saveCount={s.saveCount}
                noteCount={s.noteCount}
                hasPhoto={s.hasPhoto}
              />
            ))}
          </Shelf>
        </div>
      )}
      {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
      {list.isFetchingNextPage && <div className="gh-shskel" />}
      {showMoreButton && (
        <button type="button" className="gh-shmore" onClick={() => list.fetchNextPage()}>
          더보기
        </button>
      )}
    </StorySubPage>
  )
}
