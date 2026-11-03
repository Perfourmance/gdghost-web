import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'
import { CenteredMessage, NotFoundPage } from '@/pages/NotFoundPage'

/** 화면을 그리다 에러가 나면 여기로 온다 (라우터의 에러 경계) */
export function ErrorPage() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />

  return (
    <CenteredMessage title="문제가 생겼어요" description="잠시 뒤 다시 시도해 주세요">
      <Button size="lg" className="w-full" onClick={() => window.location.reload()}>
        새로고침
      </Button>
    </CenteredMessage>
  )
}
