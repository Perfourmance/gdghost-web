import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { LoadError } from '@/components/PageStates'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import {
  isMissingMemo,
  respondErrorMessage,
  useCoffeeChats,
  useRespondCoffeeChat,
  type CoffeeBox,
  type CoffeeChatItem,
  type CoffeeChatState,
} from '@/features/coffee/api'
import { EmptyCard } from '@/features/content/Cards'
import { memberStatusLabel } from '@/features/member/labels'
import { useLoadMore } from '@/hooks/useLoadMore'
import { toApiError } from '@/lib/api'
import { formatMonthDay, formatRelative, useNowEveryMinute } from '@/lib/time'
import { cn } from '@/lib/utils'

const TABS: { key: string; box: CoffeeBox; label: string }[] = [
  { key: 'received', box: 'RECEIVED', label: '받은 신청' },
  { key: 'sent', box: 'SENT', label: '보낸 신청' },
]

/** 내 커피챗 (S63) — 받은 신청 / 보낸 신청. 알림 주소 `?tab=received|sent` */
export function CoffeeChatsPage() {
  const { data: me } = useMe()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((t) => t.key === params.get('tab')) ?? TABS[0]

  if (!me) {
    return (
      <SubPageLayout fallback="/">
        <LockPanel next={location.pathname + location.search} title="커피챗은 로그인 후에 볼 수 있어요" />
      </SubPageLayout>
    )
  }

  return (
    <SubPageLayout fallback="/settings">
      <h1 className="text-[22px] leading-snug font-bold text-title">내 커피챗</h1>
      <div role="tablist" aria-label="커피챗" className="mt-5 grid grid-cols-2 rounded-lg bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab.key === t.key}
            onClick={() => setParams({ tab: t.key }, { replace: true })}
            className={cn(
              'rounded-md py-2 text-sm transition-colors',
              tab.key === t.key ? 'bg-brand-soft font-bold text-brand-text' : 'text-muted-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ChatList key={tab.box} box={tab.box} />
    </SubPageLayout>
  )
}

function ChatList({ box }: { box: CoffeeBox }) {
  const list = useCoffeeChats(box, true)
  const now = useNowEveryMinute()
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 3)
  const items = list.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div role="tabpanel" className="mt-4 space-y-2 pb-10">
      {list.isPending && [0, 1].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      {list.isError && <LoadError text="커피챗을 불러오지 못했어요." onRetry={() => list.refetch()} />}
      {list.isSuccess && items.length === 0 && (
        <EmptyCard
          action={
            box === 'SENT' && (
              <Link to="/find-senior" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                선배 찾기
              </Link>
            )
          }
        >
          {box === 'RECEIVED' ? '아직 받은 신청이 없어요.' : '아직 보낸 신청이 없어요. 이야기 나누고 싶은 선배에게 신청해 보세요.'}
        </EmptyCard>
      )}
      {items.map((item) => (
        <ChatCard key={item.id} item={item} box={box} now={now} />
      ))}
      {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
      {list.isFetchingNextPage && <Skeleton className="h-32 w-full rounded-xl" />}
      {showMoreButton && (
        <Button variant="secondary" className="w-full" onClick={() => list.fetchNextPage()}>
          더보기
        </Button>
      )}
    </div>
  )
}

const STATE_LABELS: Record<CoffeeChatState, string> = {
  REQUESTED: '응답 대기',
  ACCEPTED: '수락',
  DECLINED: '거절',
  EXPIRED: '만료',
}

function ChatCard({ item, box, now }: { item: CoffeeChatItem; box: CoffeeBox; now: number }) {
  const { counterpart: who } = item
  const respond = useRespondCoffeeChat()
  const [error, setError] = useState<{ text: string; memo: boolean } | null>(null)

  function answer(action: 'ACCEPT' | 'DECLINE') {
    if (action === 'DECLINE' && !window.confirm('신청을 거절할까요? 상대에게 거절 알림이 가요.')) return
    setError(null)
    respond.mutate(
      { id: item.id, action },
      {
        onError: (e) => {
          const apiError = toApiError(e)
          setError({ text: respondErrorMessage(apiError), memo: isMissingMemo(apiError) })
        },
      },
    )
  }

  return (
    <article className="rounded-xl bg-card px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm">
          {who.id == null || who.withdrawn ? (
            <span className="font-bold text-muted-foreground">탈퇴한 부원</span>
          ) : (
            <Link to={`/members/${who.id}`} className="font-bold text-title hover:underline">
              {who.nickname}
            </Link>
          )}
          {who.generation != null && (
            <span className="ml-1.5 text-xs text-muted-foreground">
              {who.generation}기{who.status && ` · ${memberStatusLabel(who.status)}`}
            </span>
          )}
        </p>
        <span
          className={cn(
            'shrink-0 text-xs font-bold',
            item.state === 'ACCEPTED' || item.state === 'REQUESTED' ? 'text-brand-text' : 'text-muted-foreground',
          )}
        >
          {STATE_LABELS[item.state] ?? '기타'}
        </span>
      </div>
      {who.statusNote && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{who.statusNote}</p>}

      <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-foreground">{item.purpose}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {formatRelative(item.createdAt, now)} 신청
        {item.state === 'REQUESTED' && item.expiresAt && ` · ${formatMonthDay(item.expiresAt)}까지 응답이 없으면 만료돼요`}
      </p>

      {item.coffeeMemo && (
        <div className="mt-3 rounded-lg bg-brand-soft px-3 py-2.5 text-sm">
          <p className="text-xs font-bold text-brand-text">{box === 'SENT' ? `${who.nickname}님의 연락 방법` : '상대에게 보이는 내 한 줄'}</p>
          <p className="mt-0.5 break-all text-foreground">{item.coffeeMemo}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">수락하고 14일 동안만 보여요.</p>
        </div>
      )}

      {box === 'RECEIVED' && item.state === 'REQUESTED' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" className="h-10" disabled={respond.isPending} onClick={() => answer('DECLINE')}>
            거절
          </Button>
          <Button className="h-10" disabled={respond.isPending} onClick={() => answer('ACCEPT')}>
            수락
          </Button>
        </div>
      )}
      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error.text}{' '}
          {error.memo && (
            <Link to="/settings" className="font-bold underline underline-offset-2">
              설정으로
            </Link>
          )}
        </p>
      )}
    </article>
  )
}
