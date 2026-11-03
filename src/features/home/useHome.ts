import { useQuery } from '@tanstack/react-query'
import type { Author } from '@/features/member/author'
import { api } from '@/lib/api'

// GET /home — 비회원(GuestHomeResponse)과 부원(HomeResponse)의 모양이 다르다.
// 부원에게만 오는 값은 선택(?)으로 둔다

export interface HomePinnedNotice {
  id: number
  title: string
  isMustRead?: boolean
  dueDate?: string | null
  read?: boolean
}

export interface HomeQuestion {
  id: number
  category: string
  title: string
  author: Author
  createdAt: string
  answerCount: number
  state?: string
}

export interface HomeSchedule {
  id: number
  kind: string
  title: string
  startDate: string
  endDate: string | null
  isOfficial?: boolean
  place?: string | null
  dDay?: number
  deadlineSoon?: boolean
}

export interface HomeShare {
  id: number
  category: string
  title: string
  tags?: string[]
  saveCount?: number
}

export interface HomeResponse {
  pinnedNotices: HomePinnedNotice[]
  /** 부원만 — 마감이 지나지 않은 필독 중 내가 확인하지 않은 수 */
  unconfirmedMustReadCount?: number
  recentQuestions: HomeQuestion[]
  upcomingSchedules: HomeSchedule[]
  popularShares: HomeShare[]
}

export function useHome() {
  return useQuery({
    queryKey: ['home'],
    queryFn: async () => (await api.get<HomeResponse>('/home')).data,
  })
}
