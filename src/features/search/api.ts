import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { MemberSummary } from '@/features/member/api'
import type { CursorPage, QuestionSummary } from '@/features/questions/api'
import type { ScheduleSummary } from '@/features/schedules/api'
import type { ShareSummary } from '@/features/shares/api'
import { api } from '@/lib/api'

// 전체 검색 (백엔드 SearchController). 부원만, q 2–30자, 분당 30회

export const QUERY_MIN = 2
export const QUERY_MAX = 30

export type SearchType = 'MEMBER' | 'QUESTION' | 'SHARE' | 'SCHEDULE'

/** 항목 모양은 각 목록 API와 같다 */
export interface SearchItems {
  MEMBER: MemberSummary
  QUESTION: QuestionSummary
  SHARE: ShareSummary
  SCHEDULE: ScheduleSummary
}

interface Group<T> {
  items: T[]
  total: number
}

export interface SearchAll {
  members: Group<MemberSummary>
  questions: Group<QuestionSummary>
  shares: Group<ShareSummary>
  schedules: Group<ScheduleSummary>
}

/** 종류별 상위 5개와 전체 건수 */
export function useSearchAll(q: string | null) {
  return useQuery({
    queryKey: ['search', 'ALL', q],
    queryFn: async () => (await api.get<SearchAll>('/search', { params: { q, type: 'ALL' } })).data,
    enabled: q != null,
  })
}

/** 한 종류의 최신순 커서 목록 */
export function useSearchType<T extends SearchType>(type: T, q: string | null) {
  return useInfiniteQuery({
    queryKey: ['search', type, q],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<CursorPage<SearchItems[T]>>('/search', {
          params: { q, type, cursor: pageParam ?? undefined, size: 20 },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
    enabled: q != null,
  })
}
