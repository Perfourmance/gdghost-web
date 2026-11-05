import { keepPreviousData, useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'
import type { OpsMember, OpsPage } from '@/features/ops/api'
import type { CursorPage } from '@/features/questions/api'
import { api, type ApiError } from '@/lib/api'
import { commonErrorMessage, formatWait } from '@/lib/errorMessage'

// 어드민 (백엔드 admin · AdminStaffController · StaffEmailChangeController). 개발자만, 아니면 404

/** 앱과 떨어진 어드민 주소 (IA S80) */
export const ADMIN_BASE = '/smugoc_admin'

const PAGE_SIZE = 20

export interface ErrorLogItem {
  id: number
  fingerprint: string
  message: string
  path: string | null
  /** 같은 에러가 난 횟수 */
  count: number
  firstAt: string
  lastAt: string
}

export interface ErrorLogDetail extends ErrorLogItem {
  stack: string | null
}

/** 마지막 발생이 최근인 순. q는 메시지 · 경로, since는 이 시각 이후 */
export function useErrorLogs(q: string | null, since: string | null) {
  return useInfiniteQuery({
    queryKey: ['admin', 'errors', q, since],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<CursorPage<ErrorLogItem>>('/admin/errors', {
          params: { q: q ?? undefined, since: since ?? undefined, cursor: pageParam ?? undefined, size: PAGE_SIZE },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  })
}

export function useErrorLog(id: number | null) {
  return useQuery({
    queryKey: ['admin', 'errors', 'detail', id],
    queryFn: async () => (await api.get<ErrorLogDetail>(`/admin/errors/${id}`)).data,
    enabled: id != null,
  })
}

export interface BatchLog {
  id: number
  jobName: string
  state: string
  message: string | null
  startedAt: string
  endedAt: string | null
  durationMs: number | null
}

interface BatchPage extends CursorPage<BatchLog> {
  /** 필터와 상관없이 최근 24시간 실패 수 */
  summary: { last24hFailed: number }
}

export function useBatchLogs(jobName: string | null, state: 'SUCCESS' | 'FAILED' | null) {
  return useInfiniteQuery({
    queryKey: ['admin', 'batches', jobName, state],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<BatchPage>('/admin/batches', {
          params: { jobName: jobName ?? undefined, state: state ?? undefined, cursor: pageParam ?? undefined, size: PAGE_SIZE },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  })
}

export type AiKind = 'EMBED_QUESTION' | 'EMBED_MEMBER' | 'FIND_SENIOR'
export type AiState = 'SUCCESS' | 'FAILED' | 'FALLBACK'

export interface AiLog {
  id: number
  kind: string
  targetId: number | null
  model: string | null
  latencyMs: number | null
  state: string
  createdAt: string
}

interface AiPage extends CursorPage<AiLog> {
  /** 필터와 상관없이 최근 7일. p95는 성공한 호출 기준, 없으면 null */
  summary: { last7d: { total: number; successRate: number; fallbackRate: number; p95LatencyMs: number | null } }
}

export function useAiLogs(kind: AiKind | null, state: AiState | null) {
  return useInfiniteQuery({
    queryKey: ['admin', 'ai', kind, state],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<AiPage>('/admin/ai-logs', {
          params: { kind: kind ?? undefined, state: state ?? undefined, cursor: pageParam ?? undefined, size: PAGE_SIZE },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  })
}

/** 계정 도구의 대상 고르기 — 최근 가입순, 숨긴 · 정지된 부원도 나온다(탈퇴자 제외). q는 이름 · 닉네임 · 아이디 */
export function useAdminMembers(q: string | null) {
  return useQuery({
    queryKey: ['admin', 'members', q],
    queryFn: async () =>
      (await api.get<OpsPage<OpsMember>>('/admin/members', { params: { q: q ?? undefined, size: 10 } })).data,
    placeholderData: keepPreviousData,
  })
}

/** 라우팅 CSV — 받을 때마다 운영 기록 + 개발자 디스코드. 브라우저에 파일로 저장한다 */
export function useRoutingExport() {
  return useMutation({
    mutationFn: async ({ from, to }: { from: string; to: string }) => {
      const res = await api.get<Blob>('/admin/exports/routing.csv', { params: { from, to }, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `routing_${from}_${to}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}

/** 첫 운영진 지정 — 운영진이 아무도 없을 때(연락이 끊겼을 때) 복구용 */
export function useAdminAssignStaff() {
  return useMutation({
    mutationFn: async ({ memberId, staffTitle }: { memberId: number; staffTitle: string }) =>
      (await api.put<{ id: number; nickname: string; staffTitle: string }>(`/admin/members/${memberId}/staff`, { staffTitle })).data,
  })
}

/** 로그인도 메일도 안 되는 부원의 이메일 변경 요청 — 새 메일로 확인 링크(24시간), 내 비밀번호 확인 */
export function useAdminEmailChange() {
  return useMutation({
    mutationFn: async ({
      memberId,
      input,
    }: {
      memberId: number
      input: { currentPassword: string; newEmail: string; identityNote: string }
    }) => (await api.post<{ expiresAt: string }>(`/admin/members/${memberId}/email-change`, input)).data,
  })
}

export function adminErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'CURRENT_PASSWORD_WRONG':
      return '내 비밀번호가 맞지 않아요.'
    case 'EMAIL_ALREADY_USED':
      return '이미 다른 계정이 쓰는 이메일이에요.'
    case 'EMAIL_CHANGE_TOO_SOON':
      return '이 부원은 최근에 이메일을 바꿔서 30일이 지나야 다시 바꿀 수 있어요.'
    case 'FORBIDDEN':
      return error.message.includes('본인') ? '내 이메일은 설정에서 바꿔 주세요.' : '할 수 없는 요청이에요.'
    case 'NOT_FOUND':
      return '부원을 찾을 수 없어요.'
    case 'RATE_LIMITED':
      return `요청이 많아 잠시 막혔어요. ${formatWait(error.retryAfter ?? 600)} 뒤에 다시 해 주세요.`
    case 'VALIDATION_FAILED':
      return error.fieldErrors[0]?.message ?? error.message
    default:
      return commonErrorMessage(error)
  }
}
