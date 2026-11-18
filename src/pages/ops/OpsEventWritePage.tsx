import { useNavigate, useParams } from 'react-router'
import { Blocked, LoadFail, LoadingDots, StorySubPage } from '@/components/story'
import { useMe } from '@/features/auth/session'
import { useEventDetail, type EventDetail } from '@/features/events/api'
import { contentErrorMessage, useCreateEvent, useUpdateEvent, type EventInput } from '@/features/ops/content'
import { EventForm } from '@/features/ops/EventForm'
import { OpsGuard } from '@/features/ops/OpsBits'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { toApiError } from '@/lib/api'

const EMPTY: EventInput = {
  name: '',
  startDate: '',
  endDate: '',
  description: '',
  requirement: '',
  guideSteps: ['', '', '', ''],
  photoRequired: true,
}

export function OpsEventWritePage() {
  const navigate = useNavigate()
  const create = useCreateEvent()
  const keyFor = useIdempotencyKey()
  return (
    <OpsGuard>
      <StorySubPage fallback="/ops/events" className="gh-qwrite">
        <EventForm
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
                  navigate('/ops/events', { replace: true })
                },
              },
            )
          }
        />
      </StorySubPage>
    </OpsGuard>
  )
}

export function OpsEventEditPage() {
  const { eventId } = useParams()
  const id = Number(eventId)
  const valid = Number.isInteger(id) && id > 0
  const { data: me } = useMe()
  const detail = useEventDetail(id, valid && me?.role === 'STAFF')
  const notFound = !valid || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')
  return (
    <OpsGuard>
      <StorySubPage fallback="/ops/events" className="gh-qwrite">
        {notFound && <Blocked title="이벤트를 찾을 수 없어요" text="없는 이벤트예요." to="/ops/events" link="이벤트 관리로" />}
        {!notFound && detail.isPending && <LoadingDots className="mt-16" />}
        {!notFound && detail.isError && <LoadFail title="이벤트를 불러오지 못했어요" onRetry={() => detail.refetch()} />}
        {detail.data && <EditForm key={detail.data.id} event={detail.data} />}
      </StorySubPage>
    </OpsGuard>
  )
}

function EditForm({ event }: { event: EventDetail }) {
  const navigate = useNavigate()
  const update = useUpdateEvent(event.id)
  const steps = [...event.guideSteps, '', '', '', ''].slice(0, 4)
  const initial: EventInput = {
    name: event.name,
    startDate: event.startDate,
    endDate: event.endDate,
    description: event.description ?? '',
    requirement: event.requirement ?? '',
    guideSteps: steps,
    photoRequired: event.photoRequired,
  }
  return (
    <EventForm
      mode="edit"
      initial={initial}
      pending={update.isPending}
      error={update.error ? contentErrorMessage(toApiError(update.error)) : null}
      onSubmit={(v, allowLeave) => {
        const input: Partial<EventInput> = {}
        for (const key of Object.keys(v) as (keyof EventInput)[]) {
          if (JSON.stringify(v[key]) !== JSON.stringify(initial[key])) Object.assign(input, { [key]: v[key] })
        }
        update.mutate(input, {
          onSuccess: () => {
            allowLeave()
            navigate('/ops/events', { replace: true })
          },
        })
      }}
    />
  )
}
