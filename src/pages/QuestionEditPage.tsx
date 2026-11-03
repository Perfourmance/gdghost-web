import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { useQuestionDetail, type QuestionDetail } from '@/features/questions/api'
import { QuestionForm, type QuestionFormValues } from '@/features/questions/QuestionForm'
import { questionSubmitError, useUpdateQuestion, type QuestionUpdateInput } from '@/features/questions/write'
import { toApiError } from '@/lib/api'

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
        <LockPanel next={location.pathname} title="질문은 부원만 고칠 수 있어요" buttonText="로그인하고 계속하기" />
      </SubPageLayout>
    )
  }

  const notFound = !validId || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')
  const back = validId ? `/questions/${id}` : '/questions'

  return (
    <SubPageLayout fallback={back}>
      {notFound && <Notice title="없는 글입니다" text="삭제됐거나 운영진이 숨긴 글이에요." to="/questions" link="질문 목록으로" />}

      {!notFound && detail.isPending && (
        <div className="space-y-4">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full" />
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

      {detail.data && !detail.data.mine && (
        <Notice title="본인 질문만 고칠 수 있어요" text="다른 부원의 질문은 수정할 수 없어요." to={back} link="질문으로 돌아가기" />
      )}

      {/* key: 다른 질문으로 바뀌면 입력 상태를 새로 */}
      {detail.data?.mine && <EditForm key={detail.data.id} question={detail.data} />}
    </SubPageLayout>
  )
}

function EditForm({ question }: { question: QuestionDetail }) {
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
    <div className="rounded-2xl bg-card px-6 py-10 text-center">
      <p className="text-lg font-bold text-title">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      <Link to={to} replace className={buttonVariants({ size: 'lg', className: 'mt-6 h-12 w-full' })}>
        {link}
      </Link>
    </div>
  )
}
