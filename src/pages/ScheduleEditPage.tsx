import { useLocation, useNavigate, useParams } from 'react-router'
import { Blocked, LoadFail, LoadingDots, StorySubPage } from '@/components/story'
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
      <LockPanel next={location.pathname} title="일정은 부원만 고칠 수 있어요." buttonText="로그인하기" />
    )
  }

  const notFound = !validId || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')
  const canEdit = detail.data && (detail.data.mine || me.role === 'STAFF')

  if (notFound || (detail.data && !canEdit)) {
    return (
      <StorySubPage fallback="/schedules">
        <Blocked
          title={notFound ? '일정을 찾을 수 없어요' : '고칠 수 없는 일정이에요'}
          text={notFound ? '삭제됐거나 없는 일정이에요.' : '일정을 띄운 부원이나 운영진만 고칠 수 있어요.'}
          to="/schedules"
          link="캘린더로"
        />
      </StorySubPage>
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
    <StorySubPage fallback={`/schedules/${id}`} className="gh-qwrite">
      {detail.isPending && <LoadingDots className="mt-16" />}
      {detail.isError && !notFound && <LoadFail title="일정을 불러오지 못했어요" onRetry={() => detail.refetch()} />}
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
    </StorySubPage>
  )
}
