import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { QuestionForm, type QuestionFormValues } from '@/features/questions/QuestionForm'
import { questionSubmitError, useCreateQuestion, type QuestionCreateInput } from '@/features/questions/write'
import { newIdempotencyKey, toApiError } from '@/lib/api'

const EMPTY: QuestionFormValues = { category: null, title: '', body: '', anonymous: false }

/** 질문 작성 (S22). 올리면 그 질문 상세로 */
export function QuestionWritePage() {
  const { data: me } = useMe()
  const location = useLocation()
  const navigate = useNavigate()
  const create = useCreateQuestion()
  // 한 번의 제출 = 한 키. 같은 내용으로 다시 누르면 같은 키, 내용을 고치면 새 키
  const idempotency = useRef<{ key: string; payload: string } | null>(null)

  if (!me) {
    return (
      <SubPageLayout fallback="/questions">
        <LockPanel next={location.pathname} title="질문은 부원만 남길 수 있어요" buttonText="로그인하고 질문하기" />
      </SubPageLayout>
    )
  }

  function handleSubmit(values: QuestionFormValues, allowLeave: () => void) {
    const body = values.body.trim()
    const input: QuestionCreateInput = {
      category: values.category!,
      title: values.title.trim(),
      body: body === '' ? null : body,
      anonymous: values.anonymous,
    }
    const payload = JSON.stringify(input)
    if (idempotency.current?.payload !== payload) {
      idempotency.current = { key: newIdempotencyKey(), payload }
    }
    create.mutate(
      { input, key: idempotency.current.key },
      {
        onSuccess: (created) => {
          allowLeave()
          // 뒤로 가면 작성 화면이 아니라 목록으로
          navigate(`/questions/${created.id}`, { replace: true })
        },
      },
    )
  }

  const error = create.error ? toApiError(create.error) : null

  return (
    <SubPageLayout fallback="/questions">
      <QuestionForm
        mode="create"
        initial={EMPTY}
        pending={create.isPending}
        error={error}
        formError={questionSubmitError(error)}
        onSubmit={handleSubmit}
      />
    </SubPageLayout>
  )
}
