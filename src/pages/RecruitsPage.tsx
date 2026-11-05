import { UsersRound } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Chip } from '@/components/Chip'
import { SegmentTabs } from '@/components/layout/SegmentTabs'
import { SCHEDULE_SEGMENTS } from '@/components/layout/segments'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { EmptyCard } from '@/features/content/Cards'
import { recruitKindLabel } from '@/features/content/labels'
import { RECRUIT_KINDS, useRecruitList } from '@/features/recruits/api'
import { RecruitCard } from '@/features/recruits/RecruitBits'
import { RecruitSheet } from '@/features/recruits/RecruitSheet'
import { useLoadMore } from '@/hooks/useLoadMore'

/** 모집 목록 (S33) — 택시 · 공모전 팀원 · 구독 공유. 누르면 상세 시트(?open=id, 마감 임박 알림도 이 주소로 온다) */
export function RecruitsPage() {
  const { data: me } = useMe()
  const member = me != null
  const [params, setParams] = useSearchParams()

  const rawKind = params.get('kind')
  const kind = rawKind && (RECRUIT_KINDS as readonly string[]).includes(rawKind) ? rawKind : null
  const openId = Number(params.get('open'))
  const open = Number.isInteger(openId) && openId > 0 ? openId : null

  const list = useRecruitList(kind, member)
  const { isFetchingNextPage, fetchNextPage } = list
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 3)
  const recruits = list.data?.pages.flatMap((page) => page.items) ?? []

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value == null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  if (!member) {
    return (
      <div className="pb-4">
        <h1 className="sr-only">모집</h1>
        <SegmentTabs items={SCHEDULE_SEGMENTS} label="일정 탭" />
        <div className="mt-6">
          <LockPanel
            next={`/recruits${params.toString() ? `?${params}` : ''}`}
            title="모집은 부원만 볼 수 있어요"
            buttonText="로그인하고 모집 보기"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20">
      <h1 className="sr-only">모집</h1>
      <SegmentTabs items={SCHEDULE_SEGMENTS} label="일정 탭" />

      <div className="-mx-4 mt-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex w-max gap-2">
          <Chip selected={kind == null} onClick={() => update('kind', null)}>
            전체
          </Chip>
          {RECRUIT_KINDS.map((k) => (
            <Chip key={k} selected={kind === k} onClick={() => update('kind', kind === k ? null : k)}>
              {recruitKindLabel(k)}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {list.isPending && [0, 1, 2].map((i) => <Skeleton key={i} className="h-[84px] w-full rounded-xl" />)}

        {list.isError && (
          <div className="space-y-3 rounded-xl bg-card p-5 text-center" role="alert">
            <p className="text-sm">모집을 불러오지 못했어요.</p>
            <Button variant="secondary" onClick={() => list.refetch()}>
              다시 시도
            </Button>
          </div>
        )}

        {list.isSuccess && recruits.length === 0 && (
          <EmptyCard>
            {kind ? `${recruitKindLabel(kind)} 모집이 없어요.` : '열린 모집이 없어요.'} 택시나 팀원이 필요하면 모집을 열어 보세요.
          </EmptyCard>
        )}

        {recruits.map((r) => (
          <RecruitCard key={r.id} recruit={r} onOpen={(id) => update('open', String(id))} />
        ))}

        {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
        {isFetchingNextPage && <Skeleton className="h-[84px] w-full rounded-xl" />}
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
        <Link to="/recruits/new" className={writeButtonClass}>
          <UsersRound aria-hidden />
          모집 열기
        </Link>
      </div>

      <RecruitSheet recruitId={open} onClose={() => update('open', null)} />
    </div>
  )
}

const writeButtonClass = buttonVariants({
  size: 'lg',
  className: 'pointer-events-auto h-12 rounded-full px-5 text-[15px] font-bold shadow-lg',
})
