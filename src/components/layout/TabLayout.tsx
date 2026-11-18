import { Outlet, useLocation } from 'react-router'
import { BottomTabs } from '@/components/layout/BottomTabs'
import { TopBar } from '@/components/layout/TopBar'
import { StoryTabs } from '@/components/story'
import { useMe } from '@/features/auth/session'
import { cn } from '@/lib/utils'

/**
 * 리디자인(temp/design/gdghost)으로 옮긴 탭 화면. 이 화면들은 상단 · 바탕을 스스로 그리고 아래 탭만 새 탭을 쓴다.
 * 묶음을 옮길 때마다 주소를 더하고, 다 옮기면 옛 틀(TopBar · BottomTabs)과 이 목록을 지운다
 */
const STORY_ROUTES = {
  guest: ['/', '/questions'],
  member: [] as string[],
}

/** 탭 화면 틀 — 상단 바 + 내용 + 하단 탭. 상세 · 작성 화면은 이 틀을 쓰지 않는다 */
export function TabLayout() {
  const { data: me, isError } = useMe()
  const { pathname } = useLocation()
  const member = me != null
  const story = (member ? STORY_ROUTES.member : STORY_ROUTES.guest).includes(pathname)

  const offline = isError && (
    <p
      className={cn('mx-auto max-w-md px-4 py-2 text-center text-sm', story ? 'bg-gh-ticket text-gh-ticket-ink' : 'bg-muted text-muted-foreground')}
      role="alert"
    >
      서버에 연결하지 못했어요. 잠시 뒤 다시 열어 주세요.
    </p>
  )

  if (story) {
    return (
      <div className={cn('min-h-dvh', member ? 'gh-night' : 'gh-day')}>
        {offline}
        <div className="mx-auto max-w-md">
          <Outlet />
        </div>
        <StoryTabs day={!member} />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      <TopBar />
      {offline}
      <main className="mx-auto max-w-md px-4 pt-4 pb-24">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  )
}
