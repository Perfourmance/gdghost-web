import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { OPS_PAGE_SIZE, type OpsPage, type OpsReport, type StaleQuestion } from '@/features/ops/api'
import { api, type ApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'

// 운영 · 신고 처리 · 라우팅 현황 (백엔드 OpsReportController · OpsRoutingController)

// ── 신고 ──

export type ReportState = 'OPEN' | 'DISMISSED' | 'HIDDEN' | 'RESTORED'
export type ReportAction = 'DISMISS' | 'HIDE' | 'RESTORE'

/** 신고 목록 항목 — 처리한 운영진 · 시각까지 */
export interface OpsReportItem extends OpsReport {
  state: ReportState
  handledBy: { id: number; nickname: string | null } | null
  handledAt: string | null
}

/** 미처리가 위로, 그 안에서 최신순. state가 없으면 전체 */
export function useOpsReports(state: ReportState | null, page: number) {
  return useQuery({
    queryKey: ['ops', 'reports', state, page],
    queryFn: async () =>
      (
        await api.get<OpsPage<OpsReportItem>>('/ops/reports', {
          params: { state: state ?? undefined, page, size: OPS_PAGE_SIZE },
        })
      ).data,
    placeholderData: keepPreviousData,
  })
}

/** 괜찮음 · 숨김은 미처리에서만, 되돌리기는 숨김에서만. 같은 대상의 신고도 함께 닫힌다 */
export function useHandleReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, action }: { id: number; action: ReportAction }) =>
      (await api.patch<OpsReportItem>(`/ops/reports/${id}`, { action })).data,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ops', 'reports'] }),
        queryClient.invalidateQueries({ queryKey: ['ops', 'dashboard'] }),
      ]),
  })
}

export function reportHandleErrorMessage(error: ApiError): string {
  if (error.code === 'REPORT_ALREADY_HANDLED') {
    return error.message.includes('지운') ? '작성자가 지운 글이라 되돌릴 수 없어요.' : '이미 처리된 신고예요. 목록을 새로 불러왔어요.'
  }
  if (error.code === 'NOT_FOUND') return '신고를 찾을 수 없어요.'
  return commonErrorMessage(error)
}

// ── 라우팅 ──

export interface RoutingStats {
  sentCount: number
  answeredCount: number
  passedCount: number
  /** 1시간 운영진 알림 수 (전환율 계산에서 뺀다) */
  staffFirstCount: number
  conversionRate: number
  passRate: number
  fallbackRate: number
  byVersion: { version: string; sentCount: number; conversionRate: number; passRate: number }[]
}

export type RoutingLogState = 'SENT' | 'ANSWERED' | 'PASSED' | 'CANCELED'

export interface RoutingLog {
  id: number
  questionId: number
  questionTitle: string
  /** 탈퇴자는 nickname null */
  member: { id: number; nickname: string | null }
  /** MEMBER(AI 추천) · DIRECT(지목) */
  stage: string
  rankNo: number | null
  state: RoutingLogState
  sentAt: string | null
  respondedAt: string | null
  /** 지목은 점수 계산이 없어 null */
  scoreDetail: Record<string, unknown> | null
}

/** from · to는 한국 날짜, 최대 1년 */
export function useRoutingStats(from: string, to: string) {
  return useQuery({
    queryKey: ['ops', 'routing', 'stats', from, to],
    queryFn: async () => (await api.get<RoutingStats>('/ops/routing/stats', { params: { from, to } })).data,
    placeholderData: keepPreviousData,
  })
}

export function useRoutingLogs(state: RoutingLogState | null, page: number) {
  return useQuery({
    queryKey: ['ops', 'routing', 'logs', state, page],
    queryFn: async () =>
      (
        await api.get<OpsPage<RoutingLog>>('/ops/routing/logs', {
          params: { state: state ?? undefined, page, size: OPS_PAGE_SIZE },
        })
      ).data,
    placeholderData: keepPreviousData,
  })
}

/** 3일 넘게 답 없는 질문 — 오래 기다린 순 */
export function useStaleQuestions(page: number) {
  return useQuery({
    queryKey: ['ops', 'routing', 'stale', page],
    queryFn: async () =>
      (await api.get<OpsPage<StaleQuestion>>('/ops/questions/stale', { params: { page, size: OPS_PAGE_SIZE } })).data,
    placeholderData: keepPreviousData,
  })
}

const REPORT_TARGETS: Record<string, string> = {
  QUESTION: '질문',
  ANSWER: '답변',
  SHARE: '공유',
  SHARE_NOTE: '덧붙이기',
  FEED: '피드',
  FEED_COMMENT: '피드 댓글',
  NOTICE_COMMENT: '공지 댓글',
}

export const reportTargetLabel = (type: string) => REPORT_TARGETS[type] ?? '기타'
