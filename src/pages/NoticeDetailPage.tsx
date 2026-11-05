import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { AuthorLink } from '@/features/questions/AnswerList'
import {
  COMMENT_MAX,
  noticeErrorMessage,
  useConfirmNotice,
  useCreateNoticeComment,
  useDeleteNoticeComment,
  useNoticeDetail,
  type NoticeComment,
  type NoticeDetail,
} from '@/features/notices/api'
import { MustReadBadge, PinnedBadge } from '@/features/notices/NoticeBits'
import { dueText, isOverdue, noticeAuthorText } from '@/features/notices/format'
import type { ReportTarget } from '@/features/reports/api'
import { ReportSheet } from '@/features/reports/ReportSheet'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { toApiError } from '@/lib/api'
import { formatRelative, useNowEveryMinute } from '@/lib/time'

/** 공지 상세 (S12) — 본문 · 확인했어요 · 댓글. 운영진 · 개발자는 확인 집계도 본다 */
export function NoticeDetailPage() {
  const { noticeId } = useParams()
  const id = Number(noticeId)
  const validId = Number.isInteger(id) && id > 0
  const { data: me } = useMe()
  const location = useLocation()
  const detail = useNoticeDetail(id, validId && me != null)
  const now = useNowEveryMinute()

  // #comment-{id}로 들어오면 그 댓글로 내려간다 (신고 링크)
  useEffect(() => {
    if (!detail.data || !location.hash) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' })
  }, [detail.data, location.hash])

  if (!me) {
    return (
      <SubPageLayout fallback="/notices">
        <LockPanel
          next={location.pathname + location.hash}
          title="공지는 부원만 볼 수 있어요"
          buttonText="로그인하고 공지 보기"
        />
      </SubPageLayout>
    )
  }

  const notFound = !validId || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')

  return (
    <SubPageLayout fallback="/notices">
      {notFound && <GoneNotice />}

      {!notFound && detail.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-4/5" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {!notFound && detail.isError && (
        <div className="space-y-3 rounded-xl bg-card p-5 text-center" role="alert">
          <p className="text-sm">공지를 불러오지 못했어요.</p>
          <Button variant="secondary" onClick={() => detail.refetch()}>
            다시 시도
          </Button>
        </div>
      )}

      {detail.data && <NoticeBody notice={detail.data} now={now} />}
    </SubPageLayout>
  )
}

function NoticeBody({ notice, now }: { notice: NoticeDetail; now: number }) {
  return (
    <article className="pb-10">
      {(notice.isPinned || notice.isMustRead) && (
        <div className="flex items-center gap-1.5">
          {notice.isPinned && <PinnedBadge />}
          {notice.isMustRead && <MustReadBadge />}
        </div>
      )}
      <h1 className="mt-2 text-[22px] leading-snug font-bold text-title">{notice.title}</h1>
      <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        <span className="font-bold text-title">{noticeAuthorText(notice.author)}</span>
        <span aria-hidden>·</span>
        <span>{formatRelative(notice.createdAt, now)}</span>
      </p>

      {notice.dueDate && (
        <p
          className={
            isOverdue(notice.dueDate)
              ? 'mt-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground'
              : 'mt-4 rounded-lg bg-brand-soft px-3 py-2 text-sm font-bold text-brand-text'
          }
        >
          {isOverdue(notice.dueDate) ? dueText(notice.dueDate) : `마감 ${dueText(notice.dueDate)}`}
        </p>
      )}

      <LinkifiedText text={notice.body} className="mt-5 text-[15px] leading-relaxed text-foreground" />

      <ConfirmSection notice={notice} />
      {notice.stats && <StatsSection stats={notice.stats} />}
      <CommentSection notice={notice} now={now} />
    </article>
  )
}

/** 확인했어요 — 한 번만 누르고 취소는 없다 (F4-03) */
function ConfirmSection({ notice }: { notice: NoticeDetail }) {
  const confirm = useConfirmNotice(notice.id)

  return (
    <section className="mt-8">
      {notice.confirmed ? (
        <p className="flex h-12 items-center justify-center rounded-lg bg-brand-soft text-sm font-bold text-brand-text" role="status">
          ✓ 확인했어요
        </p>
      ) : (
        <>
          <Button size="lg" className="h-12 w-full font-bold" disabled={confirm.isPending} onClick={() => confirm.mutate()}>
            {confirm.isPending ? '보내는 중…' : '확인했어요'}
          </Button>
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            누르면 확인한 사람 수에 들어가요. 한 번 누르면 되돌릴 수 없어요.
          </p>
        </>
      )}
      {confirm.isError && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {noticeErrorMessage(toApiError(confirm.error))}
        </p>
      )}
    </section>
  )
}

/** 운영진 · 개발자만 — N명 중 M명 확인 (탈퇴 · 정지 제외) */
function StatsSection({ stats }: { stats: NonNullable<NoticeDetail['stats']> }) {
  return (
    <section className="mt-4 rounded-xl bg-card p-4">
      <h2 className="text-sm font-bold text-title">확인 현황</h2>
      <p className="mt-2 text-sm text-foreground">
        <b className="text-brand-text">{stats.memberCount}명</b> 중 <b className="text-brand-text">{stats.confirmedCount}명</b>이
        확인했어요
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">열어 본 사람 {stats.readCount}명 · 부원에게는 보이지 않아요</p>
    </section>
  )
}

function CommentSection({ notice, now }: { notice: NoticeDetail; now: number }) {
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<ReportTarget | null>(null)
  const remove = useDeleteNoticeComment(notice.id)

  function handleDelete(comment: NoticeComment) {
    if (!window.confirm('댓글을 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return
    setError(null)
    remove.mutate(comment.id, { onError: (e) => setError(noticeErrorMessage(toApiError(e))) })
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-base font-bold text-title">
        댓글 <span className="text-brand-text">{notice.comments.length}</span>
      </h2>
      {error && (
        <p className="mb-3 rounded-lg bg-muted px-3 py-2.5 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {notice.comments.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
          참석이 어렵거나 궁금한 점이 있으면 댓글로 남겨 주세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {notice.comments.map((comment) => (
            <li key={comment.id} id={`comment-${comment.id}`} className="scroll-mt-20 rounded-xl bg-card px-4 py-3">
              <div className="flex items-center gap-2 text-xs">
                {/* 탈퇴한 부원은 링크 없음 */}
                <AuthorLink
                  author={{
                    id: comment.author.id ?? undefined,
                    nickname: comment.author.nickname,
                    withdrawn: comment.author.withdrawn,
                  }}
                />
                {comment.author.generation != null && (
                  <span className="text-muted-foreground">{comment.author.generation}기</span>
                )}
                <span className="text-muted-foreground">{formatRelative(comment.createdAt, now)}</span>
                {comment.mine ? (
                  <button
                    type="button"
                    disabled={remove.isPending}
                    onClick={() => handleDelete(comment)}
                    className="ml-auto py-1 text-muted-foreground hover:underline disabled:opacity-50"
                  >
                    삭제
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReport({ type: 'NOTICE_COMMENT', id: comment.id })}
                    className="ml-auto py-1 text-muted-foreground hover:underline"
                  >
                    신고
                  </button>
                )}
              </div>
              <LinkifiedText text={comment.body} className="mt-1.5 text-sm leading-relaxed text-foreground" />
            </li>
          ))}
        </ul>
      )}

      <CommentForm noticeId={notice.id} />
      <ReportSheet target={report} onClose={() => setReport(null)} />
    </section>
  )
}

/** 입력창 오른쪽 파란 `등록` (디자인 가이드 4장). 1–500자, 익명 없음 */
function CommentForm({ noticeId }: { noticeId: number }) {
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const create = useCreateNoticeComment(noticeId)
  const keyFor = useIdempotencyKey()
  const trimmed = body.trim()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || create.isPending) return
    setError(null)
    create.mutate(
      { body: trimmed, key: keyFor({ noticeId, body: trimmed }) },
      {
        onSuccess: () => setBody(''),
        onError: (err) => setError(noticeErrorMessage(toApiError(err))),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="flex items-end gap-2">
        <textarea
          aria-label="댓글 내용"
          rows={2}
          maxLength={COMMENT_MAX}
          placeholder="댓글을 남겨 주세요"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-w-0 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
        <Button type="submit" className="h-11 shrink-0 px-4 font-bold" disabled={!trimmed || create.isPending}>
          {create.isPending ? '등록 중' : '등록'}
        </Button>
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular-nums">
        <span className="text-destructive" role={error ? 'alert' : undefined}>
          {error ?? ''}
        </span>
        <span>
          {body.length} / {COMMENT_MAX}
        </span>
      </div>
    </form>
  )
}

/** 삭제된 · 없는 공지 — 안내 후 목록으로 (IA 2장) */
function GoneNotice() {
  return (
    <div className="rounded-2xl bg-card px-6 py-10 text-center">
      <p className="text-lg font-bold text-title">공지를 찾을 수 없어요</p>
      <p className="mt-1 text-sm text-muted-foreground">삭제됐거나 없는 공지예요.</p>
      <Link to="/notices" replace className={buttonVariants({ size: 'lg', className: 'mt-6 h-12 w-full' })}>
        공지 목록으로
      </Link>
    </div>
  )
}
