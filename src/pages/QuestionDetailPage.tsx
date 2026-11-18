import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import {
  EmptyState,
  Ghost,
  IconCheck,
  IconEye,
  IconFlag,
  IconSparkle,
  Pill,
  PillLink,
  PopMenu,
  RoundSend,
  StorySubPage,
} from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { questionCategoryLabel, questionStateLabel } from '@/features/content/labels'
import { AnswerList, AuthorLink, type AnswerActions } from '@/features/questions/AnswerList'
import { AnswerSheet, type AnswerSheetTarget } from '@/features/questions/AnswerSheet'
import { answerErrorMessage, useAdoption, useDeleteAnswer } from '@/features/questions/answers'
import { useQuestionDetail, type QuestionDetail, type RoutingDelivery } from '@/features/questions/api'
import { QuestionOwnerMenu } from '@/features/questions/QuestionOwnerMenu'
import type { DirectResultState } from '@/features/questions/write'
import type { ReportTarget } from '@/features/reports/api'
import { ReportSheet } from '@/features/reports/ReportSheet'
import { passErrorMessage, usePassRouting, type PassResult } from '@/features/routing/api'
import { toApiError } from '@/lib/api'
import { formatRelative, useNowEveryMinute } from '@/lib/time'
import { cn } from '@/lib/utils'
import '@/styles/questions.css'

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
  const [report, setReport] = useState<ReportTarget | null>(null)

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
          title="선배의 답변은 부원만 볼 수 있어요."
          buttonText="로그인하고 답변 보기"
        />
      </SubPageLayout>
    )
  }

  const notFound = !validId || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')

  // 내 질문은 수정 · 삭제, 남의 질문은 신고
  const menu = !detail.data ? null : detail.data.mine ? (
    <QuestionOwnerMenu questionId={detail.data.id} onError={setActionError} />
  ) : (
    <PopMenu
      label="질문 메뉴 열기"
      actions={[{ label: '신고하기', icon: <IconFlag />, onSelect: () => setReport({ type: 'QUESTION', id: detail.data.id }) }]}
    />
  )

  return (
    <StorySubPage fallback="/questions" right={menu} className="gh-qdetail">
      {actionError && <p className="gh-qnote is-err" role="alert">{actionError}</p>}
      {notFound && <GoneNotice />}
      {detail.data && <DirectResultNotice state={location.state as DirectResultState | null} />}

      {!notFound && detail.isPending && <div className="gh-qskel !ml-4 !h-60" aria-label="불러오는 중" />}

      {!notFound && detail.isError && (
        <div className="px-4 pt-4">
          <EmptyState
            row
            pose="shh"
            title="질문을 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => detail.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}

      {detail.data && <QuestionBody question={detail.data} now={now} onReport={setReport} />}
      <ReportSheet target={report} onClose={() => setReport(null)} />
    </StorySubPage>
  )
}

function QuestionBody({
  question,
  now,
  onReport,
}: {
  question: QuestionDetail
  now: number
  onReport: (target: ReportTarget) => void
}) {
  const deliveries = question.routing?.deliveries ?? []
  return (
    <>
      <article className="gh-qletter">
        <span className="gh-qstamp">{questionCategoryLabel(question.category)}</span>
        <div className="gh-qfrom">
          보낸 사람 <AuthorLink author={question.author} className="" />
          {question.mine && ' · 내 질문'}
        </div>
        <h1>{question.title}</h1>
        {question.body && <LinkifiedText text={question.body} className="gh-qbody" />}
        <div className="gh-qpost">
          <span>
            {formatRelative(question.createdAt, now)}
            <span className={cn('gh-qstate', question.state !== 'WAITING' && 'is-pick')}>{questionStateLabel(question.state)}</span>
          </span>
          <span className="gh-qv" aria-label={`조회 ${question.viewCount}`}>
            <IconEye />
            {question.viewCount}
          </span>
        </div>
        {question.editedAfterAnswer && <p className="mt-2 text-xs text-gh-d-sub">답장이 달린 뒤에 고친 편지예요.</p>}
      </article>

      {deliveries.length > 0 && (
        <RoutingStatus deliveries={deliveries} reasonsHidden={question.routing!.reasonsHidden} mine={question.mine} />
      )}

      {question.routing?.mine && <MyRouting questionId={question.id} mine={question.routing.mine} />}

      <QuestionAnswers question={question} now={now} onReport={onReport} />
    </>
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
        ? `오전 8시에 ${name} 선배에게 알림이 가요.`
        : `${name} 선배는 지금 질문을 받지 않아요. 같은 분야의 다른 선배에게 보낼게요.`
  return (
    <p className="gh-qnote" role="status">
      {text}
    </p>
  )
}

/** 나에게 온 질문 — 답하기 어려우면 다른 선배에게 넘긴다 (F9-03). 넘겨도 답변은 달 수 있다 */
function MyRouting({ questionId, mine }: { questionId: number; mine: { state: string; canPass: boolean } }) {
  const pass = usePassRouting(questionId)
  const [result, setResult] = useState<PassResult | null>(null)

  function handlePass() {
    if (!window.confirm('다른 선배에게 넘길까요? 넘긴 뒤에도 답변할 수 있어요.')) return
    pass.mutate(undefined, { onSuccess: setResult })
  }

  const passed = result != null || mine.state === 'PASSED'
  return (
    <section className="gh-qnote">
      {mine.state === 'ANSWERED' ? (
        <b>답장을 보냈어요</b>
      ) : passed ? (
        <>
          <b>다른 선배에게 넘겼어요</b>
          {result && !result.nextCandidateNotified ? '밤에는 오전 8시에 전달돼요. ' : ''}
          생각이 바뀌면 지금도 답장할 수 있어요.
        </>
      ) : (
        <>
          <b>나에게 온 질문이에요</b>
          답하기 어렵다면 같은 분야의 다른 선배에게 넘겨 주세요.
          {mine.canPass && (
            <Pill soft className="mt-3 w-full justify-center" disabled={pass.isPending} onClick={handlePass}>
              {pass.isPending ? '넘기는 중…' : '다른 선배에게 넘기기'}
            </Pill>
          )}
        </>
      )}
      {pass.isError && (
        <p className="mt-2 text-gh-error-night" role="alert">
          {passErrorMessage(toApiError(pass.error))}
        </p>
      )}
    </section>
  )
}

// 전달 현황 — 누구에게 왜 갔는지 (F9-04)
const STAGE_TAGS: Record<string, string> = { MEMBER: 'AI 추천', DIRECT: '지목' }
const DELIVERY_STATES: Record<string, string> = { SENT: '전달 완료', ANSWERED: '답장 완료', PASSED: '넘김' }
/** 익명 질문에서 이름이 가려진 줄(to = null)에 대신 쓰는 이름 */
const HIDDEN_NAMES: Record<string, string> = { MEMBER: '추천받은 선배', DIRECT: '지목받은 선배' }

/**
 * 배달 영수증 — 이 질문을 받은 선배들. 이름(또는 가린 이름) + 단계 태그 · 상태, 아래에 이유.
 * 이름이 모두 가려진 익명 질문이면 한 줄 요약만
 */
function RoutingStatus({ deliveries, reasonsHidden, mine }: { deliveries: RoutingDelivery[]; reasonsHidden: boolean; mine: boolean }) {
  const allHidden = deliveries.every((d) => d.to == null)
  if (allHidden) {
    return (
      <div className="gh-receipt">
        <div className="gh-rh">
          <Ghost pose="glass" />
          <div>
            <b>맞는 선배에게 전달했어요</b>
            <span>{reasonsHidden ? '익명 질문 · 이름은 공개되지 않아요' : `${deliveries.length}명에게 전달`}</span>
          </div>
          <i>{deliveries.some((d) => d.state === 'ANSWERED') ? '답장 도착' : '전달 완료'}</i>
        </div>
      </div>
    )
  }
  return (
    <div className="gh-receipt">
      <div className="gh-rh">
        <Ghost pose="glass" />
        <div>
          <b>
            이 편지를 받은 선배<em>{deliveries.length}</em>
          </b>
          <span>{mine ? '내 질문에 맞는 선배에게 배달했어요' : '질문에 맞는 선배에게 배달했어요'}</span>
        </div>
      </div>
      {deliveries.map((d, i) => {
        const hidden = d.to == null
        const tag = STAGE_TAGS[d.stage]
        return (
          <div key={`${d.stage}-${i}`} className="gh-rcv">
            <div>
              <b className={cn(hidden && 'is-hidden')}>{d.to?.nickname ?? HIDDEN_NAMES[d.stage] ?? '선배'}</b>
              {tag && !hidden && (
                <span className="gh-ai">
                  {d.stage === 'MEMBER' && <IconSparkle />}
                  {tag}
                </span>
              )}
              <span className={cn('gh-done', d.state === 'ANSWERED' && 'is-on')}>
                {d.state === 'ANSWERED' && <IconCheck />}
                {DELIVERY_STATES[d.state] ?? '기타'}
              </span>
            </div>
            {d.reasons.length > 0 ? (
              <ul>
                {d.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : (
              reasonsHidden && hidden && <p className="mt-1 text-xs text-gh-sub">익명 질문 · 이름 비공개</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** 답변 목록 + 답변 · 답글 시트 + 하단 답변 바 (F7) */
function QuestionAnswers({
  question,
  now,
  onReport,
}: {
  question: QuestionDetail
  now: number
  onReport: (target: ReportTarget) => void
}) {
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
        ? '채택된 답변을 삭제할까요? 채택도 함께 취소돼요.'
        : '삭제할까요? 삭제는 되돌릴 수 없어요.'
      if (!window.confirm(message)) return
      setError(null)
      remove.mutate(answer.id, { onError })
    },
    onReport: (answer) => onReport({ type: 'ANSWER', id: answer.id }),
    onAdopt: (answer, adopt) => {
      setError(null)
      adoption.mutate(adopt ? answer.id : null, { onError })
    },
  }

  const replyCount = countReplies(question.answers)

  return (
    <section>
      <h2 className="gh-ah">
        답장 {countAnswers(question.answers)}
        {replyCount > 0 && <small>· 답글 {replyCount}</small>}
      </h2>
      {error && <p className="gh-qnote is-err !mt-0 !mb-3" role="alert">{error}</p>}
      <div className="gh-alist">
        {question.answers.length === 0 ? (
          <EmptyState row pose="star" title="아직 답장이 없어요">
            {question.canAnswer ? '첫 답장으로 빛을 보내 주세요.' : '맞는 선배에게 전해 두었어요.'}
          </EmptyState>
        ) : (
          <AnswerList answers={question.answers} now={now} actions={actions} />
        )}
      </div>

      {/* 하단 고정 답장 막대 — 내 질문에는 답글만 달 수 있어 없다 (F2-04) */}
      {question.canAnswer && (
        <div className="gh-abar">
          <div>
            <button type="button" className="gh-fake" onClick={() => setSheet({ kind: 'answer' })}>
              선배의 경험을 나눠 주세요
            </button>
            <RoundSend type="button" label="답장 쓰기" onClick={() => setSheet({ kind: 'answer' })} />
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
    <div className="px-4 pt-6">
      <EmptyState pose="shh" title="편지를 찾을 수 없어요" action={<PillLink to="/questions" className="mt-3">질문 목록으로</PillLink>}>
        삭제됐거나 운영진이 숨긴 글이에요.
      </EmptyState>
    </div>
  )
}
