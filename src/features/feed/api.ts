import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import type { Author } from '@/features/member/author'
import type { CursorPage } from '@/features/questions/api'
import type { Photo } from '@/features/shares/api'
import { api, idempotencyHeader, type ApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'

// 피드 (백엔드 FeedController · FeedLikeController · FeedCommentController). 부원만 — 비회원은 401(블라인드)

export const BODY_MAX = 1000
export const COMMENT_MAX = 300

/** 목록 · 상세 공통. 제목 없이 본문만, 댓글은 수만 */
export interface FeedPost {
  id: number
  category: string
  author: Author
  body: string
  /** 1시간짜리 서명 주소 */
  photos: Photo[]
  likeCount: number
  liked: boolean
  commentCount: number
  mine: boolean
  createdAt: string
}

/** 댓글 하나. 지운 댓글에 답글이 남으면 author · body가 null이고 deletedBy(AUTHOR · STAFF) */
export interface FeedComment {
  id: number
  parentId: number | null
  depth: number
  author: Author | null
  body: string | null
  deletedBy?: string
  mine: boolean
  createdAt: string
  /** 댓글에만 (답글은 1단계) */
  replies?: FeedComment[]
}

const PAGE_SIZE = 20

/** 최신순. 분류가 바뀌면 처음부터 */
export function useFeedList(category: string | null, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['feed', 'list', category],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<CursorPage<FeedPost>>('/feed-posts', {
          params: { category: category ?? undefined, cursor: pageParam ?? undefined, size: PAGE_SIZE },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
    enabled,
  })
}

export function useFeedPost(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ['feed', 'detail', id],
    queryFn: async () => (await api.get<FeedPost>(`/feed-posts/${id}`)).data,
    enabled,
  })
}

/** 댓글은 오래된 순 커서, 답글은 replies로 묶여 온다 */
export function useFeedComments(postId: number, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['feed', 'comments', postId],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<CursorPage<FeedComment>>(`/feed-posts/${postId}/comments`, {
          params: { cursor: pageParam ?? undefined, size: PAGE_SIZE },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
    enabled,
  })
}

/** 상세와 목록 여러 개에 있는 같은 글을 함께 고친다 (좋아요 · 댓글 수) */
function patchPost(queryClient: QueryClient, id: number, patch: (post: FeedPost) => FeedPost) {
  queryClient.setQueryData<FeedPost>(['feed', 'detail', id], (old) => (old ? patch(old) : old))
  queryClient.setQueriesData<InfiniteData<CursorPage<FeedPost>>>({ queryKey: ['feed', 'list'] }, (old) =>
    old
      ? {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((p) => (p.id === id ? patch(p) : p)),
          })),
        }
      : old,
  )
}

export function useCreateFeedPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      input,
      key,
    }: {
      input: { category: string; body: string; photoKeys: string[] }
      key: string
    }) => (await api.post<FeedPost>('/feed-posts', input, { headers: idempotencyHeader(key) })).data,
    onSuccess: (created) => {
      queryClient.setQueryData(['feed', 'detail', created.id], created)
      void queryClient.invalidateQueries({ queryKey: ['feed', 'list'] })
    },
  })
}

export function useDeleteFeedPost(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/feed-posts/${id}`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['feed', 'list'] }),
  })
}

interface LikeResult {
  liked: boolean
  likeCount: number
}

/** 좋아요 · 취소 — 멱등. 누르는 즉시 바꾸고, 실패하면 되돌린다 */
export function useToggleLike() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, like }: { id: number; like: boolean }) =>
      (like
        ? await api.put<LikeResult>(`/feed-posts/${id}/like`)
        : await api.delete<LikeResult>(`/feed-posts/${id}/like`)
      ).data,
    onMutate: ({ id, like }) => {
      patchPost(queryClient, id, (p) =>
        p.liked === like ? p : { ...p, liked: like, likeCount: Math.max(0, p.likeCount + (like ? 1 : -1)) },
      )
    },
    onError: (_e, { id, like }) => {
      patchPost(queryClient, id, (p) =>
        p.liked !== like ? p : { ...p, liked: !like, likeCount: Math.max(0, p.likeCount + (like ? -1 : 1)) },
      )
    },
    onSuccess: (result, { id }) => patchPost(queryClient, id, (p) => ({ ...p, ...result })),
  })
}

function useRefreshComments(postId: number) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['feed', 'comments', postId] }),
      // 댓글 수
      queryClient.invalidateQueries({ queryKey: ['feed', 'detail', postId] }),
      queryClient.invalidateQueries({ queryKey: ['feed', 'list'] }),
    ])
}

export function useCreateFeedComment(postId: number) {
  const refresh = useRefreshComments(postId)
  return useMutation({
    mutationFn: async ({ input, key }: { input: { body: string; parentId?: number }; key: string }) =>
      (
        await api.post<FeedComment>(`/feed-posts/${postId}/comments`, input, { headers: idempotencyHeader(key) })
      ).data,
    onSettled: refresh,
  })
}

export function useDeleteFeedComment(postId: number) {
  const refresh = useRefreshComments(postId)
  return useMutation({
    mutationFn: async (commentId: number) => {
      await api.delete(`/feed-comments/${commentId}`)
    },
    onSettled: refresh,
  })
}

export function feedErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'VALIDATION_FAILED':
      if (error.fieldMessage('body')) return error.fieldMessage('body')!
      return '입력한 내용을 다시 확인해 주세요.'
    case 'NOT_AUTHOR':
    case 'FORBIDDEN':
      return '내가 쓴 글만 지울 수 있어요.'
    case 'NOT_FOUND':
      return '글이나 댓글이 삭제됐어요. 화면을 새로 불러왔어요.'
    default:
      if (error.status === 429 && (error.retryAfter ?? 0) > 600) {
        return '오늘 쓸 수 있는 횟수를 넘었어요. 내일 다시 시도해 주세요.'
      }
      return commonErrorMessage(error)
  }
}
