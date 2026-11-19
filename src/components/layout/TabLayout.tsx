import { Outlet } from 'react-router'
import { StoryTabs } from '@/components/story'
import { useMe } from '@/features/auth/session'
import { cn } from '@/lib/utils'

/**
 * 탭 화면 틀 (홈 · 질문 · 부원 · 일정 · 모집 · 이벤트 · 공유 · 피드) — 화면이 상단 · 바탕을 스스로 그리고, 여기는 아래 탭만.
 * 비회원 = 낮, 회원 = 밤. 상세 · 작성 화면은 이 틀을 쓰지 않는다
 */
export function TabLayout() {
  const { data: me, isError } = useMe()
  const member = me != null

  return (
    <div className={cn('min-h-dvh', member ? 'gh-night' : 'gh-day')}>
      {isError && (
        <p className="mx-auto max-w-md bg-gh-ticket px-4 py-2 text-center text-sm text-gh-ticket-ink" role="alert">
          서버에 연결하지 못했어요. 잠시 뒤 다시 열어 주세요.
        </p>
      )}
      <div className="mx-auto max-w-md">
        <Outlet />
      </div>
      <StoryTabs day={!member} />
    </div>
  )
}
