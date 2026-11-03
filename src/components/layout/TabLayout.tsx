import { Outlet } from 'react-router'
import { BottomTabs } from '@/components/layout/BottomTabs'
import { TopBar } from '@/components/layout/TopBar'
import { useMe } from '@/features/auth/session'

/** 탭 화면 틀 — 상단 바 + 내용 + 하단 탭. 상세 · 작성 화면은 이 틀을 쓰지 않는다 */
export function TabLayout() {
  const { isError } = useMe()

  return (
    <div className="min-h-dvh bg-background">
      <TopBar />
      {isError && (
        <p className="mx-auto max-w-md bg-muted px-4 py-2 text-center text-sm text-muted-foreground" role="alert">
          서버에 연결하지 못했어요. 잠시 뒤 다시 열어 주세요
        </p>
      )}
      <main className="mx-auto max-w-md px-4 pt-4 pb-24">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  )
}
