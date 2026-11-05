import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { CertificationState, EventDetail, Photo } from '@/features/events/api'
import type { Author } from '@/features/member/author'
import type { NoticeDetail } from '@/features/notices/api'
import { OPS_PAGE_SIZE, type OpsPage } from '@/features/ops/api'
import { api, idempotencyHeader, type ApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'

// 운영 콘텐츠 — 공지 관리 · 이벤트 · 인증 확인 (백엔드 OpsNoticeController · OpsEventController · OpsCertificationController)

// ── 공지 ──

export const NOTICE_TITLE_MIN = 2
export const NOTICE_TITLE_MAX = 80
export const NOTICE_BODY_MAX = 5000

export interface OpsNotice {
  id: number
  title: string
  isPinned: boolean
  isMustRead: boolean
  dueDate: string | null
  author: { id: number; nickname: string | null }
  /** 탈퇴 · 정지 제외, N명 중 M명 */
  stats: { memberCount: number; readCount: number; confirmedCount: number }
  commentCount: number
  /** 한 번 더 알린 시각 (공지당 1회) */
  remindedAt: string | null
  createdAt: string
}

export interface NoticeInput {
  title: string
  body: string
  isPinned: boolean
  isMustRead: boolean
  /** "2026-11-20", 없으면 상시 */
  dueDate: string | null
}

export function useOpsNotices(page: number) {
  return useQuery({
    queryKey: ['ops', 'notices', page],
    queryFn: async () =>
      (await api.get<OpsPage<OpsNotice>>('/ops/notices', { params: { page, size: OPS_PAGE_SIZE } })).data,
    placeholderData: keepPreviousData,
  })
}

function refreshNotices(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['ops', 'notices'] })
  void queryClient.invalidateQueries({ queryKey: ['ops', 'dashboard'] })
  void queryClient.invalidateQueries({ queryKey: ['notices'] })
  void queryClient.invalidateQueries({ queryKey: ['home'] })
}

export function useCreateNotice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ input, key }: { input: NoticeInput; key: string }) =>
      (
        await api.post<NoticeDetail>(
          '/ops/notices',
          { ...input, dueDate: input.dueDate ?? undefined },
          { headers: idempotencyHeader(key) },
        )
      ).data,
    onSuccess: () => refreshNotices(queryClient),
  })
}

/** 보낸 필드만 바뀐다. 마감일을 지우려면 clearDueDate */
export function useUpdateNotice(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Omit<NoticeInput, 'dueDate'>> & { dueDate?: string; clearDueDate?: boolean }) =>
      (await api.patch<NoticeDetail>(`/ops/notices/${id}`, input)).data,
    onSuccess: (detail) => {
      queryClient.setQueryData(['notices', 'detail', id], detail)
      refreshNotices(queryClient)
    },
  })
}

export function useDeleteNotice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/ops/notices/${id}`)
    },
    onSettled: () => refreshNotices(queryClient),
  })
}

/** 미확인 부원에게 한 번 더 알리기 — 공지당 1회 */
export function useRemindNotice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.post<{ targetCount: number; remindedAt: string }>(`/ops/notices/${id}/reminders`)).data,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ops', 'notices'] }),
  })
}

// ── 이벤트 ──

export const EVENT_NAME_MAX = 40
export const EVENT_DESC_MAX = 1000
export const EVENT_REQ_MAX = 100
export const GUIDE_STEP_MAX = 60

export interface EventInput {
  name: string
  startDate: string
  endDate: string
  description: string
  requirement: string
  /** 정확히 4개 */
  guideSteps: string[]
  photoRequired: boolean
}

function refreshEvents(queryClient: QueryClient, id?: number) {
  void queryClient.invalidateQueries({ queryKey: ['events', 'list'] })
  if (id) void queryClient.invalidateQueries({ queryKey: ['events', 'detail', id] })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ input, key }: { input: EventInput; key: string }) =>
      (await api.post<EventDetail>('/ops/events', input, { headers: idempotencyHeader(key) })).data,
    onSuccess: (created) => refreshEvents(queryClient, created.id),
  })
}

export function useUpdateEvent(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<EventInput>) => (await api.patch<EventDetail>(`/ops/events/${id}`, input)).data,
    onSuccess: (detail) => {
      queryClient.setQueryData(['events', 'detail', id], detail)
      refreshEvents(queryClient, id)
    },
  })
}

/** 이벤트 안내를 공지로 — 마감일은 이벤트 종료일. 새 키로 여러 번 발행할 수 있다 */
export function usePublishEventNotice(eventId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ input, key }: { input: { isPinned: boolean; isMustRead: boolean }; key: string }) =>
      (await api.post<NoticeDetail>(`/ops/events/${eventId}/notice`, input, { headers: idempotencyHeader(key) })).data,
    onSuccess: () => refreshNotices(queryClient),
  })
}

// ── 인증 확인 ──

export interface OpsCertification {
  id: number
  event: { id: number; name: string }
  author: Author
  body: string
  photos: Photo[]
  state: CertificationState
  rejectReason: string | null
  mine: boolean
  createdAt: string
}

/** 오래된 순(다시 올린 글은 다시 올린 시각). state 기본 PENDING */
export function useOpsCertifications(state: CertificationState, eventId: number | null, page: number) {
  return useQuery({
    queryKey: ['ops', 'certifications', state, eventId, page],
    queryFn: async () =>
      (
        await api.get<OpsPage<OpsCertification>>('/ops/certifications', {
          params: { state, eventId: eventId ?? undefined, page, size: OPS_PAGE_SIZE },
        })
      ).data,
    placeholderData: keepPreviousData,
  })
}

export function useReviewCertification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, decision, rejectReason }: { id: number; decision: 'APPROVE' | 'REJECT'; rejectReason?: string }) =>
      (await api.post(`/ops/certifications/${id}/review`, { decision, rejectReason })).data,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ops', 'certifications'] }),
        queryClient.invalidateQueries({ queryKey: ['ops', 'dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['events'] }),
      ]),
  })
}

export function contentErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'NOTICE_REMIND_USED':
      return '이 공지는 이미 한 번 더 알렸어요. 공지당 한 번만 보낼 수 있어요.'
    case 'CERT_ALREADY_REVIEWED':
      return '이미 다른 운영진이 확인한 인증이에요. 목록을 새로 불러왔어요.'
    case 'NOT_FOUND':
      return '삭제됐거나 없는 항목이에요. 목록을 새로 불러왔어요.'
    case 'FORBIDDEN':
      return '운영진만 할 수 있어요.'
    case 'VALIDATION_FAILED':
      return error.fieldErrors[0]?.message ?? error.message
    default:
      return commonErrorMessage(error)
  }
}
