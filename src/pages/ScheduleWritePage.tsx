import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { scheduleErrorMessage, useCreateSchedule, type ScheduleInput } from '@/features/schedules/api'
import { ScheduleForm, type ScheduleFormValues } from '@/features/schedules/ScheduleForm'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { toApiError } from '@/lib/api'

const textOrNull = (text: string) => (text.trim() === '' ? null : text.trim())

/** 일정 등록 (S32). 캘린더에서 날짜를 골라 두고 오면 그 날짜로 채운다. 올리면 그 일정 상세로 */
export function ScheduleWritePage() {
  const { data: me } = useMe()
  const location = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const create = useCreateSchedule()
  const keyFor = useIdempotencyKey()
  const [initial] = useState<ScheduleFormValues>(() => {
    const date = params.get('date')
    return {
      kind: null,
      title: '',
      startDate: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
      endDate: '',
      place: '',
      memo: '',
    }
  })

  if (!me) {
    return (
      <SubPageLayout fallback="/schedules">
        <LockPanel next={location.pathname + location.search} title="일정은 부원만 등록할 수 있어요" buttonText="로그인하고 등록하기" />
      </SubPageLayout>
    )
  }

  function handleSubmit(values: ScheduleFormValues, allowLeave: () => void) {
    const input: ScheduleInput = {
      kind: values.kind!,
      title: values.title.trim(),
      startDate: values.startDate,
      endDate: values.endDate || null,
      place: textOrNull(values.place),
      memo: textOrNull(values.memo),
    }
    create.mutate(
      { input, key: keyFor(input) },
      {
        onSuccess: (created) => {
          allowLeave()
          navigate(`/schedules/${created.id}`, { replace: true })
        },
      },
    )
  }

  const error = create.error ? toApiError(create.error) : null

  return (
    <SubPageLayout fallback="/schedules">
      <ScheduleForm
        mode="create"
        initial={initial}
        staff={me.role === 'STAFF'}
        pending={create.isPending}
        error={error}
        formError={scheduleErrorMessage(error)}
        onSubmit={handleSubmit}
      />
    </SubPageLayout>
  )
}
