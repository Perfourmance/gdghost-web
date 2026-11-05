import { Link, useLocation } from 'react-router'
import { LoadError } from '@/components/PageStates'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { EmptyCard } from '@/features/content/Cards'
import { useSavedShares } from '@/features/shares/api'
import { ShareListCard } from '@/features/shares/ShareBits'
import { useLoadMore } from '@/hooks/useLoadMore'
import { useNowEveryMinute } from '@/lib/time'

/** 저장한 공유 (설정 · 공유 목록에서) — 최근 저장한 순 */
export function SavedSharesPage() {
  const { data: me } = useMe()
  const location = useLocation()
  const list = useSavedShares(me != null)
  const now = useNowEveryMinute()
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 3)

  if (!me) {
    return (
      <SubPageLayout fallback="/shares">
        <LockPanel next={location.pathname} title="저장한 공유는 로그인 후에 볼 수 있어요" />
      </SubPageLayout>
    )
  }

  const items = list.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <SubPageLayout fallback="/settings">
      <h1 className="text-[22px] leading-snug font-bold text-title">저장한 공유</h1>
      <div className="mt-5 space-y-2 pb-10">
        {list.isPending && [0, 1, 2].map((i) => <Skeleton key={i} className="h-[92px] w-full rounded-xl" />)}
        {list.isError && <LoadError text="저장한 공유를 불러오지 못했어요." onRetry={() => list.refetch()} />}
        {list.isSuccess && items.length === 0 && (
          <EmptyCard
            action={
              <Link to="/shares" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                공유 둘러보기
              </Link>
            }
          >
            아직 저장한 공유가 없어요. 다시 보고 싶은 글을 저장해 두세요.
          </EmptyCard>
        )}
        {items.map((s) => (
          <ShareListCard key={s.id} share={s} target={{ member: true, onLocked: () => {} }} now={now} />
        ))}
        {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
        {list.isFetchingNextPage && <Skeleton className="h-[92px] w-full rounded-xl" />}
        {showMoreButton && (
          <Button variant="secondary" className="w-full" onClick={() => list.fetchNextPage()}>
            더보기
          </Button>
        )}
      </div>
    </SubPageLayout>
  )
}
