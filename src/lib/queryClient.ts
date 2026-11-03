import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { meQueryKey, switchSession } from '@/features/auth/session'
import { ApiError } from '@/lib/api'

/**
 * 회원으로 쓰던 중 API가 401 UNAUTHENTICATED를 주면(로그인 만료 · 정지) 비회원으로 돌린다.
 * 로그인 실패(LOGIN_FAILED)도 401이라 상태가 아니라 code로 본다
 */
function handleSessionLost(error: unknown) {
  if (!(error instanceof ApiError) || error.code !== 'UNAUTHENTICATED') return
  if (queryClient.getQueryData(meQueryKey) == null) return
  switchSession(queryClient, null)
}

export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleSessionLost }),
  mutationCache: new MutationCache({ onError: handleSessionLost }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 4xx는 다시 불러도 같으므로 재시도하지 않는다
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 1,
    },
  },
})
