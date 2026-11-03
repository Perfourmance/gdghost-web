import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { api } from '@/lib/api'
import { switchSession, type Me } from '@/features/auth/session'

export interface LoginRequest {
  loginId: string
  password: string
  /** true면 30일 유지, false면 브라우저를 닫으면 끝 */
  remember: boolean
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: LoginRequest) => (await api.post<Me>('/auth/login', request)).data,
    onSuccess: (me) => switchSession(queryClient, me),
  })
}

/** 로그아웃 후 라이트 홈으로. 서버 요청이 실패해도 이 기기에서는 비회원으로 돌린다 */
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      switchSession(queryClient, null)
      navigate('/', { replace: true })
    },
  })
}

/** 로그인 뒤 돌아갈 주소. 다른 사이트로 보내는 주소(//evil.com 등)는 막는다 */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/login')) return '/'
  return next
}

/** 지금 보는 화면으로 돌아오게 하는 로그인 주소 */
export function loginPath(current: string): string {
  return current === '/' ? '/login' : `/login?next=${encodeURIComponent(current)}`
}
