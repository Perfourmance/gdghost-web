import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router/dom'
// 홈 화면에 추가 이벤트(beforeinstallprompt)는 화면보다 먼저 올 수 있어 시작할 때 받아 둔다
import '@/features/push/push'
import { queryClient } from '@/lib/queryClient'
import { router } from '@/router'
import './index.css'

// 개발 서버에서만 테스트 도구를 띄운다. 빌드 때는 import.meta.env.DEV가 false라 파일째 빠진다
const DevPanel = import.meta.env.DEV ? lazy(() => import('@/dev/DevPanel')) : null

// 푸시 알림을 누르면 서비스 워커(src/sw.ts)가 열린 창에 이동할 주소를 보낸다
navigator.serviceWorker?.addEventListener('message', (event: MessageEvent<{ type?: string; path?: string }>) => {
  if (event.data?.type === 'OPEN_PATH' && event.data.path?.startsWith('/')) void router.navigate(event.data.path)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {DevPanel && (
        <Suspense>
          <DevPanel />
        </Suspense>
      )}
    </QueryClientProvider>
  </StrictMode>,
)
