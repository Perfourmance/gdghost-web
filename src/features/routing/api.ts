import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MemberStatus, Position } from '@/features/member/labels'
import { api, type ApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'

// 선배 찾기 · 넘기기 (백엔드 RoutingController)

export const MATCH_TEXT_MIN = 10
export const MATCH_TEXT_MAX = 120

export interface SeniorMatchInput {
  category: string
  interestTagId: number
  text: string
}

/** 후보 한 명 (SeniorMatchResponse.Item) */
export interface SeniorCandidate {
  rank: number
  member: {
    id: number
    nickname: string
    generation: number
    status: MemberStatus
    position: Position
    statusNote: string | null
    acceptCoffee: boolean
  }
  reasons: string[]
}

/** fallback: AI를 쓰지 못해 규칙 점수만으로 고른 결과 */
export interface SeniorMatchResult {
  items: SeniorCandidate[]
  fallback: boolean
}

/** 1–3순위. 저장 · 알림 없음. 분당 5회 · 하루 30회 */
export function useSeniorMatch() {
  return useMutation({
    mutationFn: async (input: SeniorMatchInput) =>
      (await api.post<SeniorMatchResult>('/senior-matches', input)).data,
  })
}

export function seniorMatchErrorMessage(error: ApiError): string {
  if (error.code === 'RATE_LIMITED') {
    return error.retryAfter
      ? `잠깐 쉬었다가 ${waitText(error.retryAfter)} 뒤에 다시 찾아 주세요.`
      : '잠깐 쉬었다가 다시 찾아 주세요.'
  }
  if (error.code === 'VALIDATION_FAILED') return error.fieldErrors[0]?.message ?? error.message
  return commonErrorMessage(error)
}

/** 하루 한도(최대 24시간)까지 있어 초를 읽기 쉽게 */
function waitText(seconds: number): string {
  if (seconds < 60) return `${seconds}초`
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}분`
  return `${Math.ceil(seconds / 3600)}시간`
}

/** nextCandidateNotified: 바로 다음 선배에게 보냈는지 (22–08시 · 후보 없음이면 false, 배치가 이어서) */
export interface PassResult {
  state: string
  nextCandidateNotified: boolean
}

/** 제가 답하기 어려워요 — 내가 받은(SENT) 질문만. 넘겨도 답변은 달 수 있다 */
export function usePassRouting(questionId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => (await api.post<PassResult>(`/questions/${questionId}/routing/pass`)).data,
    // 성공 · 실패(이미 넘김 등) 모두 전달 현황을 서버 기준으로 다시
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['questions', 'detail', questionId] }),
  })
}

export function passErrorMessage(error: ApiError): string {
  if (error.code === 'ROUTING_NOT_ASSIGNED') return '이미 넘겼거나 나에게 온 질문이 아니에요.'
  if (error.code === 'NOT_FOUND') return '질문이 삭제됐어요.'
  return commonErrorMessage(error)
}
