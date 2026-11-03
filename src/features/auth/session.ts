import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'

export type Role = 'MEMBER' | 'STAFF' | 'DEV'

/** GET /auth/me 응답 (백엔드 MeResponse) */
export interface Me {
  id: number
  loginId: string
  nickname: string
  generation: number
  role: Role
  staffTitle: string | null
  unreadNotificationCount: number
  unconfirmedMustReadCount: number
  profileCompleteness: {
    filled: number
    total: number
    missing: string[]
  }
}

export const meQueryKey = ['auth', 'me'] as const

/** 로그인했으면 내 정보, 비회원(401)이면 null */
async function fetchMe(): Promise<Me | null> {
  try {
    const { data } = await api.get<Me>('/auth/me')
    return data
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: fetchMe,
    retry: false,
    // 앱으로 돌아올 때만 다시 불러 알림 숫자를 갱신한다 (IA 2장)
    staleTime: Infinity,
    refetchOnWindowFocus: 'always',
  })
}

// 지난번 접속이 회원이었는지 기억해 로딩 화면 · 첫 테마를 고른다 (깜빡임 방지용, 판단은 항상 /auth/me)
// index.html의 인라인 스크립트도 같은 키를 읽는다
const LAST_SESSION_KEY = 'gdghost.lastSession'

export function readLastSessionWasMember(): boolean {
  try {
    return localStorage.getItem(LAST_SESSION_KEY) === 'member'
  } catch {
    return false
  }
}

export function rememberSession(isMember: boolean) {
  try {
    localStorage.setItem(LAST_SESSION_KEY, isMember ? 'member' : 'guest')
  } catch {
    // 저장소를 못 쓰면 기억하지 않는다
  }
}

/** 라이트 = 비회원, <html class="dark"> = 회원 */
export function applyTheme(isMember: boolean) {
  document.documentElement.classList.toggle('dark', isMember)
}
