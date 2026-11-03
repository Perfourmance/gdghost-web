import { useLayoutEffect } from 'react'
import { Outlet } from 'react-router'
import { LoadingScreen } from '@/components/LoadingScreen'
import { applyTheme, readLastSessionWasMember, rememberSession, useMe } from '@/features/auth/session'

/** 모든 화면의 바깥 틀 — /auth/me 결과가 오기 전엔 로딩 화면, 온 뒤엔 로그인 상태로 테마를 정한다 */
export function RootLayout() {
  const { data: me, isPending } = useMe()
  // 서버에 못 닿으면(에러) 비회원 화면으로 본다
  const isMember = !isPending && me != null

  useLayoutEffect(() => {
    if (isPending) return
    applyTheme(isMember)
    rememberSession(isMember)
  }, [isPending, isMember])

  if (isPending) return <LoadingScreen member={readLastSessionWasMember()} />
  return <Outlet />
}
