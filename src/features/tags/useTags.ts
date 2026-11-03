import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** GET /tags 응답 (백엔드 TagsResponse) */
export interface TagsResponse {
  interests: { id: number; name: string; sortOrder: number; skills: { id: number; name: string }[] }[]
  experiences: { id: number; name: string; groupName: string }[]
}

/** 관심 분야(+세부 기술) · 경험 태그 전체. 비회원도 부르고, 잘 바뀌지 않아 1시간 그대로 쓴다 */
export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => (await api.get<TagsResponse>('/tags')).data,
    staleTime: 60 * 60 * 1000,
  })
}
