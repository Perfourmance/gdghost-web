import { Heart, MessageCircle } from 'lucide-react'
import { Link } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import { feedCategoryLabel } from '@/features/content/labels'
import { useToggleLike, type FeedPost } from '@/features/feed/api'
import { AuthorLink } from '@/features/questions/AnswerList'
import { PhotoGrid } from '@/features/uploads/PhotoGrid'
import { formatRelative } from '@/lib/time'
import { cn } from '@/lib/utils'

/** 피드 글 — 작성자 · 분류 · 시간 → 본문 → 사진 → 좋아요 · 댓글. 목록에서는 본문을 줄이고 누르면 상세로 */
export function FeedPostView({ post, now, detail = false }: { post: FeedPost; now: number; detail?: boolean }) {
  const like = useToggleLike()
  const to = `/feed/${post.id}`

  return (
    <article className={cn('rounded-xl bg-card px-4 py-3.5', detail && 'px-0 py-0 bg-transparent')}>
      <div className="flex items-center gap-2 text-xs">
        <AuthorLink author={post.author} />
        <span className="text-muted-foreground">{formatRelative(post.createdAt, now)}</span>
        <span className="ml-auto rounded bg-brand-soft px-1.5 py-0.5 text-[11px] font-bold text-brand-text">
          {feedCategoryLabel(post.category)}
        </span>
      </div>

      {detail ? (
        <LinkifiedText text={post.body} className="mt-3 text-[15px] leading-relaxed text-foreground" />
      ) : (
        <Link to={to} className="mt-2 block">
          <p className="line-clamp-4 text-[15px] leading-relaxed whitespace-pre-line text-foreground">{post.body}</p>
        </Link>
      )}

      <PhotoGrid photos={post.photos} alt="피드 사진" className="mt-3" />

      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
        <button
          type="button"
          aria-pressed={post.liked}
          aria-label={post.liked ? '좋아요 취소' : '좋아요'}
          onClick={() => like.mutate({ id: post.id, like: !post.liked })}
          className={cn('flex items-center gap-1 py-1', post.liked && 'font-bold text-brand-text')}
        >
          <Heart className={cn('size-4', post.liked && 'fill-current')} aria-hidden />
          <span className="tabular-nums">{post.likeCount}</span>
        </button>
        {detail ? (
          <span className="flex items-center gap-1 py-1">
            <MessageCircle className="size-4" aria-hidden />
            <span className="tabular-nums">{post.commentCount}</span>
          </span>
        ) : (
          <Link to={to} className="flex items-center gap-1 py-1" aria-label={`댓글 ${post.commentCount}개`}>
            <MessageCircle className="size-4" aria-hidden />
            <span className="tabular-nums">{post.commentCount}</span>
          </Link>
        )}
      </div>
      {like.isError && (
        <p className="mt-1 text-xs text-destructive" role="alert">
          좋아요를 반영하지 못했어요. 다시 눌러 주세요.
        </p>
      )}
    </article>
  )
}
