import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { questionCategoryLabel, questionStateLabel } from '@/features/content/labels'
import { AnswerList, AuthorLink, type AnswerActions } from '@/features/questions/AnswerList'
import { AnswerSheet, type AnswerSheetTarget } from '@/features/questions/AnswerSheet'
import { answerErrorMessage, useAdoption, useDeleteAnswer } from '@/features/questions/answers'
import { useQuestionDetail, type QuestionDetail, type RoutingDelivery } from '@/features/questions/api'
import { QuestionOwnerMenu } from '@/features/questions/QuestionOwnerMenu'
import type { DirectResultState } from '@/features/questions/write'
import { passErrorMessage, usePassRouting, type PassResult } from '@/features/routing/api'
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
  const [actionError, setActionError] = useState<string | null>(null)

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
          title="선배의 답변은 부원만 볼 수 있어요"
          buttonText="로그인하고 답변 보기"
        />
      </SubPageLayout>
    )
  }

  const notFound = !validId || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')

  const ownerMenu = detail.data?.mine ? <QuestionOwnerMenu questionId={detail.data.id} onError={setActionError} /> : null

  return (
    <SubPageLayout fallback="/questions" actions={ownerMenu}>
      {actionError && (
        <p className="mb-4 rounded-lg bg-muted px-3 py-2.5 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}
      {notFound && <GoneNotice />}
      {detail.data && <DirectResultNotice state={location.state as DirectResultState | null} />}

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
    <article className={question.canAnswer ? 'pb-28' : 'pb-10'}>
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
            <span>답변이 달린 뒤 수정됨</span>
          </>
        )}
      </p>

      {question.body && (
        <LinkifiedText text={question.body} className="mt-5 text-[15px] leading-relaxed text-foreground" />
      )}

      {question.routing?.mine && <MyRouting questionId={question.id} mine={question.routing.mine} />}

      {question.routing && question.routing.deliveries.length > 0 && (
        <RoutingStatus deliveries={question.routing.deliveries} reasonsHidden={question.routing.reasonsHidden} />
      )}

      <QuestionAnswers question={question} now={now} />
    </article>
  )
}

/** 선배 찾기에서 특정 선배에게 질문한 직후 — 전달 결과 안내 (IA S22) */
function DirectResultNotice({ state }: { state: DirectResultState | null }) {
  if (!state) return null
  const name = state.targetNickname
  const text =
    state.directDelivery === 'SENT'
      ? `${name} 선배에게 질문을 보냈어요.`
      : state.directDelivery === 'SCHEDULED'
        ? `밤 시간이라 아침 8시에 ${name} 선배에게 알림이 가요.`
        : `${name} 선배가 지금은 질문을 받지 않아서, 분야가 맞는 다른 선배에게 대신 보낼게요.`
  return (
    <p className="mb-5 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-text" role="status">
      {text}
    </p>
  )
}

/** 나에게 온 질문 — 답하기 어려우면 다른 선배에게 넘긴다 (F9-03). 넘겨도 답변은 달 수 있다 */
function MyRouting({ questionId, mine }: { questionId: number; mine: { state: string; canPass: boolean } }) {
  const pass = usePassRouting(questionId)
  const [result, setResult] = useState<PassResult | null>(null)

  function handlePass() {
    if (!window.confirm('다른 선배에게 이 질문을 넘길까요? 넘긴 뒤에도 답변은 남길 수 있어요.')) return
    pass.mutate(undefined, { onSuccess: setResult })
  }

  const passed = result != null || mine.state === 'PASSED'
  return (
    <section className="mt-8 rounded-xl bg-brand-soft p-4">
      {mine.state === 'ANSWERED' ? (
        <p className="text-sm text-brand-text">나에게 온 질문에 답해 주셔서 고마워요.</p>
      ) : passed ? (
        <p className="text-sm text-brand-text">
          {result && !result.nextCandidateNotified
            ? '다른 선배에게 넘겼어요. 밤 시간이면 아침 8시에 전달돼요.'
            : '다른 선배에게 넘긴 질문이에요.'}{' '}
          생각이 바뀌면 지금도 답변할 수 있어요.
        </p>
      ) : (
        <>
          <p className="text-sm font-bold text-brand-text">나에게 온 질문이에요</p>
          <p className="mt-1 text-xs text-brand-text/80">답하기 어려우면 분야가 맞는 다른 선배에게 넘겨 주세요.</p>
          {mine.canPass && (
            <Button variant="secondary" className="mt-3 w-full" disabled={pass.isPending} onClick={handlePass}>
              {pass.isPending ? '넘기는 중…' : '다른 선배에게 넘기기'}
            </Button>
          )}
        </>
      )}
      {pass.isError && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {passErrorMessage(toApiError(pass.error))}
        </p>
      )}
    </section>
  )
}

// 전달 현황 — 누구에게 왜 갔는지 (F9-04)
const STAGE_TAGS: Record<string, string> = { MEMBER: 'AI 추천', DIRECT: '지목' }
const DELIVERY_STATES: Record<string, string> = { SENT: '전달됨', ANSWERED: '답변함', PASSED: '넘김' }
/** 익명 질문에서 이름이 가려진 줄(to = null)에 대신 쓰는 이름 */
const HIDDEN_NAMES: Record<string, string> = { MEMBER: '추천받은 선배', DIRECT: '지목받은 선배' }

/** 한 줄: 이름(또는 가린 이름) + 단계 태그 · 상태, 아래에 이유. 운영진 줄은 이름이 곧 단계라 태그 없음 */
function RoutingStatus({ deliveries, reasonsHidden }: { deliveries: RoutingDelivery[]; reasonsHidden: boolean }) {
  return (
    <section className="mt-8 rounded-xl bg-card p-4">
      <h2 className="text-sm font-bold text-title">이 질문을 받은 사람</h2>
      <ul className="mt-3 space-y-3">
        {deliveries.map((d, i) => {
          const hidden = d.to == null
          const tag = STAGE_TAGS[d.stage]
          return (
            <li key={`${d.stage}-${i}`} className="text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <b className={cn('truncate font-bold', hidden ? 'text-muted-foreground' : 'text-title')}>
                    {d.to?.nickname ?? HIDDEN_NAMES[d.stage] ?? '선배'}
                  </b>
                  {tag && !hidden && (
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{tag}</span>
                  )}
                </span>
                <span
                  className={cn('shrink-0 text-xs font-bold', d.state === 'ANSWERED' ? 'text-brand-text' : 'text-muted-foreground')}
                >
                  {DELIVERY_STATES[d.state] ?? '기타'}
                </span>
              </div>
              {d.reasons.length > 0 ? (
                <p className="mt-1 flex flex-wrap gap-1">
                  {d.reasons.map((r) => (
                    <span key={r} className="rounded bg-brand-soft px-1.5 py-0.5 text-[11px] text-brand-text">
                      {r}
                    </span>
                  ))}
                </p>
              ) : (
                reasonsHidden &&
                hidden && <p className="mt-1 text-xs text-muted-foreground">익명 질문이라 이름을 가렸어요</p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** 답변 목록 + 답변 · 답글 시트 + 하단 답변 바 (F7) */
function QuestionAnswers({ question, now }: { question: QuestionDetail; now: number }) {
  const [sheet, setSheet] = useState<AnswerSheetTarget | null>(null)
  const [error, setError] = useState<string | null>(null)
  const remove = useDeleteAnswer(question.id)
  const adoption = useAdoption(question.id)

  const onError = (e: unknown) => setError(answerErrorMessage(toApiError(e)))

  const actions: AnswerActions = {
    questionMine: question.mine,
    disabled: remove.isPending || adoption.isPending,
    onReply: (parent) => setSheet({ kind: 'reply', parent }),
    onEdit: (answer) => setSheet({ kind: 'edit', answer }),
    onDelete: (answer) => {
      const message = answer.adopted
        ? '채택된 답변이에요. 삭제하면 채택도 함께 풀려요. 삭제할까요?'
        : '삭제할까요? 삭제하면 되돌릴 수 없어요.'
      if (!window.confirm(message)) return
      setError(null)
      remove.mutate(answer.id, { onError })
    },
    onAdopt: (answer, adopt) => {
      setError(null)
      adoption.mutate(adopt ? answer.id : null, { onError })
    },
  }

  const replyCount = countReplies(question.answers)

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-base font-bold text-title">
        답변 <span className="text-brand-text">{countAnswers(question.answers)}</span>
        {replyCount > 0 && <span className="ml-1.5 text-sm font-normal text-muted-foreground">· 답글 {replyCount}</span>}
      </h2>
      {error && (
        <p className="mb-3 rounded-lg bg-muted px-3 py-2.5 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {question.answers.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
          {question.canAnswer ? '아직 답변이 없어요. 첫 답변을 남겨 주세요.' : '아직 답변이 없어요.'}
        </p>
      ) : (
        <AnswerList answers={question.answers} now={now} actions={actions} />
      )}

      {/* 하단 고정 답변 바 — 내 질문에는 답글만 달 수 있어 없다 (F2-04) */}
      {question.canAnswer && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-card pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">
            <button
              type="button"
              onClick={() => setSheet({ kind: 'answer' })}
              className="h-11 flex-1 rounded-lg border border-input bg-background px-3 text-left text-sm text-muted-foreground"
            >
              선배의 경험을 나눠 주세요
            </button>
            <Button size="lg" className="h-11 px-4 font-bold" onClick={() => setSheet({ kind: 'answer' })}>
              답변 달기
            </Button>
          </div>
        </div>
      )}

      <AnswerSheet
        questionId={question.id}
        target={sheet}
        canPostAnonymously={question.canPostAnonymously}
        // 익명 질문의 글쓴이가 답글을 달 때 실수로 닉네임이 드러나지 않게 기본 켬
        defaultAnonymous={question.mine && question.anonymous}
        onClose={() => setSheet(null)}
      />
    </section>
  )
}

function countAnswers(answers: QuestionDetail['answers']): number {
  return answers.filter((a) => !a.deletedBy).length
}

/** 목록의 답변 수는 답글을 빼고 세므로, 상세에서만 답글 수를 옆에 작게 (지운 답글 제외) */
function countReplies(answers: QuestionDetail['answers']): number {
  return answers.reduce(
    (sum, a) => sum + a.replies.reduce((n, r) => n + (r.deletedBy ? 0 : 1), 0) + countReplies(a.replies),
    0,
  )
}

/** 삭제 · 숨김 · 없는 글 — 안내 후 목록으로 (IA 2장) */
function GoneNotice() {
  return (
    <div className="rounded-2xl bg-card px-6 py-10 text-center">
      <p className="text-lg font-bold text-title">글을 찾을 수 없어요</p>
      <p className="mt-1 text-sm text-muted-foreground">삭제됐거나 운영진이 숨긴 글이에요.</p>
      <Link to="/questions" replace className={buttonVariants({ size: 'lg', className: 'mt-6 h-12 w-full' })}>
        질문 목록으로
      </Link>
    </div>
  )
}
