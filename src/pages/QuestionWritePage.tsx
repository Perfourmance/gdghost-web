import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { QuestionForm, type QuestionFormValues } from '@/features/questions/QuestionForm'
import {
  questionSubmitError,
  TITLE_MAX,
  useCreateQuestion,
  type DirectAskState,
  type DirectResultState,
  type QuestionCreateInput,
} from '@/features/questions/write'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { toApiError } from '@/lib/api'

const EMPTY: QuestionFormValues = { category: null, title: '', body: '', anonymous: false }

/** 선배 찾기에서 왔으면 주제 · 글을 채운다. 짧으면 제목, 제목보다 길면 본문으로 */
function initialFrom(ask: DirectAskState | null): QuestionFormValues {
  if (!ask) return EMPTY
  const text = ask.text.trim()
  const fitsTitle = text.length <= TITLE_MAX
  return { category: ask.category, title: fitsTitle ? text : '', body: fitsTitle ? '' : text, anonymous: false }
}

/** 질문 작성 (S22). 올리면 그 질문 상세로. 선배 찾기의 `공개로 묻기`면 그 선배에게 바로 전달 (F3-05) */
export function QuestionWritePage() {
  const { data: me } = useMe()
  const location = useLocation()
  const navigate = useNavigate()
  const create = useCreateQuestion()
  const keyFor = useIdempotencyKey()
  // 처음 들어올 때의 값만 쓴다 (화면 안에서 state가 바뀌어도 폼은 그대로)
  const [ask] = useState(() => (location.state as DirectAskState | null) ?? null)
  const target = ask?.target ?? null

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
      ...(target && { targetMemberId: target.id }),
    }
    create.mutate(
      { input, key: keyFor(input) },
      {
        onSuccess: (created) => {
          allowLeave()
          const state: DirectResultState | null =
            target && created.directDelivery
              ? { directDelivery: created.directDelivery, targetNickname: target.nickname }
              : null
          // 뒤로 가면 작성 화면이 아니라 목록으로
          navigate(`/questions/${created.id}`, { replace: true, state })
        },
      },
    )
  }

  const error = create.error ? toApiError(create.error) : null

  return (
    <SubPageLayout fallback={target ? '/find-senior' : '/questions'}>
      <QuestionForm
        mode="create"
        initial={initialFrom(ask)}
        pending={create.isPending}
        error={error}
        formError={questionSubmitError(error)}
        onSubmit={handleSubmit}
        notice={
          target && (
            <p className="rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-text">
              <b className="font-bold">{target.nickname}</b> 선배에게 바로 알림이 가요.
              <span className="mt-0.5 block text-xs text-brand-text/80">
                질문 목록에도 올라가요. 밤 10시–아침 8시에 올리면 알림은 아침 8시에 가요.
              </span>
            </p>
          )
        }
      />
    </SubPageLayout>
  )
}
