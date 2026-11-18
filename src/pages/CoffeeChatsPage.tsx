import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { EmptyState, Ghost, IconCup, IconSearch, Pill, StorySubPage } from '@/components/story'
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
import { memberStatusLabel } from '@/features/member/labels'
import { useLoadMore } from '@/hooks/useLoadMore'
import { toApiError } from '@/lib/api'
import { formatMonthDay, formatRelative, useNowEveryMinute } from '@/lib/time'
import { cn } from '@/lib/utils'
import '@/styles/members.css'

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
        <LockPanel next={location.pathname + location.search} title="로그인하면 커피챗을 볼 수 있어요." />
      </SubPageLayout>
    )
  }

  return (
    <StorySubPage fallback="/settings" className="gh-coffee">
      <div className="gh-ch">
        <h1>내 커피챗</h1>
        <p>창문을 두드리고, 두드림을 받는 곳</p>
      </div>
      {/* 찻잔 두 개 = 받은 / 보낸 */}
      <div role="tablist" aria-label="커피챗" className="gh-cups">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab.key === t.key}
            onClick={() => setParams({ tab: t.key }, { replace: true, preventScrollReset: true })}
          >
            <IconCup />
            <b>{t.label}</b>
          </button>
        ))}
      </div>
      <ChatList key={tab.box} box={tab.box} />
    </StorySubPage>
  )
}

function ChatList({ box }: { box: CoffeeBox }) {
  const list = useCoffeeChats(box, true)
  const now = useNowEveryMinute()
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 3)
  const items = list.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div role="tabpanel">
      {list.isPending && <div className="gh-mskel mx-4 mt-6 !h-36" aria-label="불러오는 중" />}
      {list.isError && (
        <div className="px-4 pt-6">
          <EmptyState
            row
            pose="shh"
            title="커피챗을 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => list.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}
      {list.isSuccess && items.length === 0 &&
        (box === 'RECEIVED' ? (
          <section className="gh-cempty">
            <div className="gh-pic is-recv">
              <span className="gh-win" />
              <Ghost pose="b" />
            </div>
            <h2>
              아직 창문을 두드린
              <br />
              사람이 없어요
            </h2>
            <p>받은 커피챗 신청은 여기 놓아 둘게요.</p>
          </section>
        ) : (
          <section className="gh-cempty">
            <div className="gh-pic">
              <Ghost pose="glass" />
            </div>
            <h2>아직 두드린 창문이 없어요</h2>
            <p>불 켜진 집을 찾아 커피챗을 신청해 보세요.</p>
            <Link to="/find-senior" className="gh-fbtn">
              <IconSearch />
              선배 찾기
            </Link>
          </section>
        ))}
      {items.length > 0 && (
        <div className="gh-clist">
          {items.map((item) => (
            <ChatCard key={item.id} item={item} box={box} now={now} />
          ))}
        </div>
      )}
      {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
      {list.isFetchingNextPage && <div className="gh-mskel mx-4 !h-36" />}
      {showMoreButton && (
        <button type="button" className="gh-mmore" onClick={() => list.fetchNextPage()}>
          더보기
        </button>
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
    if (action === 'DECLINE' && !window.confirm('신청을 거절할까요? 상대에게 알림이 가요.')) return
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

  const stateTone = item.state === 'ACCEPTED' ? 'is-ok' : item.state === 'REQUESTED' ? 'is-wait' : ''

  return (
    <article className={cn('gh-cc', item.state === 'ACCEPTED' && 'is-open')}>
      <div className="gh-cc-h">
        {who.id == null || who.withdrawn ? (
          <b className="is-gone">탈퇴한 부원</b>
        ) : (
          <b>
            <Link to={`/members/${who.id}`}>{who.nickname}</Link>
          </b>
        )}
        {who.generation != null && (
          <small>
            {who.generation}기{who.status && ` · ${memberStatusLabel(who.status)}`}
          </small>
        )}
        <span className={cn('gh-st', stateTone)}>{STATE_LABELS[item.state] ?? '기타'}</span>
      </div>
      {who.statusNote && <p className="gh-cc-note">{who.statusNote}</p>}

      <p className="gh-cc-body">{item.purpose}</p>
      <p className="gh-cc-d">
        {formatRelative(item.createdAt, now)} 신청
        {item.state === 'REQUESTED' && item.expiresAt && ` · ${formatMonthDay(item.expiresAt)}까지 답이 없으면 만료돼요`}
      </p>

      {item.coffeeMemo && (
        <div className="gh-memo">
          <b>{box === 'SENT' ? `${who.nickname}님의 연락 방법` : '상대에게 보이는 내 한 줄'}</b>
          <p>{item.coffeeMemo}</p>
          <small>수락한 날부터 14일 동안 볼 수 있어요.</small>
        </div>
      )}

      {box === 'RECEIVED' && item.state === 'REQUESTED' && (
        <div className="gh-cc-acts">
          <Pill soft disabled={respond.isPending} onClick={() => answer('DECLINE')}>
            거절
          </Pill>
          <Pill disabled={respond.isPending} onClick={() => answer('ACCEPT')}>
            <IconCup />
            수락하고 불 켜기
          </Pill>
        </div>
      )}
      {error && (
        <p className="gh-err-line" role="alert">
          {error.text}{' '}
          {error.memo && <Link to="/settings">설정으로</Link>}
        </p>
      )}
    </article>
  )
}
