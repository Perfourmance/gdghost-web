import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CursorPage } from '@/features/questions/api'
import { api, idempotencyHeader, type ApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'

// 공지 (백엔드 NoticeController · NoticeCommentController). 부원만 — 비회원은 401

export const COMMENT_MAX = 500

/** 공지 작성자. 탈퇴했으면 id 없이 '탈퇴한 부원', staffTitle은 지금 직함(해제됐으면 null) */
export interface NoticeAuthor {
  id: number | null
  nickname: string
  staffTitle: string | null
  withdrawn: boolean
}

export interface NoticeSummary {
  id: number
  title: string
  isPinned: boolean
  isMustRead: boolean
  dueDate: string | null
  commentCount: number
  author: NoticeAuthor
  /** 열어 봄 */
  read: boolean
  /** 확인했어요 누름 */
  confirmed: boolean
  createdAt: string
}

export interface NoticeComment {
  id: number
  author: { id: number | null; nickname: string; generation: number | null; withdrawn: boolean }
  body: string
  mine: boolean
  createdAt: string
}

export interface NoticeDetail {
  id: number
  title: string
  body: string
  isPinned: boolean
  isMustRead: boolean
  dueDate: string | null
  author: NoticeAuthor
  createdAt: string
  confirmed: boolean
  /** 지운 것 빼고 오래된 순 전부 */
  comments: NoticeComment[]
  /** 운영진 · 개발자에게만. 탈퇴 · 정지한 사람은 빼고 센다 */
  stats: { memberCount: number; readCount: number; confirmedCount: number } | null
}

const PAGE_SIZE = 20

/** 고정 먼저, 그 안에서 최신순 */
export function useNoticeList(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['notices', 'list'],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<CursorPage<NoticeSummary>>('/notices', {
          params: { cursor: pageParam ?? undefined, size: PAGE_SIZE },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
    enabled,
  })
}

/** 열면 서버가 읽음으로 남긴다 → 목록 · 홈의 안 읽음 표시도 다시 맞춘다 */
export function useNoticeDetail(id: number, enabled: boolean) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['notices', 'detail', id],
    queryFn: async () => {
      const data = (await api.get<NoticeDetail>(`/notices/${id}`)).data
      void queryClient.invalidateQueries({ queryKey: ['notices', 'list'] })
      void queryClient.invalidateQueries({ queryKey: ['home'] })
      return data
    },
    enabled,
  })
}

/** 확인했어요 — 한 번만, 취소 없음. 다시 눌러도 처음 시각 그대로(멱등) */
export function useConfirmNotice(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.put(`/notices/${id}/confirmation`)
    },
    onSuccess: () => {
      queryClient.setQueryData<NoticeDetail>(['notices', 'detail', id], (old) => (old ? { ...old, confirmed: true } : old))
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notices', 'detail', id] }),
        queryClient.invalidateQueries({ queryKey: ['notices', 'list'] }),
        // 홈의 미확인 필독 수
        queryClient.invalidateQueries({ queryKey: ['home'] }),
      ]),
  })
}

function useRefreshComments(noticeId: number) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notices', 'detail', noticeId] }),
      queryClient.invalidateQueries({ queryKey: ['notices', 'list'] }),
    ])
}

export function useCreateNoticeComment(noticeId: number) {
  const refresh = useRefreshComments(noticeId)
  return useMutation({
    mutationFn: async ({ body, key }: { body: string; key: string }) =>
      (
        await api.post<NoticeComment>(`/notices/${noticeId}/comments`, { body }, { headers: idempotencyHeader(key) })
      ).data,
    onSettled: refresh,
  })
}

export function useDeleteNoticeComment(noticeId: number) {
  const refresh = useRefreshComments(noticeId)
  return useMutation({
    mutationFn: async (commentId: number) => {
      await api.delete(`/notice-comments/${commentId}`)
    },
    // 실패해도(이미 지워짐 등) 지금 상태로 다시 맞춘다
    onSettled: refresh,
  })
}

export function noticeErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'VALIDATION_FAILED':
      return error.fieldMessage('body') ?? '댓글은 1–500자로 남겨 주세요.'
    case 'NOT_AUTHOR':
      return '내 댓글만 지울 수 있어요.'
    case 'NOT_FOUND':
      return '공지나 댓글이 삭제됐어요. 화면을 새로 불러왔어요.'
    default:
      return commonErrorMessage(error)
  }
}
