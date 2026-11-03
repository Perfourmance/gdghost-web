import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { questionCategoryLabel, questionStateLabel } from '@/features/content/labels'
import { AnswerList, AuthorLink } from '@/features/questions/AnswerList'
import { useQuestionDetail, type QuestionDetail, type RoutingDelivery } from '@/features/questions/api'
import { toApiError } from '@/lib/api'
import { formatRelative, useNowEveryMinute } from '@/lib/time'
import { cn } from '@/lib/utils'

/** 질문 상세 (S21) — 본문 · 전달 현황 · 답변 트리. 비회원은 잠금 안내(상세 API가 401) */
export function QuestionDetailPage() {
  const { questionId } = useParams()
  const id = Number(questionId)
  const validId = Number.isInteger(id) && id > 0
  const { data: me } = useMe()
  const location = useLocation()
  const detail = useQuestionDetail(id, validId && me != null)
  const now = useNowEveryMinute()

  // #answer-{id}로 들어오면 그 답변으로 내려간다 (IA 5장 딥링크)
  useEffect(() => {
    if (!detail.data || !location.hash) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' })
  }, [detail.data, location.hash])

  if (!me) {
    return (
      <SubPageLayout fallback="/questions">
        <LockPanel
          next={location.pathname + location.hash}
          title="선배의 답변은 회원에게 열려요"
          buttonText="로그인하고 답변 보기"
        />
      </SubPageLayout>
    )
  }

  const notFound = !validId || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')

  return (
    <SubPageLayout fallback="/questions">
      {notFound && <GoneNotice />}

      {!notFound && detail.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-4/5" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {!notFound && detail.isError && (
        <div className="space-y-3 rounded-xl bg-card p-5 text-center" role="alert">
          <p className="text-sm">질문을 불러오지 못했어요.</p>
          <Button variant="secondary" onClick={() => detail.refetch()}>
            다시 시도
          </Button>
        </div>
      )}

      {detail.data && <QuestionBody question={detail.data} now={now} />}
    </SubPageLayout>
  )
}

function QuestionBody({ question, now }: { question: QuestionDetail; now: number }) {
  return (
    <article className="pb-10">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-brand-text">{questionCategoryLabel(question.category)}</p>
        <span
          className={cn('text-xs font-bold', question.state === 'WAITING' ? 'text-muted-foreground' : 'text-brand-text')}
        >
          {questionStateLabel(question.state)}
        </span>
      </div>
      <h1 className="mt-2 text-[22px] leading-snug font-bold text-title">{question.title}</h1>
      <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        <AuthorLink author={question.author} />
        <span aria-hidden>·</span>
        <span>{formatRelative(question.createdAt, now)}</span>
        <span aria-hidden>·</span>
        <span>조회 {question.viewCount}</span>
        {question.editedAfterAnswer && (
          <>
            <span aria-hidden>·</span>
            <span>답변 후 수정됨</span>
          </>
        )}
      </p>

      {question.body && (
        <LinkifiedText text={question.body} className="mt-5 text-[15px] leading-relaxed text-foreground" />
      )}

      {question.routing && question.routing.deliveries.length > 0 && (
        <RoutingStatus deliveries={question.routing.deliveries} reasonsHidden={question.routing.reasonsHidden} />
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-base font-bold text-title">
          답변 <span className="text-brand-text">{countAnswers(question.answers)}</span>
        </h2>
        {question.answers.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
            아직 답변이 없어요.
          </p>
        ) : (
          <AnswerList answers={question.answers} now={now} />
        )}
      </section>
    </article>
  )
}

// 전달 현황 — 누구에게 왜 갔는지 (F9-04). 익명 질문은 사유 대신 고정 문구
const STAGE_LABELS: Record<string, string> = { STAFF: '운영진 알림', MEMBER: 'AI 추천', DIRECT: '지목' }
const DELIVERY_STATES: Record<string, string> = { SENT: '전달됨', ANSWERED: '답변함', PASSED: '넘김' }

function RoutingStatus({ deliveries, reasonsHidden }: { deliveries: RoutingDelivery[]; reasonsHidden: boolean }) {
  return (
    <section className="mt-8 rounded-xl bg-card p-4">
      <h2 className="text-sm font-bold text-title">전달 현황</h2>
      <ul className="mt-3 space-y-3">
        {deliveries.map((d, i) => (
          <li key={`${d.stage}-${d.to.nickname}-${i}`} className="text-sm">
            <div className="flex items-center justify-between gap-2">
              <span>
                <span className="text-xs text-muted-foreground">{STAGE_LABELS[d.stage] ?? '기타'}</span>{' '}
                <b className="font-bold text-title">{d.to.nickname}</b>
              </span>
              <span
                className={cn('shrink-0 text-xs font-bold', d.state === 'ANSWERED' ? 'text-brand-text' : 'text-muted-foreground')}
              >
                {DELIVERY_STATES[d.state] ?? '기타'}
              </span>
            </div>
            {reasonsHidden && d.stage !== 'STAFF' ? (
              <p className="mt-1 text-xs text-muted-foreground">분야가 맞는 선배로 선택됐어요</p>
            ) : (
              d.reasons.length > 0 && (
                <p className="mt-1 flex flex-wrap gap-1">
                  {d.reasons.map((r) => (
                    <span key={r} className="rounded bg-brand-soft px-1.5 py-0.5 text-[11px] text-brand-text">
                      {r}
                    </span>
                  ))}
                </p>
              )
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function countAnswers(answers: QuestionDetail['answers']): number {
  return answers.filter((a) => !a.deletedBy).length
}

/** 삭제 · 숨김 · 없는 글 — 안내 후 목록으로 (IA 2장) */
function GoneNotice() {
  return (
    <div className="rounded-2xl bg-card px-6 py-10 text-center">
      <p className="text-lg font-bold text-title">없는 글입니다</p>
      <p className="mt-1 text-sm text-muted-foreground">삭제됐거나 운영진이 숨긴 글이에요.</p>
      <Link to="/questions" replace className={buttonVariants({ size: 'lg', className: 'mt-6 h-12 w-full' })}>
        질문 목록으로
      </Link>
    </div>
  )
}
