import { useMutation } from '@tanstack/react-query'
import { api, idempotencyHeader, type ApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'

// 신고하기 (백엔드 ReportController). 작성자에게도 신고자에게도 알리지 않는다

export const REASON_MAX = 200

/** 신고 대상 — 공유 · 덧붙이기 · 피드 · 피드 댓글은 그 화면 단위에서 이 부품을 쓴다 */
export type ReportTargetType = 'QUESTION' | 'ANSWER' | 'SHARE' | 'SHARE_NOTE' | 'FEED' | 'FEED_COMMENT' | 'NOTICE_COMMENT'

export interface ReportTarget {
  type: ReportTargetType
  id: number
}

export function useCreateReport() {
  return useMutation({
    mutationFn: async ({ target, reason, key }: { target: ReportTarget; reason: string; key: string }) =>
      (
        await api.post<{ id: number }>(
          '/reports',
          { targetType: target.type, targetId: target.id, reason },
          { headers: idempotencyHeader(key) },
        )
      ).data,
  })
}

export function reportErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'ALREADY_REPORTED':
      return '이미 신고했어요. 운영진이 확인하고 있어요.'
    case 'NOT_FOUND':
      return '이미 삭제됐거나 숨겨진 글이에요.'
    case 'VALIDATION_FAILED':
      return error.fieldMessage('reason') ?? '신고 이유를 1–200자로 적어 주세요.'
    default:
      return commonErrorMessage(error)
  }
}
