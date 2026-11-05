import { Link, useLocation } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { EmptyCard } from '@/features/content/Cards'
import { useNoticeList, type NoticeSummary } from '@/features/notices/api'
import { MustReadBadge, PinnedBadge } from '@/features/notices/NoticeBits'
import { dueText, isOverdue, noticeAuthorText } from '@/features/notices/format'
import { useLoadMore } from '@/hooks/useLoadMore'
import { formatRelative, useNowEveryMinute } from '@/lib/time'

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
      <SubPageLayout>
        <LockPanel next={location.pathname} title="공지는 부원만 볼 수 있어요" buttonText="로그인하고 공지 보기" />
      </SubPageLayout>
    )
  }

  const notices = list.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <SubPageLayout>
      <h1 className="text-[22px] font-bold text-title">운영진 공지</h1>

      <div className="mt-5 space-y-2 pb-6">
        {list.isPending && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[76px] w-full rounded-xl" />)}

        {list.isError && (
          <div className="space-y-3 rounded-xl bg-card p-5 text-center" role="alert">
            <p className="text-sm">공지를 불러오지 못했어요.</p>
            <Button variant="secondary" onClick={() => list.refetch()}>
              다시 시도
            </Button>
          </div>
        )}

        {list.isSuccess && notices.length === 0 && (
          <EmptyCard>아직 올라온 공지가 없어요. 새 공지가 올라오면 알려 드릴게요.</EmptyCard>
        )}

        {notices.map((notice) => (
          <NoticeRow key={notice.id} notice={notice} now={now} />
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
    </SubPageLayout>
  )
}

function NoticeRow({ notice, now }: { notice: NoticeSummary; now: number }) {
  // 확인 안 한 필독 — 마감이 지나지 않았을 때만 강조 (홈의 미확인 필독 수와 같은 기준)
  const needsConfirm = notice.isMustRead && !notice.confirmed && !isOverdue(notice.dueDate)
  return (
    <Link
      to={`/notices/${notice.id}`}
      className="block w-full rounded-xl bg-card px-4 py-3.5 text-left transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-1.5">
        {notice.isPinned && <PinnedBadge />}
        {notice.isMustRead && <MustReadBadge />}
        <p className="line-clamp-1 flex-1 text-[15px] font-bold text-title">{notice.title}</p>
        {!notice.read && <span className="size-2 shrink-0 rounded-full bg-brand" aria-label="안 읽음" />}
      </div>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        <span>{noticeAuthorText(notice.author)}</span>
        <span aria-hidden>·</span>
        <span>{formatRelative(notice.createdAt, now)}</span>
        {notice.commentCount > 0 && (
          <>
            <span aria-hidden>·</span>
            <span>댓글 {notice.commentCount}</span>
          </>
        )}
        {notice.dueDate && (
          <>
            <span aria-hidden>·</span>
            <span>{dueText(notice.dueDate)}</span>
          </>
        )}
      </p>
      {needsConfirm && <p className="mt-1 text-xs font-bold text-brand-text">아직 확인하지 않았어요</p>}
      {notice.confirmed && <p className="mt-1 text-xs text-brand-text">✓ 확인함</p>}
    </Link>
  )
}
