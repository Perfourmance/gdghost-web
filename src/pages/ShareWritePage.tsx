import { useLocation, useNavigate } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { shareSubmitError, useCreateShare, type ShareInput } from '@/features/shares/api'
import { ShareForm, type ShareFormValues } from '@/features/shares/ShareForm'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { toApiError } from '@/lib/api'

const EMPTY: ShareFormValues = { category: null, title: '', body: '', tags: [] }

/** 공유 작성 (S42). 올리면 그 글 상세로 */
export function ShareWritePage() {
  const { data: me } = useMe()
  const location = useLocation()
  const navigate = useNavigate()
  const create = useCreateShare()
  const keyFor = useIdempotencyKey()

  if (!me) {
    return (
      <SubPageLayout fallback="/shares">
        <LockPanel next={location.pathname} title="공유는 부원만 올릴 수 있어요" buttonText="로그인하고 공유하기" />
      </SubPageLayout>
    )
  }

  const error = create.error ? toApiError(create.error) : null

  return (
    <SubPageLayout fallback="/shares">
      <ShareForm
        mode="create"
        initial={EMPTY}
        pending={create.isPending}
        error={error}
        formError={shareSubmitError(error)}
        onSubmit={({ values, photoKeys }, allowLeave) => {
          const input: ShareInput = {
            category: values.category!,
            title: values.title,
            body: values.body,
            tags: values.tags,
            photoKeys,
          }
          create.mutate(
            { input, key: keyFor(input) },
            {
              onSuccess: (created) => {
                allowLeave()
                navigate(`/shares/${created.id}`, { replace: true })
              },
            },
          )
        }}
      />
    </SubPageLayout>
  )
}
