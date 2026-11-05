import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Author } from '@/features/member/author'
import type { CursorPage } from '@/features/questions/api'
import { uploadErrorMessage } from '@/features/uploads/api'
import { api, idempotencyHeader, type ApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'

// 이벤트 · 인증 (백엔드 EventController · CertificationController). 부원만 — 비회원은 401

export const BODY_MAX = 100

/** 오늘(한국 날짜)로 계산 — 예정 · 진행 중 · 지난 */
export type EventState = 'UPCOMING' | 'ONGOING' | 'ENDED'

export interface EventSummary {
  id: number
  name: string
  startDate: string
  endDate: string
  state: EventState
  photoRequired: boolean
  /** 인증을 올린 사람 수 */
  participantCount: number
  /** 인증된 글 수 */
  approvedCount: number
  my: { approvedCount: number; pendingCount: number }
}

export interface EventDetail {
  id: number
  name: string
  description: string | null
  requirement: string | null
  /** 4단계 안내 (없을 수 있음) */
  guideSteps: string[]
  startDate: string
  endDate: string
  state: EventState
  my: { approvedCount: number; pendingCount: number; rejected: { id: number; rejectReason: string }[] }
  /** 인증 횟수 상위 10명, 같은 횟수는 같은 순위 */
  ranking: { rank: number; member: { id: number; nickname: string | null; generation: number }; approvedCount: number }[]
  /** 운영진에게만, 아니면 null */
  pendingCount: number | null
  /** 인증에 사진이 꼭 있어야 하는지 (운영진이 이벤트마다 정한다) */
  photoRequired: boolean
}

export interface Photo {
  objectKey: string
  /** 1시간짜리 서명 주소 */
  url: string
  urlExpiresAt: string
  sortOrder: number
}

export type CertificationState = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface CertificationItem {
  id: number
  author: Author
  body: string
  photos: Photo[]
  state: CertificationState
  /** 작성자 본인과 운영진에게만 */
  rejectReason: string | null
  mine: boolean
  createdAt: string
}

/** 진행 중 → 예정 → 지난 순, 전부 */
export function useEventList(enabled: boolean) {
  return useQuery({
    queryKey: ['events', 'list'],
    queryFn: async () => (await api.get<{ items: EventSummary[] }>('/events')).data.items,
    enabled,
  })
}

export function useEventDetail(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ['events', 'detail', id],
    queryFn: async () => (await api.get<EventDetail>(`/events/${id}`)).data,
    enabled,
  })
}

/** 최신순. 부원에게는 인증된 글과 내 글만 */
export function useCertificationList(eventId: number, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['events', 'certifications', eventId],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<CursorPage<CertificationItem>>(`/events/${eventId}/certifications`, {
          params: { cursor: pageParam ?? undefined, size: 20 },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
    enabled,
  })
}

function useRefreshEvent(eventId: number) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['events', 'detail', eventId] }),
      queryClient.invalidateQueries({ queryKey: ['events', 'certifications', eventId] }),
      queryClient.invalidateQueries({ queryKey: ['events', 'list'] }),
    ])
}

export function useSubmitCertification(eventId: number) {
  const refresh = useRefreshEvent(eventId)
  return useMutation({
    mutationFn: async ({ input, key }: { input: { body: string; photoKeys: string[] }; key: string }) =>
      (
        await api.post<CertificationItem>(`/events/${eventId}/certifications`, input, {
          headers: idempotencyHeader(key),
        })
      ).data,
    onSuccess: refresh,
  })
}

/** 반려된 인증 다시 올리기 — 보낸 필드만 바뀌고, photoKeys를 보내면 사진을 통째로 바꾼다 */
export function useResubmitCertification(eventId: number) {
  const refresh = useRefreshEvent(eventId)
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: { body?: string; photoKeys?: string[] } }) =>
      (await api.patch<CertificationItem>(`/certifications/${id}`, input)).data,
    onSuccess: refresh,
  })
}

export function certificationErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'EVENT_CLOSED':
      return '이벤트 기간이 아니라서 올릴 수 없어요.'
    case 'CERT_NOT_REJECTED':
      return '반려된 인증만 다시 올릴 수 있어요. 화면을 새로 불러왔어요.'
    case 'NOT_AUTHOR':
      return '내 인증만 다시 올릴 수 있어요.'
    case 'NOT_FOUND':
      return '이벤트나 인증을 찾을 수 없어요.'
    case 'VALIDATION_FAILED':
      if (error.fieldMessage('photoKeys')) return '이 이벤트는 사진이 있어야 인증할 수 있어요.'
      return error.fieldMessage('body') ? '한 줄은 1–100자로 써 주세요.' : '입력한 내용을 다시 확인해 주세요.'
    case 'UPLOAD_NOT_FOUND':
    case 'UPLOAD_TOO_LARGE':
    case 'UPLOAD_TYPE_NOT_ALLOWED':
    case 'UPLOAD_PUT_FAILED':
      return uploadErrorMessage(error)
    default:
      return error.status === 429 ? uploadErrorMessage(error) : commonErrorMessage(error)
  }
}
