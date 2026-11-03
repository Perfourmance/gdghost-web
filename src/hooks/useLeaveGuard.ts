import { useCallback, useEffect, useRef } from 'react'
import { useBlocker } from 'react-router'

/**
 * 작성 화면을 나갈 때 입력한 내용이 있으면 한 번 묻는다 (IA 2장).
 * 저장에 성공해 화면을 옮길 때는 allowLeave()를 먼저 부른다
 */
export function useLeaveGuard(dirty: boolean, message: string) {
  const allowed = useRef(false)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !allowed.current && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm(message)) blocker.proceed()
    else blocker.reset()
  }, [blocker, message])

  // 새로고침 · 탭 닫기는 브라우저 기본 안내
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  return useCallback(() => {
    allowed.current = true
  }, [])
}
