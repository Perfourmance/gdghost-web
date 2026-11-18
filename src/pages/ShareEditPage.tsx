import { useLocation, useNavigate, useParams } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Blocked, GoneSlot, LoadFail, LoadingDots, StorySubPage } from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { shareSubmitError, useShareDetail, useUpdateShare, type ShareDetail, type ShareInput } from '@/features/shares/api'
import { ShareForm, type ShareFormValues } from '@/features/shares/ShareForm'
import { toApiError } from '@/lib/api'

/** 공유 수정 — 본인 글만. 바꾼 필드만 보내고, 사진 · 태그는 바뀌었으면 통째로 (F6-03) */
export function ShareEditPage() {
  const { shareId } = useParams()
  const id = Number(shareId)
  const validId = Number.isInteger(id) && id > 0
  const { data: me } = useMe()
  const location = useLocation()
  const detail = useShareDetail(id, validId && me != null)

  if (!me) {
    return (
      <SubPageLayout fallback="/shares">
        <LockPanel next={location.pathname} title="공유는 부원만 고칠 수 있어요." buttonText="로그인하고 계속하기" />
      </SubPageLayout>
    )
  }

  const notFound = !validId || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')
  const back = validId ? `/shares/${id}` : '/shares'

  return (
    <StorySubPage fallback={back} className="gh-qwrite">
      {notFound && <GoneSlot title="책갈피가 있던 자리만 남았어요" to="/shares" link="공유 목록으로" />}
      {!notFound && detail.isPending && <LoadingDots className="mt-16" />}
      {!notFound && detail.isError && <LoadFail title="공유를 불러오지 못했어요" onRetry={() => detail.refetch()} />}
      {detail.data && !detail.data.mine && (
        <Blocked title="내 책갈피만 고칠 수 있어요" text="다른 사람이 꽂은 글이에요." to={back} link="글로 돌아가기" />
      )}
      {detail.data?.mine && <EditForm key={detail.data.id} share={detail.data} />}
    </StorySubPage>
  )
}

function EditForm({ share }: { share: ShareDetail }) {
  const navigate = useNavigate()
  const update = useUpdateShare(share.id)
  const initial: ShareFormValues = { category: share.category, title: share.title, body: share.body, tags: share.tags }
  const error = update.error ? toApiError(update.error) : null

  return (
    <ShareForm
      mode="edit"
      initial={initial}
      initialPhotos={[...share.photos].sort((a, b) => a.sortOrder - b.sortOrder).map((p) => ({ objectKey: p.objectKey, url: p.url }))}
      pending={update.isPending}
      error={error}
      formError={shareSubmitError(error)}
      onSubmit={({ values, photoKeys, photosChanged }, allowLeave) => {
        const input: Partial<ShareInput> = {}
        if (values.category !== initial.category) input.category = values.category!
        if (values.title !== initial.title) input.title = values.title
        if (values.body !== initial.body) input.body = values.body
        if (values.tags.join() !== initial.tags.join()) input.tags = values.tags
        if (photosChanged) input.photoKeys = photoKeys
        update.mutate(input, {
          onSuccess: () => {
            allowLeave()
            const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
            if (idx > 0) navigate(-1)
            else navigate(`/shares/${share.id}`, { replace: true })
          },
        })
      }}
    />
  )
}
