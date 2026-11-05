import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import { GoneNotice, LoadError, OverflowMenu } from '@/components/PageStates'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import {
  COMMENT_MAX,
  feedErrorMessage,
  useCreateFeedComment,
  useDeleteFeedComment,
  useDeleteFeedPost,
  useFeedComments,
  useFeedPost,
  type FeedComment,
  type FeedPost,
} from '@/features/feed/api'
import { FeedPostView } from '@/features/feed/FeedBits'
import { authorName } from '@/features/member/author'
import { AuthorLink } from '@/features/questions/AnswerList'
import type { ReportTarget } from '@/features/reports/api'
import { ReportSheet } from '@/features/reports/ReportSheet'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { toApiError } from '@/lib/api'
import { formatRelative, useNowEveryMinute } from '@/lib/time'
import { cn } from '@/lib/utils'

/** 피드 상세 (S52) — 글 · 좋아요 · 댓글과 답글(1단계). 비회원은 잠금 안내 */
export function FeedDetailPage() {
  const { postId } = useParams()
  const id = Number(postId)
  const validId = Number.isInteger(id) && id > 0
  const { data: me } = useMe()
  const location = useLocation()
  const post = useFeedPost(id, validId && me != null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [report, setReport] = useState<ReportTarget | null>(null)

  if (!me) {
    return (
      <SubPageLayout fallback="/feed">
        <LockPanel next={location.pathname + location.hash} title="피드는 부원끼리만 나눠요" buttonText="로그인하고 피드 보기" />
      </SubPageLayout>
    )
  }

  const notFound = !validId || (post.isError && toApiError(post.error).code === 'NOT_FOUND')
  const menu = !post.data ? null : post.data.mine ? (
    <OwnerMenu postId={post.data.id} onError={setActionError} />
  ) : (
    <OverflowMenu label="피드 메뉴 열기" items={[{ label: '신고하기', onClick: () => setReport({ type: 'FEED', id: post.data.id }) }]} />
  )

  return (
    <SubPageLayout fallback="/feed" actions={menu}>
      {actionError && (
        <p className="mb-4 rounded-lg bg-muted px-3 py-2.5 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}
      {notFound && <GoneNotice to="/feed" link="피드로" />}
      {!notFound && post.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}
      {!notFound && post.isError && <LoadError text="글을 불러오지 못했어요." onRetry={() => post.refetch()} />}
      {post.data && <PostBody post={post.data} onReport={setReport} />}
      <ReportSheet target={report} onClose={() => setReport(null)} />
    </SubPageLayout>
  )
}

function OwnerMenu({ postId, onError }: { postId: number; onError: (message: string | null) => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const remove = useDeleteFeedPost(postId)

  function leave() {
    queryClient.invalidateQueries({ queryKey: ['feed', 'detail', postId], refetchType: 'none' })
    navigate('/feed', { replace: true })
  }

  return (
    <OverflowMenu
      label="피드 메뉴 열기"
      disabled={remove.isPending}
      items={[
        {
          label: '삭제',
          destructive: true,
          onClick: () => {
            if (!window.confirm('글을 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return
            onError(null)
            remove.mutate(undefined, {
              onSuccess: leave,
              onError: (e) => {
                const error = toApiError(e)
                if (error.code === 'NOT_FOUND') leave()
                else onError(feedErrorMessage(error))
              },
            })
          },
        },
      ]}
    />
  )
}

function PostBody({ post, onReport }: { post: FeedPost; onReport: (target: ReportTarget) => void }) {
  const now = useNowEveryMinute()
  const location = useLocation()
  const comments = useFeedComments(post.id, true)
  const remove = useDeleteFeedComment(post.id)
  const [replyTo, setReplyTo] = useState<FeedComment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const items = comments.data?.pages.flatMap((p) => p.items) ?? []

  // #comment-{id}로 들어오면 그 댓글이 나올 때까지 더 불러와서 내려간다 (알림 · 신고 링크)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = comments
  const pageCount = comments.data?.pages.length ?? 0
  useEffect(() => {
    if (!comments.data || !location.hash) return
    const el = document.getElementById(location.hash.slice(1))
    if (el) el.scrollIntoView({ block: 'center' })
    else if (hasNextPage && !isFetchingNextPage && pageCount < 10) fetchNextPage()
  }, [comments.data, location.hash, hasNextPage, isFetchingNextPage, fetchNextPage, pageCount])

  function handleDelete(comment: FeedComment) {
    if (!window.confirm('댓글을 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return
    setError(null)
    remove.mutate(comment.id, { onError: (e) => setError(feedErrorMessage(toApiError(e))) })
  }

  const actions: CommentActions = {
    disabled: remove.isPending,
    onReply: setReplyTo,
    onDelete: handleDelete,
    onReport: (c) => onReport({ type: 'FEED_COMMENT', id: c.id }),
  }

  return (
    <div className="pb-32">
      <FeedPostView post={post} now={now} detail />

      <section className="mt-8 border-t pt-5">
        <h2 className="mb-3 text-base font-bold text-title">
          댓글 <span className="text-brand-text">{post.commentCount}</span>
        </h2>
        {error && (
          <p className="mb-3 rounded-lg bg-muted px-3 py-2.5 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {comments.isPending && <Skeleton className="h-16 w-full rounded-xl" />}
        {comments.isError && <LoadError text="댓글을 불러오지 못했어요." onRetry={() => comments.refetch()} />}
        {comments.isSuccess && items.length === 0 && (
          <p className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
            첫 댓글을 남겨 보세요.
          </p>
        )}
        <ul className="space-y-2">
          {items.map((c) => (
            <CommentItem key={c.id} comment={c} now={now} actions={actions} />
          ))}
        </ul>
        {comments.hasNextPage && (
          <Button
            variant="secondary"
            className="mt-3 w-full"
            disabled={comments.isFetchingNextPage}
            onClick={() => comments.fetchNextPage()}
          >
            {comments.isFetchingNextPage ? '불러오는 중…' : '댓글 더보기'}
          </Button>
        )}
      </section>

      <CommentBar postId={post.id} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
    </div>
  )
}

interface CommentActions {
  disabled: boolean
  onReply: (comment: FeedComment) => void
  onDelete: (comment: FeedComment) => void
  onReport: (comment: FeedComment) => void
}

function CommentItem({ comment, now, actions }: { comment: FeedComment; now: number; actions: CommentActions }) {
  const reply = comment.depth > 0
  return (
    <li id={`comment-${comment.id}`} className="scroll-mt-20">
      <div className={cn(reply ? 'border-l-2 border-border py-1.5 pl-3' : 'rounded-xl bg-card px-4 py-3')}>
        {comment.deletedBy ? (
          <p className="text-sm text-muted-foreground">
            {comment.deletedBy === 'STAFF' ? '운영진이 숨긴 댓글이에요' : '삭제된 댓글이에요'}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs">
              <AuthorLink author={comment.author} />
              <span className="text-muted-foreground">{formatRelative(comment.createdAt, now)}</span>
            </div>
            {comment.body && <LinkifiedText text={comment.body} className="mt-1.5 text-sm leading-relaxed text-foreground" />}
            <div className="mt-1.5 flex items-center gap-x-1 text-xs text-muted-foreground">
              <button type="button" className="py-1 hover:underline" onClick={() => actions.onReply(comment)}>
                답글
              </button>
              <span aria-hidden>·</span>
              <button
                type="button"
                disabled={actions.disabled}
                className="py-1 hover:underline disabled:opacity-50"
                onClick={() => (comment.mine ? actions.onDelete(comment) : actions.onReport(comment))}
              >
                {comment.mine ? '삭제' : '신고'}
              </button>
            </div>
          </>
        )}
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <ul className="mt-2 space-y-2 pl-3">
          {comment.replies.map((r) => (
            <CommentItem key={r.id} comment={r} now={now} actions={actions} />
          ))}
        </ul>
      )}
    </li>
  )
}

/** 하단 고정 댓글 입력 — 답글이면 대상 닉네임을 위에 보인다. 답글에 답하면 서버가 부모 댓글에 붙이고 @닉네임을 앞에 붙인다 */
function CommentBar({
  postId,
  replyTo,
  onCancelReply,
}: {
  postId: number
  replyTo: FeedComment | null
  onCancelReply: () => void
}) {
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const create = useCreateFeedComment(postId)
  const keyFor = useIdempotencyKey()
  const inputRef = useRef<HTMLInputElement>(null)
  const trimmed = body.trim()

  useEffect(() => {
    if (replyTo) inputRef.current?.focus()
  }, [replyTo])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || create.isPending) return
    setError(null)
    const input = { body: trimmed, ...(replyTo && { parentId: replyTo.id }) }
    create.mutate(
      { input, key: keyFor({ postId, ...input }) },
      {
        onSuccess: () => {
          setBody('')
          onCancelReply()
        },
        onError: (err) => setError(feedErrorMessage(toApiError(err))),
      },
    )
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-card pb-[env(safe-area-inset-bottom)]">
      <form onSubmit={handleSubmit} className="mx-auto max-w-md px-4 py-3">
        {replyTo && (
          <p className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <span className="font-bold text-brand-text">@{authorName(replyTo.author)}</span>님에게 답글
            </span>
            <button type="button" aria-label="답글 취소" onClick={onCancelReply} className="flex size-6 items-center justify-center">
              <X className="size-4" />
            </button>
          </p>
        )}
        {error && (
          <p className="mb-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            aria-label={replyTo ? '답글 내용' : '댓글 내용'}
            maxLength={COMMENT_MAX}
            placeholder={replyTo ? '답글을 남겨 주세요' : '댓글을 남겨 주세요'}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          />
          <Button type="submit" className="h-11 shrink-0 px-4 font-bold" disabled={!trimmed || create.isPending}>
            {create.isPending ? '등록 중' : '등록'}
          </Button>
        </div>
      </form>
    </div>
  )
}
