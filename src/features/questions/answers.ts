import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AnswerNode } from '@/features/questions/api'
import { api, idempotencyHeader, type ApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'

// 답변 · 답글 작성 · 수정 · 삭제, 채택 (백엔드 AnswerController · QuestionController)

export const ANSWER_MIN = 5
export const REPLY_MIN = 1
export const ANSWER_MAX = 3000

export interface AnswerCreateInput {
  body: string
  /** 있으면 답글 */
  parentId: number | null
  anonymous: boolean
}

/**
 * 답변이 바뀌면 상세를 다시 불러 트리 · 채택 순서 · 질문 상태를 서버 기준으로 맞춘다.
 * 목록 · 홈의 답변 수 · 상태도 바뀐다
 */
function useRefresh(questionId: number) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['questions', 'detail', questionId] }),
      queryClient.invalidateQueries({ queryKey: ['questions', 'list'] }),
      queryClient.invalidateQueries({ queryKey: ['home'] }),
    ])
}

export function useCreateAnswer(questionId: number) {
  const refresh = useRefresh(questionId)
  return useMutation({
    mutationFn: async ({ input, key }: { input: AnswerCreateInput; key: string }) =>
      (
        await api.post<AnswerNode>(`/questions/${questionId}/answers`, input, {
          headers: idempotencyHeader(key),
        })
      ).data,
    // 실패(부모가 지워짐 등)도 지금 상태로 다시 맞춘다
    onSettled: refresh,
  })
}

export function useUpdateAnswer(questionId: number) {
  const refresh = useRefresh(questionId)
  return useMutation({
    mutationFn: async ({ answerId, body }: { answerId: number; body: string }) =>
      (await api.patch<AnswerNode>(`/answers/${answerId}`, { body })).data,
    onSettled: refresh,
  })
}

export function useDeleteAnswer(questionId: number) {
  const refresh = useRefresh(questionId)
  return useMutation({
    mutationFn: async (answerId: number) => {
      await api.delete(`/answers/${answerId}`)
    },
    // 실패해도(이미 지워짐 등) 지금 상태로 다시 맞춘다
    onSettled: refresh,
  })
}

/** answerId가 있으면 채택(다른 답변이 채택돼 있으면 바뀐다), null이면 채택 취소 */
export function useAdoption(questionId: number) {
  const refresh = useRefresh(questionId)
  return useMutation({
    mutationFn: async (answerId: number | null) => {
      if (answerId == null) await api.delete(`/questions/${questionId}/adoption`)
      else await api.put(`/questions/${questionId}/adoption`, { answerId })
    },
    onSettled: refresh,
  })
}

/** 칸 아래(body)에 보일 수 없는 에러를 문구로 */
export function answerErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'VALIDATION_FAILED':
      return error.fieldMessage('body') ?? error.message
    case 'OWN_QUESTION_ANSWER':
      return '내 질문에는 답글만 달 수 있어요.'
    case 'ANONYMOUS_NOT_ALLOWED':
      return '익명 질문에서만 익명으로 답할 수 있어요.'
    case 'ANSWER_TOO_FAST':
      return error.retryAfter
        ? `방금 답변을 남겼어요. ${error.retryAfter}초 뒤에 다시 시도해 주세요.`
        : '방금 답변을 남겼어요. 잠시 뒤 다시 시도해 주세요.'
    case 'NOT_AUTHOR':
      return '본인 답변만 고치거나 지울 수 있어요.'
    case 'NOT_FOUND':
      return '답변이나 질문이 삭제됐어요. 화면을 새로 불러왔어요.'
    case 'ADOPT_INVALID':
      return '채택할 수 없는 답변이에요. 화면을 새로 불러왔어요.'
    default:
      return commonErrorMessage(error)
  }
}
