import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CursorPage } from '@/features/questions/api'
import { api, idempotencyHeader, type ApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'

// 모집 (백엔드 RecruitController). 부원만 — 비회원은 401

export const RECRUIT_KINDS = ['TAXI', 'CONTEST', 'SUBSCRIPTION', 'ETC'] as const
export const TITLE_MIN = 2
export const TITLE_MAX = 60
export const MEMO_MAX = 500
/** 개설자 포함 */
export const CAPACITY_MIN = 2
export const CAPACITY_MAX = 50
/** 만나는 시각은 지금부터 90일 안 */
export const MAX_AHEAD_DAYS = 90

/** 탈퇴했으면 nickname은 null */
export interface RecruitPerson {
  id: number
  nickname: string | null
}

export interface RecruitSummary {
  id: number
  kind: string
  title: string
  meetAt: string
  /** 개설자 포함 */
  capacity: number
  joinedCount: number
  /** 다 찼거나 시간이 지났거나 개설자가 닫았으면 CLOSED */
  state: 'OPEN' | 'CLOSED'
  joined: boolean
  mine: boolean
  author: RecruitPerson
  memo: string | null
}

export interface RecruitDetail extends RecruitSummary {
  /** 참여한 순 (개설자가 맨 앞) */
  participants: RecruitPerson[]
}

export interface RecruitInput {
  kind: string
  title: string
  meetAt: string
  capacity: number
  memo: string | null
  scheduleId: number | null
}

interface JoinResponse {
  joined: boolean
  joinedCount: number
  capacity: number
  state: 'OPEN' | 'CLOSED'
}

const PAGE_SIZE = 20

/** 모집중이 위, 그 안에서 만나는 시각이 가까운 순. 만난 지 7일 넘은 모집은 빠진다 */
export function useRecruitList(kind: string | null, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['recruits', 'list', kind],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<CursorPage<RecruitSummary>>('/recruits', {
          params: { kind: kind ?? undefined, cursor: pageParam ?? undefined, size: PAGE_SIZE },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
    enabled,
  })
}

export function useRecruitDetail(id: number | null) {
  return useQuery({
    queryKey: ['recruits', 'detail', id],
    queryFn: async () => (await api.get<RecruitDetail>(`/recruits/${id}`)).data,
    enabled: id != null,
  })
}

function useRefreshRecruits() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['recruits'] }),
      // 일정 상세의 연결된 모집
      queryClient.invalidateQueries({ queryKey: ['schedules', 'detail'] }),
    ])
}

export function useCreateRecruit() {
  const refresh = useRefreshRecruits()
  return useMutation({
    mutationFn: async ({ input, key }: { input: RecruitInput; key: string }) =>
      (await api.post<RecruitSummary>('/recruits', input, { headers: idempotencyHeader(key) })).data,
    onSuccess: refresh,
  })
}

/** 참여 · 참여 취소 · 모집 닫기. 성공이든 실패든(이미 마감 등) 지금 상태로 다시 맞춘다 */
export function useRecruitActions(id: number) {
  const refresh = useRefreshRecruits()
  const join = useMutation({
    mutationFn: async () => (await api.post<JoinResponse>(`/recruits/${id}/participants`)).data,
    onSettled: refresh,
  })
  const leave = useMutation({
    mutationFn: async () => (await api.delete<JoinResponse>(`/recruits/${id}/participants/me`)).data,
    onSettled: refresh,
  })
  const close = useMutation({
    mutationFn: async () => (await api.post<{ state: string }>(`/recruits/${id}/closure`)).data,
    onSettled: refresh,
  })
  return { join, leave, close }
}

export function recruitErrorMessage(error: ApiError | null): string | null {
  if (!error) return null
  switch (error.code) {
    case 'RECRUIT_FULL':
      return '아쉽게도 정원이 다 찼어요.'
    case 'RECRUIT_CLOSED':
      return '마감된 모집이에요.'
    case 'ALREADY_JOINED':
      return '이미 참여한 모집이에요.'
    case 'RECRUIT_OWNER_CANNOT_LEAVE':
      return '모집을 연 사람은 참여를 취소할 수 없어요. 대신 모집을 닫아 주세요.'
    case 'RECRUIT_TIME_PAST':
      return '지난 시각은 고를 수 없어요.'
    case 'NOT_AUTHOR':
      return '모집을 연 사람만 닫을 수 있어요.'
    case 'NOT_FOUND':
      return '모집이나 연결한 일정을 찾을 수 없어요.'
    case 'VALIDATION_FAILED':
      return '입력한 내용을 다시 확인해 주세요.'
    default:
      return commonErrorMessage(error)
  }
}
