import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { MemberStatus } from '@/features/member/labels'
import type { CursorPage } from '@/features/questions/api'
import { api, idempotencyHeader, type ApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'

// 커피챗 (백엔드 CoffeeChatController). 연락 수단은 주고받지 않고, 수락되면 받은 사람의 메모가 14일 동안 보인다 (F3-06)

export const PURPOSE_MIN = 10
export const PURPOSE_MAX = 200

export type CoffeeChatState = 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'
export type CoffeeBox = 'RECEIVED' | 'SENT'

export interface CoffeeChatItem {
  id: number
  state: CoffeeChatState
  /** 탈퇴했으면 id 없이 '탈퇴한 부원' */
  counterpart: {
    id: number | null
    nickname: string
    generation: number | null
    status: MemberStatus | null
    statusNote: string | null
    withdrawn: boolean
  }
  purpose: string
  createdAt: string
  respondedAt: string | null
  /** 응답 대기일 때만 — 신청 + 7일 */
  expiresAt: string | null
  /** 수락하고 14일 안일 때만 */
  coffeeMemo?: string
}

const PAGE_SIZE = 20

export function useCoffeeChats(box: CoffeeBox, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['coffee', box],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<CursorPage<CoffeeChatItem>>('/me/coffee-chats', {
          params: { box, cursor: pageParam ?? undefined, size: PAGE_SIZE },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
    enabled,
  })
}

export function useRequestCoffeeChat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ input, key }: { input: { receiverId: number; purpose: string }; key: string }) =>
      (await api.post<CoffeeChatItem>('/coffee-chats', input, { headers: idempotencyHeader(key) })).data,
    // 성공이든 이미 신청함 · 기다리는 기간이든 프로필의 신청 상태를 다시 맞춘다
    onSettled: (_data, _error, { input }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['members', 'profile', input.receiverId] }),
        queryClient.invalidateQueries({ queryKey: ['coffee', 'SENT'] }),
      ]),
  })
}

export function useRespondCoffeeChat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'ACCEPT' | 'DECLINE' }) =>
      (await api.patch<CoffeeChatItem>(`/coffee-chats/${id}`, { action })).data,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['coffee', 'RECEIVED'] }),
  })
}

/** 2026-11-20 → "11월 20일" (서버 문구의 날짜를 읽어 쓴다) */
function cooldownDate(message: string): string | null {
  const m = message.match(/(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${Number(m[2])}월 ${Number(m[3])}일` : null
}

export function requestErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'COFFEE_DISABLED':
      return '지금은 이 부원에게 커피챗을 신청할 수 없어요.'
    case 'COFFEE_PENDING_EXISTS':
      return '이미 신청했어요. 상대의 응답을 기다리고 있어요.'
    case 'COFFEE_COOLDOWN': {
      const date = cooldownDate(error.message)
      return date ? `${date}부터 다시 신청할 수 있어요.` : '거절·만료 후 14일이 지나면 다시 신청할 수 있어요.'
    }
    case 'NOT_FOUND':
      return '이 부원에게는 지금 커피챗을 신청할 수 없어요.'
    case 'VALIDATION_FAILED':
      if (error.fieldMessage('receiverId')) return '나에게는 신청할 수 없어요.'
      return `궁금한 점을 ${PURPOSE_MIN}~${PURPOSE_MAX}자로 적어 주세요.`
    default:
      return commonErrorMessage(error)
  }
}

/** 수락 메모가 없어서 실패했는지 — 설정으로 안내한다 */
export function isMissingMemo(error: ApiError): boolean {
  return error.code === 'VALIDATION_FAILED' && error.fieldMessage('coffeeMemo') != null
}

export function respondErrorMessage(error: ApiError): string {
  if (isMissingMemo(error)) return '수락 전 설정에서 상대에게 보일 연락 방법을 적어 주세요.'
  switch (error.code) {
    case 'COFFEE_ALREADY_RESPONDED':
      return '이미 응답했거나 7일이 지나 만료된 신청이에요.'
    case 'FORBIDDEN':
      return '받은 신청에만 응답할 수 있어요.'
    case 'NOT_FOUND':
      return '신청을 찾을 수가 없어요.'
    default:
      return commonErrorMessage(error)
  }
}
