import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, idempotencyHeader, type ApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'

// 일정 (백엔드 ScheduleController). 캘린더 목록은 비회원도(제목 · 날짜까지), 상세 · 등록은 부원만

export const SCHEDULE_KINDS = ['CLUB', 'ACADEMIC', 'CONTEST', 'JOB'] as const
/** 동아리 · 학사는 운영진만 등록하고 공식 일정이 된다 */
export const OFFICIAL_KINDS = ['CLUB', 'ACADEMIC']
export const TITLE_MIN = 2
export const TITLE_MAX = 80
export const PLACE_MAX = 100
export const MEMO_MAX = 1000

/** 탈퇴했으면 nickname은 null */
export interface ScheduleAuthor {
  id: number
  nickname: string | null
}

/** 비회원은 id · kind · title · startDate · endDate만 온다 */
export interface ScheduleSummary {
  id: number
  kind: string
  title: string
  startDate: string
  endDate: string | null
  isOfficial?: boolean
  place?: string | null
  /** 마감(종료일, 없으면 시작일)까지 남은 날, 지났으면 음수 */
  dDay?: number
  /** 마감까지 0–3일 */
  deadlineSoon?: boolean
  author?: ScheduleAuthor
}

export interface RelatedRecruit {
  id: number
  title: string
  joinedCount: number
  capacity: number
  /** 정원이 찼거나 시간이 지났으면 CLOSED */
  state: string
}

export interface ScheduleDetail {
  id: number
  kind: string
  isOfficial: boolean
  title: string
  startDate: string
  endDate: string | null
  place: string | null
  memo: string | null
  author: ScheduleAuthor
  mine: boolean
  relatedRecruits: RelatedRecruit[]
  /** 마지막으로 내용을 고친 시각. 고친 적 없으면 null (백엔드에 추가 요청함 — 오기 전에는 없음) */
  updatedAt?: string | null
  /** 마지막 수정을 등록한 사람이 아닌 운영진이 했는지 (백엔드에 추가 요청함) */
  editedByStaff?: boolean
}

export interface ScheduleInput {
  kind: string
  title: string
  startDate: string
  endDate: string | null
  place: string | null
  memo: string | null
}

/** 보낸 필드만 바뀐다. 장소 · 메모는 빈 문자열이면 지우고, 종료일은 clearEndDate로 지운다 */
export type ScheduleUpdateInput = Partial<Omit<ScheduleInput, 'endDate' | 'place' | 'memo'>> & {
  endDate?: string
  clearEndDate?: boolean
  place?: string
  memo?: string
}

/** 한 달 치 (from · to는 한국 날짜, 최대 62일). 기간이 걸치는 일정 모두 */
export function useScheduleRange(from: string, to: string, kind: string | null, member: boolean) {
  return useQuery({
    // 비회원 · 부원 응답 모양이 달라 로그인 여부도 키에 넣는다
    queryKey: ['schedules', 'range', from, to, kind, member],
    queryFn: async () =>
      (
        await api.get<{ items: ScheduleSummary[] }>('/schedules', {
          params: { from, to, kind: kind ?? undefined },
        })
      ).data.items,
    placeholderData: (previous) => previous,
  })
}

export function useScheduleDetail(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ['schedules', 'detail', id],
    queryFn: async () => (await api.get<ScheduleDetail>(`/schedules/${id}`)).data,
    enabled,
  })
}

function useRefreshSchedules() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['schedules'] }),
      // 홈의 다가오는 일정
      queryClient.invalidateQueries({ queryKey: ['home'] }),
    ])
}

export function useCreateSchedule() {
  const refresh = useRefreshSchedules()
  return useMutation({
    mutationFn: async ({ input, key }: { input: ScheduleInput; key: string }) =>
      (await api.post<ScheduleDetail>('/schedules', input, { headers: idempotencyHeader(key) })).data,
    onSuccess: refresh,
  })
}

export function useUpdateSchedule(id: number) {
  const queryClient = useQueryClient()
  const refresh = useRefreshSchedules()
  return useMutation({
    mutationFn: async (input: ScheduleUpdateInput) =>
      (await api.patch<ScheduleDetail>(`/schedules/${id}`, input)).data,
    onSuccess: (detail) => {
      queryClient.setQueryData(['schedules', 'detail', id], detail)
      return refresh()
    },
  })
}

export function useDeleteSchedule(id: number) {
  const refresh = useRefreshSchedules()
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/schedules/${id}`)
    },
    onSuccess: refresh,
  })
}

export function scheduleErrorMessage(error: ApiError | null): string | null {
  if (!error) return null
  switch (error.code) {
    case 'VALIDATION_FAILED':
      // 칸별 문구는 칸 아래에 따로 나온다
      return '입력한 내용을 다시 확인해 주세요.'
    case 'FORBIDDEN':
      return '동아리 · 학사 일정은 운영진만 등록할 수 있어요.'
    case 'NOT_AUTHOR':
      return '내가 등록한 일정만 고칠 수 있어요.'
    case 'NOT_FOUND':
      return '일정이 삭제됐어요.'
    default:
      return commonErrorMessage(error)
  }
}
