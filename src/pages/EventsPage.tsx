import { SegmentTabs } from '@/components/layout/SegmentTabs'
import { SCHEDULE_SEGMENTS } from '@/components/layout/segments'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { EmptyCard } from '@/features/content/Cards'
import { useEventList, type EventState, type EventSummary } from '@/features/events/api'
import { EventCard } from '@/features/events/EventBits'

const SECTIONS: { state: EventState; title: string }[] = [
  { state: 'ONGOING', title: '진행 중' },
  { state: 'UPCOMING', title: '예정' },
  { state: 'ENDED', title: '지난 이벤트' },
]

/** 이벤트 목록 (S35) — 진행 중 · 예정 · 지난 이벤트, 내 인증 횟수 (F5-05) */
export function EventsPage() {
  const { data: me } = useMe()
  const member = me != null
  const list = useEventList(member)

  return (
    <div className="pb-4">
      <h1 className="sr-only">이벤트</h1>
      <SegmentTabs items={SCHEDULE_SEGMENTS} label="일정 탭" />

      {!member ? (
        <div className="mt-6">
          <LockPanel next="/events" title="이벤트는 부원만 볼 수 있어요" buttonText="로그인하고 이벤트 보기" />
        </div>
      ) : (
        <EventSections list={list} />
      )}
    </div>
  )
}

function EventSections({ list }: { list: ReturnType<typeof useEventList> }) {
  if (list.isPending) {
    return (
      <div className="mt-5 space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
        ))}
      </div>
    )
  }
  if (list.isError) {
    return (
      <div className="mt-5 space-y-3 rounded-xl bg-card p-5 text-center" role="alert">
        <p className="text-sm">이벤트를 불러오지 못했어요.</p>
        <Button variant="secondary" onClick={() => list.refetch()}>
          다시 시도
        </Button>
      </div>
    )
  }
  if (list.data.length === 0) {
    return (
      <div className="mt-5">
        <EmptyCard>아직 열린 이벤트가 없어요. 운영진이 이벤트를 열면 여기에 보여요.</EmptyCard>
      </div>
    )
  }

  const byState = (state: EventState): EventSummary[] => list.data.filter((e) => e.state === state)
  return (
    <div className="mt-5 space-y-7">
      {SECTIONS.map(({ state, title }) => {
        const events = byState(state)
        if (events.length === 0) return null
        return (
          <section key={state}>
            <h2 className="mb-2 text-base font-bold text-title">{title}</h2>
            <div className="space-y-2">
              {events.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
