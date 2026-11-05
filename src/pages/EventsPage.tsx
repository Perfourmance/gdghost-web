import { SegmentTabs } from '@/components/layout/SegmentTabs'
import { SCHEDULE_SEGMENTS } from '@/components/layout/segments'

/** 이벤트 목록 (S35) 자리 — F16에서 실제 화면으로 바꾼다 */
export function EventsPage() {
  return (
    <div className="pb-4">
      <h1 className="sr-only">이벤트</h1>
      <SegmentTabs items={SCHEDULE_SEGMENTS} label="일정 탭" />
      <p className="mt-6 text-sm text-muted-foreground">준비 중인 화면이에요</p>
    </div>
  )
}
