import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Award,
  Bell,
  Bookmark,
  CalendarDays,
  Coffee,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { EmptyCard } from '@/features/content/Cards'
import {
  refreshUnreadCount,
  useNotificationList,
  useReadNotifications,
  type AppNotification,
} from '@/features/notifications/api'
import { notificationPath } from '@/features/notifications/targetPath'
import { useLoadMore } from '@/hooks/useLoadMore'
import { formatRelative, useNowEveryMinute } from '@/lib/time'
import { cn } from '@/lib/utils'

const TARGET_ICONS: Record<string, LucideIcon> = {
  QUESTION: MessageCircle,
  NOTICE: Megaphone,
  SHARE: Bookmark,
  FEED_POST: MessagesSquare,
  SCHEDULE: CalendarDays,
  RECRUIT: Users,
  EVENT: Award,
  COFFEE_CHAT: Coffee,
  MEMBER: UserRound,
  SETTINGS: Settings,
}

/** 알림 (S61) — 최신순, 누른 것만 읽음. 누르면 그 글 · 화면으로 (IA 5장) */
export function NotificationsPage() {
  const { data: me } = useMe()
  const location = useLocation()

  if (!me) {
    return (
      <SubPageLayout>
        <LockPanel next={location.pathname} title="알림은 부원만 볼 수 있어요" />
      </SubPageLayout>
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

  const readAll = hasUnread ? (
    <button
      type="button"
      disabled={read.isPending}
      onClick={() => read.mutate({ all: true })}
      className="px-2 py-1 text-sm font-bold text-brand-text disabled:opacity-50"
    >
      모두 읽음
    </button>
  ) : null

  return (
    <SubPageLayout actions={readAll}>
      <h1 className="text-[22px] font-bold text-title">알림</h1>

      <div className="mt-5 space-y-2 pb-6">
        {list.isPending && [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[72px] w-full rounded-xl" />)}

        {list.isError && (
          <div className="space-y-3 rounded-xl bg-card p-5 text-center" role="alert">
            <p className="text-sm">알림을 불러오지 못했어요.</p>
            <Button variant="secondary" onClick={() => list.refetch()}>
              다시 시도
            </Button>
          </div>
        )}

        {list.isSuccess && notifications.length === 0 && (
          <EmptyCard>아직 알림이 없어요. 내 질문에 답변이 달리면 여기서 알려 드릴게요.</EmptyCard>
        )}

        {notifications.map((n) => (
          <NotificationRow key={n.id} notification={n} now={now} onOpen={() => handleOpen(n)} />
        ))}

        {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
        {isFetchingNextPage && <Skeleton className="h-[72px] w-full rounded-xl" />}
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

        {list.isSuccess && notifications.length > 0 && !list.hasNextPage && (
          <p className="pt-2 text-center text-xs text-muted-foreground">알림은 90일 동안 보관돼요.</p>
        )}
      </div>
    </SubPageLayout>
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
  const Icon = TARGET_ICONS[notification.target.type] ?? Bell
  const unread = !notification.read
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-accent',
        unread ? 'bg-card' : 'bg-transparent',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
          unread ? 'bg-brand-soft text-brand-text' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-sm leading-snug', unread ? 'font-bold text-title' : 'text-muted-foreground')}>
          {notification.title}
        </span>
        {notification.body && (
          <span className={cn('mt-0.5 line-clamp-2 block text-sm', unread ? 'text-foreground' : 'text-muted-foreground')}>
            {notification.body}
          </span>
        )}
        <span className="mt-1 block text-xs text-muted-foreground">{formatRelative(notification.createdAt, now)}</span>
      </span>
      {unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" aria-label="안 읽음" />}
    </button>
  )
}
