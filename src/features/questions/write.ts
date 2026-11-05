import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { QuestionDetail } from '@/features/questions/api'
import { api, idempotencyHeader, type ApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'

// 질문 작성 · 수정 · 삭제 (백엔드 QuestionController)

export const QUESTION_CATEGORIES = ['JOB', 'CAREER', 'PATH', 'CAMPUS', 'STUDY']
export const TITLE_MIN = 2
export const TITLE_MAX = 80
export const BODY_MAX = 3000

export interface QuestionCreateInput {
  category: string
  title: string
  /** 비면 보내지 않는다 */
  body: string | null
  anonymous: boolean
  /** 선배 찾기의 `공개로 묻기` — 그 선배에게 바로 전달 */
  targetMemberId?: number
}

/**
 * 선배 찾기 → 질문 작성으로 넘기는 값(history state). target이 있으면 그 선배에게 바로 전달,
 * 없으면(맞는 선배 없음) 주제 · 글만 채운다
 */
export interface DirectAskState {
  target?: { id: number; nickname: string }
  category: string
  text: string
}

/** 질문 작성 → 상세로 넘기는 지목 결과 안내 */
export interface DirectResultState {
  directDelivery: string
  targetNickname: string
}

/** 보낸 필드만 바뀐다. body ""는 본문을 지운다. 익명 여부는 보내면 400 */
export interface QuestionUpdateInput {
  category?: string
  title?: string
  body?: string
}

/** 질문 상세 + 선배 지목 결과(지목이 없으면 null) */
/** directDelivery: SENT · SCHEDULED(22–08시라 08시에) · FALLBACK(받을 수 없게 됨 → 일반 라우팅) */
export type QuestionCreated = QuestionDetail & { directDelivery: string | null }

// 질문 목록 · 홈의 새 질문이 바뀐다
function refreshLists(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['questions', 'list'] })
  queryClient.invalidateQueries({ queryKey: ['home'] })
}

export function useCreateQuestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ input, key }: { input: QuestionCreateInput; key: string }) =>
      (await api.post<QuestionCreated>('/questions', input, { headers: idempotencyHeader(key) })).data,
    onSuccess: (created) => {
      queryClient.setQueryData(['questions', 'detail', created.id], created)
      refreshLists(queryClient)
    },
  })
}

export function useUpdateQuestion(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: QuestionUpdateInput) =>
      (await api.patch<QuestionDetail>(`/questions/${id}`, input)).data,
    onSuccess: (updated) => {
      queryClient.setQueryData(['questions', 'detail', id], updated)
      refreshLists(queryClient)
    },
  })
}

export function useDeleteQuestion(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/questions/${id}`)
    },
    // 성공 · 이미 없음(404) 모두 목록으로 돌아가므로 캐시는 화면에서 정리한다
    onSettled: () => refreshLists(queryClient),
  })
}

const FORM_FIELDS = ['category', 'title', 'body']

/** 칸 아래에 보일 수 없는 에러만 문구로. 칸별 에러는 QuestionForm이 보여 준다 */
export function questionSubmitError(error: ApiError | null): string | null {
  if (!error) return null
  if (error.code === 'VALIDATION_FAILED') {
    const shownInField = error.fieldErrors.length > 0 && error.fieldErrors.every((e) => FORM_FIELDS.includes(e.field))
    return shownInField ? null : error.message
  }
  if (error.code === 'NOT_AUTHOR') return '본인 질문만 고치거나 지울 수 있어요.'
  if (error.code === 'NOT_FOUND') return '삭제됐거나 운영진이 숨긴 질문이에요.'
  return commonErrorMessage(error)
}
