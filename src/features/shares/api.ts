import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { Author } from '@/features/member/author'
import type { CursorPage } from '@/features/questions/api'
import { uploadErrorMessage } from '@/features/uploads/api'
import { api, idempotencyHeader, type ApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'

// 공유 (백엔드 ShareController · ShareSaveController · ShareNoteController).
// 목록은 비회원도(제목까지), 검색 · 상세 · 쓰기는 부원만

export const TITLE_MIN = 2
export const TITLE_MAX = 60
export const BODY_MIN = 10
export const BODY_MAX = 3000
export const TAG_MAX = 15
export const TAGS_MAX = 5
export const NOTE_MAX = 100
export const QUERY_MIN = 2
export const QUERY_MAX = 30

export type ShareSort = 'SAVED' | 'LATEST'

/** 부원 목록 한 줄. 비회원은 id · category · title · author · createdAt만 온다 */
export interface ShareSummary {
  id: number
  category: string
  title: string
  author: Author
  createdAt: string
  tags?: string[]
  saveCount?: number
  noteCount?: number
  saved?: boolean
  hasPhoto?: boolean
}

export interface SavedShareSummary extends ShareSummary {
  savedAt: string
}

export interface Photo {
  objectKey: string
  /** 1시간짜리 서명 주소 */
  url: string
  urlExpiresAt: string
  sortOrder: number
}

export interface ShareNote {
  id: number
  /** 탈퇴했으면 id null · '탈퇴한 부원' */
  author: { id: number | null; nickname: string }
  body: string
  mine: boolean
  createdAt: string
}

export interface ShareDetail {
  id: number
  category: string
  title: string
  body: string
  tags: string[]
  photos: Photo[]
  author: Author
  saveCount: number
  saved: boolean
  mine: boolean
  createdAt: string
  updatedAt: string | null
  /** 오래된 순 전부 */
  notes: ShareNote[]
}

export interface ShareInput {
  category: string
  title: string
  body: string
  tags: string[]
  photoKeys: string[]
}

export interface ShareFilters {
  category: string | null
  sort: ShareSort
  /** 부원만 (비회원이 쓰면 401) */
  q: string | null
}

const PAGE_SIZE = 20

/** 정렬 · 분류 · 검색어가 바뀌면 처음부터 (커서는 같은 정렬 안에서만) */
export function useShareList(filters: ShareFilters, member: boolean) {
  return useInfiniteQuery({
    // 비회원 · 부원 응답 모양이 달라 로그인 여부도 키에 넣는다
    queryKey: ['shares', 'list', filters, member],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<CursorPage<ShareSummary>>('/shares', {
          params: {
            category: filters.category ?? undefined,
            sort: filters.sort,
            q: member ? (filters.q ?? undefined) : undefined,
            cursor: pageParam ?? undefined,
            size: PAGE_SIZE,
          },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  })
}

/** 최근 저장한 순. 삭제 · 숨김된 글은 빠진다 */
export function useSavedShares(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['shares', 'saved'],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<CursorPage<SavedShareSummary>>('/me/saved-shares', {
          params: { cursor: pageParam ?? undefined, size: PAGE_SIZE },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
    enabled,
  })
}

export function useShareDetail(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ['shares', 'detail', id],
    queryFn: async () => (await api.get<ShareDetail>(`/shares/${id}`)).data,
    enabled,
  })
}

// 목록 · 저장한 공유 · 홈의 많이 저장된 공유가 바뀐다
function refreshLists(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['shares', 'list'] })
  void queryClient.invalidateQueries({ queryKey: ['shares', 'saved'] })
  void queryClient.invalidateQueries({ queryKey: ['home'] })
}

export function useCreateShare() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ input, key }: { input: ShareInput; key: string }) =>
      (await api.post<ShareDetail>('/shares', input, { headers: idempotencyHeader(key) })).data,
    onSuccess: (created) => {
      queryClient.setQueryData(['shares', 'detail', created.id], created)
      refreshLists(queryClient)
    },
  })
}

/** 보낸 필드만 바뀐다. tags · photoKeys는 보내면 통째로 교체(빈 배열이면 전부 지움) */
export function useUpdateShare(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<ShareInput>) => (await api.patch<ShareDetail>(`/shares/${id}`, input)).data,
    onSuccess: (updated) => {
      queryClient.setQueryData(['shares', 'detail', id], updated)
      refreshLists(queryClient)
    },
  })
}

export function useDeleteShare(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/shares/${id}`)
    },
    onSettled: () => refreshLists(queryClient),
  })
}

interface SaveResult {
  saved: boolean
  saveCount: number
}

/** 저장 · 취소 — 멱등. 누르는 즉시 화면을 바꾸고, 실패하면 되돌린다 */
export function useToggleSave(id: number) {
  const queryClient = useQueryClient()
  const key = ['shares', 'detail', id]
  return useMutation({
    mutationFn: async (save: boolean) =>
      (save
        ? await api.put<SaveResult>(`/shares/${id}/save`)
        : await api.delete<SaveResult>(`/shares/${id}/save`)
      ).data,
    onMutate: async (save) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<ShareDetail>(key)
      if (previous && previous.saved !== save) {
        queryClient.setQueryData<ShareDetail>(key, {
          ...previous,
          saved: save,
          saveCount: Math.max(0, previous.saveCount + (save ? 1 : -1)),
        })
      }
      return { previous }
    },
    onError: (_e, _save, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSuccess: (result) => {
      queryClient.setQueryData<ShareDetail>(key, (old) => (old ? { ...old, ...result } : old))
    },
    onSettled: () => refreshLists(queryClient),
  })
}

function useRefreshDetail(shareId: number) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['shares', 'detail', shareId] }),
      queryClient.invalidateQueries({ queryKey: ['shares', 'list'] }),
    ])
}

export function useCreateShareNote(shareId: number) {
  const refresh = useRefreshDetail(shareId)
  return useMutation({
    mutationFn: async ({ body, key }: { body: string; key: string }) =>
      (await api.post<ShareNote>(`/shares/${shareId}/notes`, { body }, { headers: idempotencyHeader(key) })).data,
    onSettled: refresh,
  })
}

export function useDeleteShareNote(shareId: number) {
  const refresh = useRefreshDetail(shareId)
  return useMutation({
    mutationFn: async (noteId: number) => {
      await api.delete(`/share-notes/${noteId}`)
    },
    onSettled: refresh,
  })
}

const FORM_FIELDS = ['category', 'title', 'body']

/** 칸 아래에 보일 수 없는 에러만 문구로 (칸별 에러는 폼이 보여 준다) */
export function shareSubmitError(error: ApiError | null): string | null {
  if (!error) return null
  switch (error.code) {
    case 'VALIDATION_FAILED': {
      if (error.fieldErrors.some((e) => e.field.startsWith('tags'))) {
        return `태그는 ${TAGS_MAX}개까지, 한 개에 1–${TAG_MAX}자로 써 주세요.`
      }
      const shownInField = error.fieldErrors.length > 0 && error.fieldErrors.every((e) => FORM_FIELDS.includes(e.field))
      return shownInField ? null : error.message
    }
    case 'NOT_AUTHOR':
      return '내가 쓴 공유만 고치거나 지울 수 있어요.'
    case 'NOT_FOUND':
      return '삭제됐거나 운영진이 숨긴 공유예요.'
    case 'UPLOAD_NOT_FOUND':
    case 'UPLOAD_TOO_LARGE':
    case 'UPLOAD_TYPE_NOT_ALLOWED':
    case 'UPLOAD_PUT_FAILED':
      return uploadErrorMessage(error)
    default:
      // 분당 3회 · 하루 30회(수정은 하루 20회). 기다릴 시간이 길면 하루 한도
      if (error.status === 429 && (error.retryAfter ?? 0) > 600) {
        return '오늘 쓸 수 있는 횟수를 넘었어요. 내일 다시 시도해 주세요.'
      }
      return commonErrorMessage(error)
  }
}

export function noteErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'VALIDATION_FAILED':
      return `한 줄은 1–${NOTE_MAX}자로 남겨 주세요.`
    case 'NOT_AUTHOR':
    case 'FORBIDDEN':
      return '내가 남긴 한 줄만 지울 수 있어요.'
    case 'NOT_FOUND':
      return '글이나 한 줄이 삭제됐어요. 화면을 새로 불러왔어요.'
    default:
      return commonErrorMessage(error)
  }
}
