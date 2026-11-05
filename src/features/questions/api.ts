import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { Author } from '@/features/member/author'
import { api } from '@/lib/api'

// 질문 읽기 API (백엔드 QuestionController). 비회원 목록은 제목 · 작성자 · 답변 수까지, 상세는 401

export interface QuestionSummary {
  id: number
  category: string
  title: string
  author: Author
  createdAt: string
  answerCount: number
  /** 부원만 */
  state?: string
  answererPreview?: Author[]
  viewCount?: number
}

export interface CursorPage<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}

export interface QuestionFilters {
  category: string | null
  mine: boolean
  unanswered: boolean
}

const PAGE_SIZE = 20

/** 최신순 · 무한 스크롤. 필터가 바뀌면 처음부터 */
export function useQuestionList(filters: QuestionFilters) {
  return useInfiniteQuery({
    queryKey: ['questions', 'list', filters],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<CursorPage<QuestionSummary>>('/questions', {
          params: {
            category: filters.category ?? undefined,
            mine: filters.mine || undefined,
            unanswered: filters.unanswered || undefined,
            cursor: pageParam ?? undefined,
            size: PAGE_SIZE,
          },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  })
}

export interface AnswerNode {
  id: number
  parentId: number | null
  depth: number
  /** 지워졌지만 답글이 남은 자리는 author · body가 없다 */
  author: Author | null
  body: string | null
  adopted: boolean
  mine: boolean
  createdAt: string
  editedAt: string | null
  /** AUTHOR(본인 삭제) · STAFF(신고로 숨김) */
  deletedBy?: string
  replies: AnswerNode[]
}

export interface RoutingDelivery {
  /** STAFF(1시간 운영진) · MEMBER(3시간 AI 추천) · DIRECT(선배 찾기 지목) */
  stage: string
  /** SENT · ANSWERED · PASSED */
  state: string
  /** 익명 질문에서 내 줄이 아니면 null (운영진 줄은 그대로). reasons도 빈 배열 */
  to: { nickname: string } | null
  reasons: string[]
  sentAt: string | null
}

export interface QuestionDetail {
  id: number
  category: string
  title: string
  body: string | null
  anonymous: boolean
  author: Author
  state: string
  adoptedAnswerId: number | null
  editedAfterAnswer: boolean
  viewCount: number
  createdAt: string
  updatedAt: string | null
  mine: boolean
  canAnswer: boolean
  canPostAnonymously: boolean
  answers: AnswerNode[]
  /** 전달 현황. 보낸 적 없으면 null */
  routing: {
    deliveries: RoutingDelivery[]
    /** 익명 질문 — 사유 대신 고정 문구 */
    reasonsHidden: boolean
    mine: { state: string; canPass: boolean } | null
  } | null
}

export function useQuestionDetail(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ['questions', 'detail', id],
    queryFn: async () => (await api.get<QuestionDetail>(`/questions/${id}`)).data,
    enabled,
  })
}
