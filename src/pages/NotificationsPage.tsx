import { useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import {
  EmptyState,
  IconBell,
  IconBookmark,
  IconCalendar,
  IconChat,
  IconCheck,
  IconCup,
  IconFeed,
  IconPeople,
  IconStar,
  IconTack,
  IconUser,
  Pill,
  StorySubPage,
} from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import {
  refreshUnreadCount,
  useNotificationList,
  useReadNotifications,
  type AppNotification,
} from '@/features/notifications/api'
import { notificationPath } from '@/features/notifications/targetPath'
import { useLoadMore } from '@/hooks/useLoadMore'
import { formatRelative, useNowEveryMinute } from '@/lib/time'
import '@/styles/common.css'

const TARGET_ICONS: Record<string, (p: { className?: string }) => ReactNode> = {
  QUESTION: IconChat,
  NOTICE: IconTack,
  SHARE: IconBookmark,
  FEED_POST: IconFeed,
  SCHEDULE: IconCalendar,
  RECRUIT: IconPeople,
  EVENT: IconStar,
  COFFEE_CHAT: IconCup,
  MEMBER: IconUser,
  SETTINGS: IconBell,
}

/** 알림 (S61) — 최신순, 누른 것만 읽음. 누르면 그 글 · 화면으로 (IA 5장) */
export function NotificationsPage() {
  const { data: me } = useMe()
  const location = useLocation()

  if (!me) {
    return (
      <LockPanel next={location.pathname} title="알림은 부원만 볼 수 있어요." />
    )
  }
  return <NotificationList myId={me.id} staff={me.role === 'STAFF'} unreadCount={me.unreadNotificationCount} />
}

function NotificationList({ myId, staff, unreadCount }: { myId: number; staff: boolean; unreadCount: number }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const list = useNotificationList(true)
  const read = useReadNotifications()
  const now = useNowEveryMinute()
  const { isFetchingNextPage, fetchNextPage } = list
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 3)

  // 들어올 때 배지 숫자를 다시 맞춘다. 실패해도 화면은 그대로
  useEffect(() => {
    refreshUnreadCount(queryClient).catch(() => {})
  }, [queryClient])

  const notifications = list.data?.pages.flatMap((page) => page.items) ?? []
  const hasUnread = unreadCount > 0 || notifications.some((n) => !n.read)

  function handleOpen(notification: AppNotification) {
    if (!notification.read) read.mutate({ ids: [notification.id] })
    const path = notificationPath(notification, myId, staff)
    if (path) navigate(path)
  }

  const unread = notifications.filter((n) => !n.read)
  const seen = notifications.filter((n) => n.read)

  return (
    <StorySubPage>
      <div className="gh-cttl">
        <h1>알림</h1>
        {hasUnread && (
          <button type="button" disabled={read.isPending} onClick={() => read.mutate({ all: true })}>
            <IconCheck />
            모두 읽은 상태로 표시
          </button>
        )}
      </div>

      {list.isPending && [0, 1, 2].map((i) => <div key={i} className="gh-cskel" />)}

      {list.isError && (
        <div className="px-4 pt-6">
          <EmptyState
            row
            pose="shh"
            title="알림을 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => list.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}

      {list.isSuccess && notifications.length === 0 && (
        <div className="px-4 pt-6">
          <EmptyState pose="b" title="아직 켜진 창문이 없어요">
            답장이나 공지가 오면 여기 불이 켜져요.
          </EmptyState>
        </div>
      )}

      {unread.length > 0 && (
        <>
          <h2 className="gh-nsh">
            <i aria-hidden />불 켜진 창문<b>{unread.length}</b>
          </h2>
          <div className="gh-nrows">
            {unread.map((n) => (
              <NotificationRow key={n.id} notification={n} now={now} onOpen={() => handleOpen(n)} />
            ))}
          </div>
        </>
      )}
      {seen.length > 0 && (
        <>
          <h2 className="gh-nsh">
            <i className="is-off" aria-hidden />불 끈 창문<b>{seen.length}</b>
          </h2>
          <div className="gh-nrows is-off">
            {seen.map((n) => (
              <NotificationRow key={n.id} notification={n} now={now} onOpen={() => handleOpen(n)} />
            ))}
          </div>
        </>
      )}

      {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
      {isFetchingNextPage && <div className="gh-cskel" />}
      {(showMoreButton || list.isFetchNextPageError) && (
        <button type="button" className="gh-cmore" onClick={() => fetchNextPage()}>
          {list.isFetchNextPageError ? '더 불러오지 못했어요. 다시 시도' : '더보기'}
        </button>
      )}

      {list.isSuccess && notifications.length > 0 && !list.hasNextPage && <p className="gh-nfoot-t">알림은 90일 동안 보관해요</p>}
      <div className="gh-nfoot" aria-hidden />
    </StorySubPage>
  )
}

function NotificationRow({
  notification,
  now,
  onOpen,
}: {
  notification: AppNotification
  now: number
  onOpen: () => void
}) {
  const Icon = TARGET_ICONS[notification.target.type] ?? IconBell
  return (
    <button type="button" onClick={onOpen} className="gh-nr">
      <span className="gh-nw" aria-hidden>
        <Icon />
      </span>
      <div>
        <b>
          {notification.title}
          {!notification.read && <span className="sr-only"> (읽지 않음)</span>}
        </b>
        {notification.body && <p>{notification.body}</p>}
        <small>{formatRelative(notification.createdAt, now)}</small>
      </div>
    </button>
  )
}
