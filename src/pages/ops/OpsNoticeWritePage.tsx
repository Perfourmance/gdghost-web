import { useNavigate, useParams } from 'react-router'
import { GoneNotice, LoadError } from '@/components/PageStates'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe } from '@/features/auth/session'
import { useNoticeDetail, type NoticeDetail } from '@/features/notices/api'
import { contentErrorMessage, useCreateNotice, useUpdateNotice, type NoticeInput } from '@/features/ops/content'
import { NoticeForm } from '@/features/ops/NoticeForm'
import { OpsGuard } from '@/features/ops/OpsBits'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { toApiError } from '@/lib/api'

const EMPTY: NoticeInput = { title: '', body: '', isPinned: true, isMustRead: false, dueDate: null }

/** 공지 쓰기 (S71) — 고정 기본 켬 · 필독 기본 끔. 올리면 공지 관리로 */
export function OpsNoticeWritePage() {
  const navigate = useNavigate()
  const create = useCreateNotice()
  const keyFor = useIdempotencyKey()
  return (
    <OpsGuard>
      <SubPageLayout fallback="/ops/notices">
        <NoticeForm
          mode="create"
          initial={EMPTY}
          pending={create.isPending}
          error={create.error ? contentErrorMessage(toApiError(create.error)) : null}
          onSubmit={(input, allowLeave) =>
            create.mutate(
              { input, key: keyFor(input) },
              {
                onSuccess: () => {
                  allowLeave()
                  navigate('/ops/notices', { replace: true })
                },
              },
            )
          }
        />
      </SubPageLayout>
    </OpsGuard>
  )
}

/** 공지 수정 — 다른 운영진이 쓴 공지도. 바꾼 필드만, 디스코드에 다시 올리지 않는다 */
export function OpsNoticeEditPage() {
  const { noticeId } = useParams()
  const id = Number(noticeId)
  const valid = Number.isInteger(id) && id > 0
  const { data: me } = useMe()
  const detail = useNoticeDetail(id, valid && me?.role === 'STAFF')
  const notFound = !valid || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')
  return (
    <OpsGuard>
      <SubPageLayout fallback="/ops/notices">
        {notFound && <GoneNotice title="공지를 찾을 수 없어요" text="삭제됐거나 없는 공지예요." to="/ops/notices" link="공지 관리로" />}
        {!notFound && detail.isPending && <Skeleton className="h-60 w-full rounded-xl" />}
        {!notFound && detail.isError && <LoadError text="공지를 불러오지 못했어요." onRetry={() => detail.refetch()} />}
        {detail.data && <EditForm key={detail.data.id} notice={detail.data} />}
      </SubPageLayout>
    </OpsGuard>
  )
}

function EditForm({ notice }: { notice: NoticeDetail }) {
  const navigate = useNavigate()
  const update = useUpdateNotice(notice.id)
  const initial: NoticeInput = {
    title: notice.title,
    body: notice.body,
    isPinned: notice.isPinned,
    isMustRead: notice.isMustRead,
    dueDate: notice.dueDate,
  }
  return (
    <NoticeForm
      mode="edit"
      initial={initial}
      pending={update.isPending}
      error={update.error ? contentErrorMessage(toApiError(update.error)) : null}
      onSubmit={(v, allowLeave) => {
        const input: Parameters<typeof update.mutate>[0] = {}
        if (v.title !== initial.title) input.title = v.title
        if (v.body !== initial.body) input.body = v.body
        if (v.isPinned !== initial.isPinned) input.isPinned = v.isPinned
        if (v.isMustRead !== initial.isMustRead) input.isMustRead = v.isMustRead
        if (v.dueDate !== initial.dueDate) {
          if (v.dueDate) input.dueDate = v.dueDate
          else input.clearDueDate = true
        }
        update.mutate(input, {
          onSuccess: () => {
            allowLeave()
            navigate('/ops/notices', { replace: true })
          },
        })
      }}
    />
  )
}
