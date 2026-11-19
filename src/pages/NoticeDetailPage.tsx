import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useParams } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import {
  EmptyState,
  GoneSlot,
  IconCheck,
  IconClock,
  IconTack,
  InputBar,
  Pill,
  RoundSend,
  Scrap,
  StorySubPage,
  useConfirm,
} from '@/components/story'
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
import { dueText, isOverdue, noticeAuthorText } from '@/features/notices/format'
import type { ReportTarget } from '@/features/reports/api'
import { ReportSheet } from '@/features/reports/ReportSheet'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { toApiError } from '@/lib/api'
import { formatRelative, useNowEveryMinute } from '@/lib/time'
import { cn } from '@/lib/utils'
import '@/styles/ops.css'

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
      <LockPanel
          next={location.pathname + location.hash}
          title="공지는 부원만 볼 수 있어요."
          buttonText="로그인하고 공지 보기"
        />
    )
  }

  const notFound = !validId || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')

  return (
    <StorySubPage fallback="/notices" className="gh-nd">
      {notFound && <GoneSlot title="공지가 붙어 있던 자리만 남았어요" text="삭제됐거나 없는 공지예요." to="/notices" link="공지 목록으로" />}

      {!notFound && detail.isPending && <div className="gh-ops-skel mx-4" aria-label="불러오는 중" />}

      {!notFound && detail.isError && (
        <div className="px-4 pt-4">
          <EmptyState
            row
            pose="shh"
            title="공지를 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => detail.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}

      {detail.data && <NoticeBody notice={detail.data} now={now} />}
    </StorySubPage>
  )
}

function NoticeBody({ notice, now }: { notice: NoticeDetail; now: number }) {
  const overdue = notice.dueDate != null && isOverdue(notice.dueDate)
  return (
    <article>
      <div className="gh-nboard">
        <div className="gh-npost">
          {notice.isMustRead && <span className="gh-seal">필독</span>}
          {notice.isPinned && (
            <span className="gh-pin2">
              <IconTack />
              고정
            </span>
          )}
          <h1>{notice.title}</h1>
          <div className="gh-who">
            <b>{noticeAuthorText(notice.author)}</b> · {formatRelative(notice.createdAt, now)}
          </div>
          {notice.dueDate && (
            <div className={cn('gh-due', !overdue && 'is-live')}>
              <IconClock />
              {overdue ? `확인 마감 지남 · ${dueText(notice.dueDate)}` : `확인 마감 ${dueText(notice.dueDate)}`}
            </div>
          )}
          <LinkifiedText text={notice.body} className="gh-body" />
        </div>
      </div>

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
    <section>
      {notice.confirmed ? (
        <p className="gh-nok is-done" role="status">
          <IconCheck />
          확인했어요
        </p>
      ) : (
        <>
          <button type="button" className="gh-nok" disabled={confirm.isPending} onClick={() => confirm.mutate()}>
            <IconCheck />
            {confirm.isPending ? '보내는 중…' : '확인했어요'}
          </button>
          <p className="gh-nokn">확인 인원에 세어져요. 확인한 뒤에는 취소할 수 없어요.</p>
        </>
      )}
      {confirm.isError && (
        <p className="gh-nd-err text-center" role="alert">
          {noticeErrorMessage(toApiError(confirm.error))}
        </p>
      )}
    </section>
  )
}

/** 운영진 · 개발자만 — N명 중 M명 확인 (탈퇴 · 정지 제외) */
function StatsSection({ stats }: { stats: NonNullable<NoticeDetail['stats']> }) {
  return (
    <section className="gh-nstats">
      <h2>확인 현황</h2>
      <p>
        <b>{stats.memberCount}명</b> 중 <b>{stats.confirmedCount}명</b>이 확인했어요
      </p>
      <small>열람 {stats.readCount}명 · 운영진에게만 보여요</small>
    </section>
  )
}

function CommentSection({ notice, now }: { notice: NoticeDetail; now: number }) {
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<ReportTarget | null>(null)
  const remove = useDeleteNoticeComment(notice.id)
  const confirm = useConfirm()

  async function handleDelete(comment: NoticeComment) {
    if (!(await confirm({ title: '댓글을 삭제할까요?', description: '되돌릴 수 없어요.', confirmLabel: '삭제', danger: true }))) return
    setError(null)
    remove.mutate(comment.id, { onError: (e) => setError(noticeErrorMessage(toApiError(e))) })
  }

  return (
    <section>
      <h2 className="gh-nd-sh">
        댓글 쪽지<em>{notice.comments.length}</em>
      </h2>
      {error && (
        <p className="gh-nd-err" role="alert">
          {error}
        </p>
      )}

      {notice.comments.length === 0 ? (
        <div className="px-4 pt-3">
          <EmptyState row pose="b" title="아직 붙은 쪽지가 없어요">
            참석이 어렵거나 궁금한 점이 있다면 남겨 주세요.
          </EmptyState>
        </div>
      ) : (
        <ul className="gh-scraps">
          {notice.comments.map((comment) => (
            <li key={comment.id} id={`comment-${comment.id}`}>
              <Scrap
                name={
                  // 탈퇴한 부원은 링크 없음
                  <AuthorLink
                    className=""
                    author={{ id: comment.author.id ?? undefined, nickname: comment.author.nickname, withdrawn: comment.author.withdrawn }}
                  />
                }
                mine={comment.mine}
                meta={`${comment.author.generation != null ? `${comment.author.generation}기 · ` : ''}${formatRelative(comment.createdAt, now)}`}
                right={
                  comment.mine ? (
                    <button type="button" disabled={remove.isPending} onClick={() => handleDelete(comment)}>
                      삭제
                    </button>
                  ) : (
                    <button type="button" onClick={() => setReport({ type: 'NOTICE_COMMENT', id: comment.id })}>
                      신고
                    </button>
                  )
                }
              >
                {comment.body}
              </Scrap>
            </li>
          ))}
        </ul>
      )}

      <CommentForm noticeId={notice.id} />
      <ReportSheet target={report} onClose={() => setReport(null)} />
    </section>
  )
}

/** 아래 고정 댓글 입력줄. 1–500자, 익명 없음 */
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
    <form onSubmit={handleSubmit}>
      <InputBar
        replying={error && <span className="text-gh-error-night" role="alert">{error}</span>}
        count={`${body.length} / ${COMMENT_MAX}`}
        send={<RoundSend label="댓글 등록" disabled={!trimmed || create.isPending} />}
      >
        <input
          aria-label="댓글 내용"
          maxLength={COMMENT_MAX}
          placeholder="댓글을 남겨 주세요"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </InputBar>
    </form>
  )
}
