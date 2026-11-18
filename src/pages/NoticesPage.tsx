import { useLocation } from 'react-router'
import { EmptyState, IconTack, LoadFail, LoadingDots, PostIt, StorySubPage } from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { useNoticeList, type NoticeSummary } from '@/features/notices/api'
import { dueText, isOverdue, noticeAuthorText } from '@/features/notices/format'
import { useLoadMore } from '@/hooks/useLoadMore'
import { formatRelative, useNowEveryMinute } from '@/lib/time'
import '@/styles/common.css'
import '@/styles/ops.css'

/** 공지 목록 (S11) — 고정 먼저, 그 안에서 최신순. 안 읽은 공지 · 확인 안 한 필독을 표시 */
export function NoticesPage() {
  const { data: me } = useMe()
  const location = useLocation()
  const list = useNoticeList(me != null)
  const now = useNowEveryMinute()
  const { isFetchingNextPage, fetchNextPage } = list
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 3)

  if (!me) {
    return (
      <LockPanel next={location.pathname} title="공지는 부원만 볼 수 있어요." buttonText="로그인하고 공지 보기" />
    )
  }

  const notices = list.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <StorySubPage className="pb-12">
      <div className="gh-nlist-ttl">
        <h1>마을 게시판</h1>
        <p>운영진이 붙여 둔 공지예요. 고정한 공지가 먼저 보여요.</p>
      </div>

      {list.isPending && <div className="gh-ops-skel mx-3" aria-label="불러오는 중" />}
      {list.isError && <LoadFail title="공지를 불러오지 못했어요" onRetry={() => list.refetch()} />}
      {list.isSuccess && notices.length === 0 && (
        <div className="px-4 pt-6">
          <EmptyState pose="b" title="아직 붙은 공지가 없어요">
            운영진이 공지를 올리면 여기 붙어요.
          </EmptyState>
        </div>
      )}

      {notices.length > 0 && (
        <div className="gh-nlist">
          {notices.map((notice, i) => (
            <NoticeRow key={notice.id} notice={notice} now={now} mint={i % 3 === 2} />
          ))}
        </div>
      )}

      {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
      {isFetchingNextPage && <LoadingDots className="mt-6" />}
      {(showMoreButton || list.isFetchNextPageError) && (
        <button type="button" className="gh-cmore" onClick={() => fetchNextPage()}>
          {list.isFetchNextPageError ? '더 불러오지 못했어요. 다시 시도' : '더보기'}
        </button>
      )}
    </StorySubPage>
  )
}

function NoticeRow({ notice, now, mint }: { notice: NoticeSummary; now: number; mint: boolean }) {
  // 확인 안 한 필독 — 마감이 지나지 않았을 때만 강조 (홈의 미확인 필독 수와 같은 기준)
  const needsConfirm = notice.isMustRead && !notice.confirmed && !isOverdue(notice.dueDate)
  return (
    <PostIt to={`/notices/${notice.id}`} mustRead={notice.isMustRead} mint={mint && !notice.isMustRead}>
      {!notice.read && <span className="gh-unread" aria-label="안 읽음" />}
      {notice.isPinned && (
        <span className="gh-ntag">
          <IconTack />
          고정
        </span>
      )}
      <h3>{notice.title}</h3>
      <div className="gh-nm">
        <span>{noticeAuthorText(notice.author)}</span>
        <span>{formatRelative(notice.createdAt, now)}</span>
        {notice.commentCount > 0 && <span>쪽지 {notice.commentCount}</span>}
        {notice.dueDate && <span>{dueText(notice.dueDate)}</span>}
      </div>
      {needsConfirm && <p className="gh-nst">아직 확인하지 않았어요</p>}
      {notice.confirmed && <p className="gh-nst is-ok">✓ 확인했어요</p>}
    </PostIt>
  )
}
