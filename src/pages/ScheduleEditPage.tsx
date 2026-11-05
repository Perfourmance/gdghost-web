import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import {
  scheduleErrorMessage,
  useScheduleDetail,
  useUpdateSchedule,
  type ScheduleDetail,
  type ScheduleUpdateInput,
} from '@/features/schedules/api'
import { ScheduleForm, type ScheduleFormValues } from '@/features/schedules/ScheduleForm'
import { toApiError } from '@/lib/api'

function toValues(detail: ScheduleDetail): ScheduleFormValues {
  return {
    kind: detail.kind,
    title: detail.title,
    startDate: detail.startDate,
    endDate: detail.endDate ?? '',
    place: detail.place ?? '',
    memo: detail.memo ?? '',
  }
}

/** 바뀐 칸만 보낸다. 장소 · 메모를 비우면 '' (서버가 지움), 기간을 없애면 clearEndDate */
function changes(before: ScheduleFormValues, after: ScheduleFormValues): ScheduleUpdateInput {
  const input: ScheduleUpdateInput = {}
  if (after.kind !== before.kind) input.kind = after.kind!
  if (after.title.trim() !== before.title.trim()) input.title = after.title.trim()
  if (after.startDate !== before.startDate) input.startDate = after.startDate
  if (after.endDate !== before.endDate) {
    if (after.endDate) input.endDate = after.endDate
    else input.clearEndDate = true
  }
  if (after.place.trim() !== before.place.trim()) input.place = after.place.trim()
  if (after.memo.trim() !== before.memo.trim()) input.memo = after.memo.trim()
  return input
}

/** 일정 수정 — 등록한 사람 또는 운영진 */
export function ScheduleEditPage() {
  const { scheduleId } = useParams()
  const id = Number(scheduleId)
  const validId = Number.isInteger(id) && id > 0
  const { data: me } = useMe()
  const location = useLocation()
  const navigate = useNavigate()
  const detail = useScheduleDetail(id, validId && me != null)
  const update = useUpdateSchedule(id)

  if (!me) {
    return (
      <SubPageLayout fallback="/schedules">
        <LockPanel next={location.pathname} title="일정은 부원만 고칠 수 있어요" buttonText="로그인하기" />
      </SubPageLayout>
    )
  }

  const notFound = !validId || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')
  const canEdit = detail.data && (detail.data.mine || me.role === 'STAFF')

  if (notFound || (detail.data && !canEdit)) {
    return (
      <SubPageLayout fallback="/schedules">
        <div className="rounded-2xl bg-card px-6 py-10 text-center">
          <p className="text-lg font-bold text-title">{notFound ? '일정을 찾을 수 없어요' : '고칠 수 없는 일정이에요'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {notFound ? '삭제됐거나 없는 일정이에요.' : '등록한 사람과 운영진만 고칠 수 있어요.'}
          </p>
          <Link to="/schedules" replace className={buttonVariants({ size: 'lg', className: 'mt-6 h-12 w-full' })}>
            캘린더로
          </Link>
        </div>
      </SubPageLayout>
    )
  }

  function handleSubmit(values: ScheduleFormValues, allowLeave: () => void) {
    const input = changes(toValues(detail.data!), values)
    update.mutate(input, {
      onSuccess: () => {
        allowLeave()
        navigate(`/schedules/${id}`, { replace: true })
      },
    })
  }

  const error = update.error ? toApiError(update.error) : null

  return (
    <SubPageLayout fallback={`/schedules/${id}`}>
      {detail.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      )}
      {detail.isError && !notFound && (
        <div className="space-y-3 rounded-xl bg-card p-5 text-center" role="alert">
          <p className="text-sm">일정을 불러오지 못했어요.</p>
          <Button variant="secondary" onClick={() => detail.refetch()}>
            다시 시도
          </Button>
        </div>
      )}
      {detail.data && (
        <ScheduleForm
          key={detail.data.id}
          mode="edit"
          initial={toValues(detail.data)}
          staff={me.role === 'STAFF'}
          pending={update.isPending}
          error={error}
          formError={scheduleErrorMessage(error)}
          onSubmit={handleSubmit}
        />
      )}
    </SubPageLayout>
  )
}
