import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router/dom'
import { ApiError } from '@/lib/api'
import { router } from '@/router'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 4xx는 다시 불러도 같으므로 재시도하지 않는다
      retry: (failureCount, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 1,
    },
  },
})

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
