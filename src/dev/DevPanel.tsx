import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, toApiError } from '@/lib/api'
import { switchSession, type Me } from '@/features/auth/session'

// 개발용 테스트 도구 — `npm run dev`에서만 보이고 빌드 결과에는 들어가지 않는다 (main.tsx에서 DEV일 때만 불러옴)
// 계정은 백엔드 로컬 계정 (인계 문서 4장)
const ACCOUNTS = [
  { loginId: 'senior01', label: '부원 senior01 (개발자)' },
  { loginId: 'asker01', label: '부원 asker01 (운영진)' },
]
const PASSWORD = 'Test1234!'

export default function DevPanel() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  async function login(loginId: string) {
    setMessage('로그인 중…')
    try {
      const { data } = await api.post<Me>('/auth/login', { loginId, password: PASSWORD })
      switchSession(queryClient, data)
      setMessage(`${data.nickname}(으)로 로그인함`)
    } catch (error) {
      setMessage(`실패: ${toApiError(error).code}`)
    }
  }

  async function logout() {
    setMessage('로그아웃 중…')
    try {
      await api.post('/auth/logout')
    } catch {
      // 이미 로그아웃이어도 비회원으로 돌린다
    }
    switchSession(queryClient, null)
    setMessage('비회원으로 바뀜')
  }

  return (
    <div className="fixed right-2 bottom-20 z-50 text-xs">
      {open ? (
        <div className="w-56 space-y-2 rounded-lg border bg-card p-3 text-card-foreground shadow-lg">
          <div className="flex items-center justify-between font-bold">
            테스트 도구
            <button type="button" onClick={() => setOpen(false)} aria-label="닫기">
              ✕
            </button>
          </div>
          {ACCOUNTS.map((account) => (
            <button
              key={account.loginId}
              type="button"
              className="block w-full rounded-md bg-secondary px-2 py-1.5 text-left text-secondary-foreground"
              onClick={() => login(account.loginId)}
            >
              {account.label}로 로그인
            </button>
          ))}
          <button
            type="button"
            className="block w-full rounded-md bg-secondary px-2 py-1.5 text-left text-secondary-foreground"
            onClick={logout}
          >
            로그아웃 (비회원)
          </button>
          {message && <p className="text-muted-foreground">{message}</p>}
        </div>
      ) : (
        <button
          type="button"
          className="rounded-full bg-foreground px-3 py-1.5 font-bold text-background opacity-70 shadow"
          onClick={() => setOpen(true)}
        >
          DEV
        </button>
      )}
    </div>
  )
}
