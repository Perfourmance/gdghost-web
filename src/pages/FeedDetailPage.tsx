import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import { EmptyState, GoneSlot, IconChat, IconFlag, IconHeart, IconHeartLine, IconTrash, IconX, InputBar, Pill, PopMenu, Rope, RoundSend, Scrap, StorySubPage, useConfirm } from '@/components/story'
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
  useToggleLike,
  type FeedComment,
  type FeedPost,
} from '@/features/feed/api'
import { feedCategoryLabel } from '@/features/content/labels'
import { PhotoGrid } from '@/features/uploads/PhotoGrid'
import { authorName } from '@/features/member/author'
import { AuthorLink } from '@/features/questions/AnswerList'
import type { ReportTarget } from '@/features/reports/api'
import { ReportSheet } from '@/features/reports/ReportSheet'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { toApiError } from '@/lib/api'
import { colorOf, FEED_COLORS } from '@/lib/categoryColors'
import { formatRelative, useNowEveryMinute } from '@/lib/time'
import '@/styles/feed.css'

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
      <LockPanel next={location.pathname + location.hash} title="피드는 부원끼리만 나눠요" buttonText="로그인하고 피드 보기" />
    )
  }

  const notFound = !validId || (post.isError && toApiError(post.error).code === 'NOT_FOUND')
  const menu = !post.data ? null : post.data.mine ? (
    <OwnerMenu postId={post.data.id} onError={setActionError} />
  ) : (
    <PopMenu label="피드 메뉴 열기" actions={[{ label: '신고하기', icon: <IconFlag />, onSelect: () => setReport({ type: 'FEED', id: post.data.id }) }]} />
  )

  return (
    <StorySubPage fallback="/feed" right={menu} className="gh-fd">
      {actionError && <p className="gh-fd-err" role="alert">{actionError}</p>}
      {notFound && (
        <GoneSlot title="쪽지가 걸려 있던 자리만 남았어요" to="/feed" link="피드로" />
      )}
      {!notFound && post.isPending && <div className="gh-fskel" aria-label="불러오는 중" />}
      {!notFound && post.isError && (
        <div className="px-4 pt-4">
          <EmptyState
            row
            pose="shh"
            title="글을 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => post.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}
      {post.data && <PostBody post={post.data} onReport={setReport} />}
      <ReportSheet target={report} onClose={() => setReport(null)} />
    </StorySubPage>
  )
}

function OwnerMenu({ postId, onError }: { postId: number; onError: (message: string | null) => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const remove = useDeleteFeedPost(postId)
  const confirm = useConfirm()

  function leave() {
    queryClient.invalidateQueries({ queryKey: ['feed', 'detail', postId], refetchType: 'none' })
    navigate('/feed', { replace: true })
  }

  return (
    <PopMenu
      label="피드 메뉴 열기"
      actions={[
        {
          label: '삭제',
          icon: <IconTrash />,
          danger: true,
          onSelect: async () => {
            if (remove.isPending || !(await confirm({ title: '쪽지를 내릴까요?', description: '삭제는 되돌릴 수 없어요.', confirmLabel: '삭제', danger: true })))
              return
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
  const confirm = useConfirm()
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

  async function handleDelete(comment: FeedComment) {
    if (!(await confirm({ title: '댓글을 삭제할까요?', description: '되돌릴 수 없어요.', confirmLabel: '삭제', danger: true }))) return
    setError(null)
    remove.mutate(comment.id, { onError: (e) => setError(feedErrorMessage(toApiError(e))) })
  }

  const actions: CommentActions = {
    disabled: remove.isPending,
    onReply: setReplyTo,
    onDelete: handleDelete,
    onReport: (c) => onReport({ type: 'FEED_COMMENT', id: c.id }),
  }

  const like = useToggleLike()
  const color = colorOf(FEED_COLORS, post.category)
  const Heart = post.liked ? IconHeart : IconHeartLine

  return (
    <div style={{ '--c': color } as CSSProperties}>
      <Rope />
      <article className="gh-fnote">
        <i className="gh-pin is-a" aria-hidden />
        <i className="gh-pin is-b" aria-hidden />
        <div className="gh-top">
          <b>
            <AuthorLink author={post.author} className="" />
          </b>
          {formatRelative(post.createdAt, now)}
          <span className="gh-chip">{feedCategoryLabel(post.category)}</span>
        </div>
        {post.photos.length > 0 && <PhotoGrid photos={post.photos} alt="피드 사진" className="gh-photos" />}
        <LinkifiedText text={post.body} className="gh-body" />
        <div className="gh-facts">
          <button
            type="button"
            className="gh-like"
            aria-pressed={post.liked}
            aria-label={post.liked ? `좋아요 취소, ${post.likeCount}` : `좋아요, ${post.likeCount}`}
            onClick={() => like.mutate({ id: post.id, like: !post.liked })}
          >
            <Heart />
            {post.likeCount}
          </button>
          <span className="gh-cm" aria-label={`댓글 ${post.commentCount}`}>
            <IconChat />
            {post.commentCount}
          </span>
        </div>
        {like.isError && <p className="mt-2 text-xs text-gh-error">좋아요를 저장하지 못했어요. 다시 눌러 주세요.</p>}
      </article>

      <h2 className="gh-fd-sh">
        쪽지 답장<em>{post.commentCount}</em>
      </h2>
      {error && <p className="gh-fd-err" role="alert">{error}</p>}
      {comments.isPending && <div className="gh-fskel !h-24" />}
      {comments.isError && (
        <div className="px-4 pt-2">
          <EmptyState
            row
            pose="shh"
            title="댓글을 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => comments.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}
      {comments.isSuccess && items.length === 0 && (
        <div className="px-4 pt-4">
          <EmptyState row pose="b" title="아직 답장이 없어요">
            첫 쪽지를 남겨 보세요.
          </EmptyState>
        </div>
      )}
      <ul className="gh-scraps">
        {items.map((c) => (
          <CommentItem key={c.id} comment={c} now={now} actions={actions} />
        ))}
      </ul>
      {comments.hasNextPage && (
        <button type="button" className="gh-fmore" disabled={comments.isFetchingNextPage} onClick={() => comments.fetchNextPage()}>
          {comments.isFetchingNextPage ? '불러오는 중…' : '댓글 더보기'}
        </button>
      )}

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
    <li id={`comment-${comment.id}`}>
      {comment.deletedBy ? (
        <p className="gh-gone">{comment.deletedBy === 'STAFF' ? '운영진이 숨긴 댓글이에요' : '삭제된 댓글이에요'}</p>
      ) : (
        <Scrap
          reply={reply}
          name={<AuthorLink author={comment.author} className="" />}
          mine={comment.mine}
          meta={formatRelative(comment.createdAt, now)}
          actions={
            <>
              <button type="button" onClick={() => actions.onReply(comment)}>
                답글
              </button>
              <button
                type="button"
                className="is-dim"
                disabled={actions.disabled}
                onClick={() => (comment.mine ? actions.onDelete(comment) : actions.onReport(comment))}
              >
                {comment.mine ? '삭제' : '신고'}
              </button>
            </>
          }
        >
          {comment.body}
        </Scrap>
      )}
      {comment.replies && comment.replies.length > 0 && (
        <ul className="pl-[34px]">
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
    <form onSubmit={handleSubmit}>
      <InputBar
        replying={
          (replyTo || error) && (
            <>
              {error ? (
                <span className="text-gh-error-night" role="alert">
                  {error}
                </span>
              ) : (
                <span>@{authorName(replyTo!.author)}님에게 답글</span>
              )}
              {replyTo && (
                <button type="button" aria-label="답글 취소" onClick={onCancelReply}>
                  <IconX className="size-4" />
                </button>
              )}
            </>
          )
        }
        send={<RoundSend label={replyTo ? '답글 등록' : '댓글 등록'} disabled={!trimmed || create.isPending} />}
      >
        <input
          ref={inputRef}
          aria-label={replyTo ? '답글 내용' : '댓글 내용'}
          maxLength={COMMENT_MAX}
          placeholder={replyTo ? '답글을 남겨 주세요' : '댓글을 남겨 주세요'}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </InputBar>
    </form>
  )
}
