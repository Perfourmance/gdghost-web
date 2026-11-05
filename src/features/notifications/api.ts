import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { meQueryKey, type Me } from '@/features/auth/session'
import type { CursorPage } from '@/features/questions/api'
import { api } from '@/lib/api'

// 앱 내 알림 (백엔드 NotificationController). 제목 · 내용은 서버가 만들고, 갈 화면은 target으로 프론트가 정한다

export interface NotificationTarget {
  /** QUESTION · NOTICE · SHARE · FEED_POST · SCHEDULE · RECRUIT · EVENT · COFFEE_CHAT · MEMBER · SETTINGS */
  type: string
  id: number
  /** 대상 안의 위치(ANSWER · SHARE_NOTE · FEED_COMMENT · CERTIFICATION), 없으면 null */
  subType: string | null
  subId: number | null
}

export interface AppNotification {
  id: number
  /** 20종. 모르는 값은 일반 알림으로 */
  type: string
  title: string
  body: string | null
  target: NotificationTarget
  read: boolean
  createdAt: string
}

const LIST_KEY = ['notifications', 'list'] as const
const PAGE_SIZE = 20

/** 최신순. 열어도 읽음 처리하지 않는다(누른 것만 읽음) */
export function useNotificationList(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: LIST_KEY,
    queryFn: async ({ pageParam }) =>
      (
        await api.get<CursorPage<AppNotification>>('/notifications', {
          params: { cursor: pageParam ?? undefined, size: PAGE_SIZE },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
    enabled,
  })
}

/** 상단 종 배지 숫자는 /auth/me에 있다 — 여기서 받은 값으로 바꿔 둔다 */
function setUnreadCount(queryClient: ReturnType<typeof useQueryClient>, count: number) {
  queryClient.setQueryData<Me | null>(meQueryKey, (me) => (me ? { ...me, unreadNotificationCount: count } : me))
}

/** 알림 화면에 들어올 때 배지 숫자를 다시 맞춘다 (IA 2장: 앱 포커스 · 알림 화면 진입 때만) */
export async function refreshUnreadCount(queryClient: ReturnType<typeof useQueryClient>) {
  const { data } = await api.get<{ count: number }>('/notifications/unread-count')
  setUnreadCount(queryClient, data.count)
}

/** ids면 그 알림만, all이면 전부. 응답은 남은 안 읽은 수 */
export function useReadNotifications() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { ids: number[] } | { all: true }) =>
      (await api.post<{ unreadCount: number }>('/notifications/read', input)).data,
    onMutate: (input) => {
      // 누르자마자 목록에서 읽음으로 보이게
      const ids = 'ids' in input ? new Set(input.ids) : null
      queryClient.setQueryData<InfiniteData<CursorPage<AppNotification>>>(LIST_KEY, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                items: page.items.map((n) => (ids == null || ids.has(n.id) ? { ...n, read: true } : n)),
              })),
            }
          : old,
      )
    },
    onSuccess: (data) => setUnreadCount(queryClient, data.unreadCount),
    onError: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  })
}
