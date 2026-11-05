import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Role } from '@/features/auth/session'
import type { Author } from '@/features/member/author'
import type { MemberStatus } from '@/features/member/labels'
import { api, type ApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'

// 운영 페이지 — 홈 · 부원 관리 · 초대 코드 (백엔드 ops · invite). 운영진만, 아니면 403

/** 운영 목록 — 페이지 번호(0부터) */
export interface OpsPage<T> {
  items: T[]
  page: number
  size: number
  total: number
}

export const OPS_PAGE_SIZE = 20

// ── 운영 홈 ──

export interface StaleQuestion {
  id: number
  category: string
  title: string
  author: Author
  createdAt: string
  waitingDays: number
  sentCount: number
  passedCount: number
}

export interface OpsReport {
  id: number
  targetType: string
  targetId: number
  targetPreview: string | null
  /** 화면 주소 (/questions/1#answer-2 등) */
  targetLink: string | null
  targetDeletedBy: string | null
  reason: string
  sameTargetCount: number
  reporter: { id: number; nickname: string | null }
  state: string
  createdAt: string
}

export interface OpsDashboard {
  thisWeek: { questionCount: number; unansweredCount: number; routingConversionRate: number }
  staleQuestions: { total: number; items: StaleQuestion[] }
  openReports: { total: number; items: OpsReport[] }
  pendingCertifications: number
  unconfirmedMustRead: { noticeId: number; title: string; confirmedCount: number; memberCount: number }[]
}

export function useOpsDashboard() {
  return useQuery({
    queryKey: ['ops', 'dashboard'],
    queryFn: async () => (await api.get<OpsDashboard>('/ops/dashboard')).data,
  })
}

// ── 부원 관리 ──

export interface OpsMember {
  id: number
  name: string
  nickname: string
  loginId: string
  generation: number
  status: MemberStatus
  role: Role
  staffTitle: string | null
  hiddenFromList: boolean
  suspendedAt: string | null
  joinedAt: string
  lastSeenAt: string | null
}

export interface OpsMemberFilters {
  q: string | null
  generation: number | null
  status: MemberStatus | null
  role: Role | null
  suspended: boolean | null
  page: number
}

/** 최근 가입순. 목록 숨김을 켠 사람도 보이고 탈퇴자는 빠진다 */
export function useOpsMembers(filters: OpsMemberFilters) {
  return useQuery({
    queryKey: ['ops', 'members', filters],
    queryFn: async () =>
      (
        await api.get<OpsPage<OpsMember>>('/ops/members', {
          params: {
            q: filters.q ?? undefined,
            generation: filters.generation ?? undefined,
            status: filters.status ?? undefined,
            role: filters.role ?? undefined,
            suspended: filters.suspended ?? undefined,
            page: filters.page,
            size: OPS_PAGE_SIZE,
          },
        })
      ).data,
    placeholderData: keepPreviousData,
  })
}

/** 부를 때마다 열람 기록(EMAIL_VIEW)이 남는다 — 누를 때만 */
export function useViewEmail(memberId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => (await api.get<{ email: string }>(`/ops/members/${memberId}/email`)).data.email,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ops', 'audit', memberId] }),
  })
}

export interface AuditLog {
  id: number
  action: string
  /** 탈퇴한 운영진이면 nickname null */
  actor: { id: number; nickname: string | null; staffTitle: string | null }
  detail: Record<string, unknown> | null
  createdAt: string
}

export function useAuditLogs(memberId: number, page: number) {
  return useQuery({
    queryKey: ['ops', 'audit', memberId, page],
    queryFn: async () =>
      (await api.get<OpsPage<AuditLog>>(`/ops/members/${memberId}/audit-logs`, { params: { page, size: 10 } })).data,
    placeholderData: keepPreviousData,
  })
}

function useRefreshMembers() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['ops', 'members'] }),
      queryClient.invalidateQueries({ queryKey: ['ops', 'audit'] }),
      queryClient.invalidateQueries({ queryKey: ['ops', 'graduation'] }),
      // 부원 목록 · 프로필의 운영진 표시
      queryClient.invalidateQueries({ queryKey: ['members'] }),
    ])
}

export function useSuspend(memberId: number) {
  const refresh = useRefreshMembers()
  return useMutation({
    mutationFn: async (reason: string) => (await api.post(`/ops/members/${memberId}/suspension`, { reason })).data,
    onSettled: refresh,
  })
}

export function useUnsuspend(memberId: number) {
  const refresh = useRefreshMembers()
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/ops/members/${memberId}/suspension`)
    },
    onSettled: refresh,
  })
}

/** 지정 — 이미 운영진이면 직함만 바뀐다 */
export function useAssignStaff(memberId: number) {
  const refresh = useRefreshMembers()
  return useMutation({
    mutationFn: async (staffTitle: string) => (await api.put(`/ops/members/${memberId}/staff`, { staffTitle })).data,
    onSettled: refresh,
  })
}

export function useRevokeStaff(memberId: number) {
  const refresh = useRefreshMembers()
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/ops/members/${memberId}/staff`)
    },
    onSettled: refresh,
  })
}

export interface GraduationCandidate {
  id: number
  name: string
  nickname: string
  generation: number
  studentNo: string | null
  status: MemberStatus
  lastSeenAt: string | null
}

/** 활동 중인 재학 · 휴학 부원. studentNoMax "21"이면 21학번 이전(학번 없는 사람 제외) */
export function useGraduationCandidates(generation: number | null, studentNoMax: string | null) {
  return useQuery({
    queryKey: ['ops', 'graduation', generation, studentNoMax],
    queryFn: async () =>
      (
        await api.get<{ items: GraduationCandidate[] }>('/ops/members/graduation-candidates', {
          params: { generation: generation ?? undefined, studentNoMax: studentNoMax ?? undefined },
        })
      ).data.items,
  })
}

export function useGraduate() {
  const refresh = useRefreshMembers()
  return useMutation({
    mutationFn: async (memberIds: number[]) =>
      (await api.post<{ updatedCount: number; skippedIds: number[] }>('/ops/members/graduations', { memberIds })).data,
    onSettled: refresh,
  })
}

// ── 초대 코드 ──

export type InviteCodeState = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'EXHAUSTED'

export interface InviteCode {
  id: number
  code: string
  generation: number
  maxUses: number
  usedCount: number
  expiresAt: string
  revokedAt: string | null
  state: InviteCodeState
  /** 서비스 첫 시작의 준비용 코드는 null */
  createdBy: { id: number; nickname: string | null } | null
  createdAt: string
}

export function useInviteCodes(page: number) {
  return useQuery({
    queryKey: ['ops', 'invite-codes', page],
    queryFn: async () =>
      (await api.get<OpsPage<InviteCode>>('/ops/invite-codes', { params: { page, size: OPS_PAGE_SIZE } })).data,
    placeholderData: keepPreviousData,
  })
}

export function useIssueInviteCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { generation: number; expiresInDays: number; maxUses: number }) =>
      (await api.post<InviteCode>('/ops/invite-codes', input)).data,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ops', 'invite-codes'] }),
  })
}

export function useRevokeInviteCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/ops/invite-codes/${id}`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ops', 'invite-codes'] }),
  })
}

export interface InviteCodeMember {
  id: number
  name: string
  nickname: string
  studentNo: string | null
  joinedAt: string
}

export function useInviteCodeMembers(id: number | null) {
  return useQuery({
    queryKey: ['ops', 'invite-codes', 'members', id],
    queryFn: async () => (await api.get<{ items: InviteCodeMember[] }>(`/ops/invite-codes/${id}/members`)).data.items,
    enabled: id != null,
  })
}

/** 운영 화면 공통 에러 문구 */
export function opsErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'LAST_STAFF':
      return '마지막 운영진은 해제할 수 없어요. 다른 운영진을 먼저 지정해 주세요.'
    case 'TARGET_IS_STAFF':
      return '운영진 · 개발자는 정지할 수 없어요. 먼저 운영진에서 해제해 주세요.'
    case 'NOT_FOUND':
      return '대상을 찾을 수 없어요. 화면을 새로 불러왔어요.'
    case 'FORBIDDEN':
      return '운영진만 할 수 있어요.'
    case 'VALIDATION_FAILED':
      return error.fieldErrors[0]?.message ?? error.message
    default:
      return commonErrorMessage(error)
  }
}
