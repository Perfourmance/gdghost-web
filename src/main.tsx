import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router/dom'
import { queryClient } from '@/lib/queryClient'
import { router } from '@/router'
import './index.css'

// 개발 서버에서만 테스트 도구를 띄운다. 빌드 때는 import.meta.env.DEV가 false라 파일째 빠진다
const DevPanel = import.meta.env.DEV ? lazy(() => import('@/dev/DevPanel')) : null

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
