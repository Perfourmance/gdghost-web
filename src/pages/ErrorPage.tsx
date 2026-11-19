import { isRouteErrorResponse, useRouteError } from 'react-router'
import { IconHome } from '@/components/story'
import { LostWay, NotFoundPage } from '@/pages/NotFoundPage'

/** 화면을 그리다 에러가 나면 여기로 온다 (라우터의 에러 경계) — 404와 같은 끊긴 길 */
export function ErrorPage() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />

  return (
    <LostWay code="잠깐 · 길이 막혔어요" title={<>문제가 생겼어요</>} description="잠시 뒤 다시 시도해 주세요.">
      <button type="button" className="gh-home" onClick={() => window.location.reload()}>
        <IconHome />
        새로고침
      </button>
    </LostWay>
  )
}
