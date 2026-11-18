import { useLocation, useNavigate, useParams } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { EmptyState, Pill, PillLink, StorySubPage } from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { useQuestionDetail, type QuestionDetail } from '@/features/questions/api'
import { QuestionForm, type QuestionFormValues } from '@/features/questions/QuestionForm'
import { questionSubmitError, useUpdateQuestion, type QuestionUpdateInput } from '@/features/questions/write'
import { toApiError } from '@/lib/api'
import '@/styles/questions.css'

/** 질문 수정 — 본인 질문만. 바꾼 필드만 보낸다 (F2-07) */
export function QuestionEditPage() {
  const { questionId } = useParams()
  const id = Number(questionId)
  const validId = Number.isInteger(id) && id > 0
  const { data: me } = useMe()
  const location = useLocation()
  const detail = useQuestionDetail(id, validId && me != null)

  if (!me) {
    return (
      <SubPageLayout fallback="/questions">
        <LockPanel next={location.pathname} title="질문은 부원만 고칠 수 있어요." buttonText="로그인하고 계속하기" />
      </SubPageLayout>
    )
  }

  const notFound = !validId || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')
  const back = validId ? `/questions/${id}` : '/questions'

  return (
    <StorySubPage fallback={back} className="gh-qwrite">
      {notFound && <Notice title="편지를 찾을 수 없어요" text="삭제됐거나 운영진이 숨긴 글이에요." to="/questions" link="질문 목록으로" />}

      {!notFound && detail.isPending && <div className="gh-qskel !ml-4 !h-80" aria-label="불러오는 중" />}

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

      {detail.data && !detail.data.mine && (
        <Notice title="내 질문만 고칠 수 있어요" text="다른 사람이 보낸 편지예요." to={back} link="질문으로 돌아가기" />
      )}

      {/* key: 다른 질문으로 바뀌면 입력 상태를 새로 */}
      {detail.data?.mine && <EditForm key={detail.data.id} question={detail.data} nickname={me.nickname} />}
    </StorySubPage>
  )
}

function EditForm({ question, nickname }: { question: QuestionDetail; nickname: string }) {
  const navigate = useNavigate()
  const update = useUpdateQuestion(question.id)
  const initial: QuestionFormValues = {
    category: question.category,
    title: question.title,
    body: question.body ?? '',
    anonymous: question.anonymous,
  }

  function handleSubmit(values: QuestionFormValues, allowLeave: () => void) {
    const input: QuestionUpdateInput = {}
    const title = values.title.trim()
    const body = values.body.trim()
    if (values.category !== initial.category) input.category = values.category!
    if (title !== initial.title.trim()) input.title = title
    // 빈 문자열이면 본문을 지운다
    if (body !== initial.body.trim()) input.body = body
    update.mutate(input, {
      onSuccess: () => {
        allowLeave()
        // 상세에서 왔으면 뒤로, 주소로 바로 왔으면 상세로
        const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
        if (idx > 0) navigate(-1)
        else navigate(`/questions/${question.id}`, { replace: true })
      },
    })
  }

  const error = update.error ? toApiError(update.error) : null

  return (
    <QuestionForm
      mode="edit"
      nickname={nickname}
      initial={initial}
      pending={update.isPending}
      error={error}
      formError={questionSubmitError(error)}
      onSubmit={handleSubmit}
    />
  )
}

function Notice({ title, text, to, link }: { title: string; text: string; to: string; link: string }) {
  return (
    <div className="px-4 pt-6">
      <EmptyState pose="shh" title={title} action={<PillLink to={to} className="mt-3">{link}</PillLink>}>
        {text}
      </EmptyState>
    </div>
  )
}
