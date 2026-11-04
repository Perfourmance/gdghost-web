import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { MemberStatus, Position } from '@/features/member/labels'
import type { CursorPage } from '@/features/questions/api'
import { api } from '@/lib/api'

// 부원 목록 · 프로필 · 활동 기록 (백엔드 MemberController). 모두 부원만 — 비회원은 401

/** 목록의 한 줄 (MemberSummary). answerCount는 익명 · 답글 제외 */
export interface MemberSummary {
  id: number
  nickname: string
  generation: number
  status: MemberStatus
  position: Position
  statusNote: string | null
  interestTags: string[]
  answerCount: number
  acceptQuestion: boolean
  acceptCoffee: boolean
  isStaff: boolean
}

export interface MemberFilters {
  generation: number | null
  status: MemberStatus | null
}

const PAGE_SIZE = 20

/** 기수 내림차순 → 닉네임. 목록 숨김 · 탈퇴 · 정지는 서버가 뺀다 */
export function useMemberList(filters: MemberFilters) {
  return useInfiniteQuery({
    queryKey: ['members', 'list', filters],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<CursorPage<MemberSummary>>('/members', {
          params: {
            generation: filters.generation ?? undefined,
            status: filters.status ?? undefined,
            cursor: pageParam ?? undefined,
            size: PAGE_SIZE,
          },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  })
}

export type ContactType = 'LINKEDIN' | 'INSTA' | 'KAKAO' | 'PHONE'

/** 프로필 상세 (MemberProfileView). 연락 수단은 공개한 것만(본인은 전부) */
export interface MemberProfile {
  id: number
  nickname: string
  name: string
  generation: number
  studentNo: string | null
  department: string | null
  position: Position
  status: MemberStatus
  isStaff: boolean
  interests: { name: string; skills: string[] }[]
  experiences: string[]
  statusNote: string | null
  statusNoteUpdatedAt: string | null
  bio: string | null
  contacts: { type: ContactType; value: string }[]
  acceptQuestion: boolean
  acceptCoffee: boolean
  /** 커피챗(F19)에서 쓴다 */
  coffeeChat: { myRequestState: string | null; availableAt: string | null }
  /** 익명 · 삭제 · 답글 제외 */
  stats: { answerCount: number; questionCount: number; shareCount: number; feedCount: number }
}

export function useMemberProfile(memberId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['members', 'profile', memberId],
    queryFn: async () => (await api.get<MemberProfile>(`/members/${memberId}`)).data,
    enabled,
  })
}

export type ActivityType = 'ANSWER' | 'QUESTION' | 'SHARE' | 'FEED'

/**
 * 활동 기록 한 줄 (ActivityItem). targetId는 질문 id(답변도 그 질문), 공유 · 피드면 그 글 id.
 * 피드는 title이 없다. anonymous는 본인 조회일 때만 온다
 */
export interface ActivityItem {
  type: ActivityType
  targetId: number
  title: string | null
  snippet: string | null
  adopted: boolean
  anonymous?: boolean
  createdAt: string
}

/** 고른 탭만 불러온다 · 탭마다 무한 스크롤 (IA S24) */
export function useMemberActivities(memberId: number, type: ActivityType, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['members', 'activities', memberId, type],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<CursorPage<ActivityItem>>(`/members/${memberId}/activities`, {
          params: { type, cursor: pageParam ?? undefined, size: PAGE_SIZE },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
    enabled,
  })
}
