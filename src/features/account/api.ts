import { api } from '@/lib/api'

// 계정 찾기 API (백엔드 AccountRecoveryController · PasswordResetController · EmailChangeLinkController)
// 가입 안 된 메일에도 같은 응답을 준다 — 화면도 가입 여부를 드러내지 않는다

export async function findLoginId(email: string) {
  await api.post('/auth/find-login-id', { email })
}

export async function sendPasswordResetCode(email: string) {
  return (await api.post<{ resendAvailableAt: string }>('/auth/password-reset/codes', { email })).data
}

/** 맞으면 10분짜리 resetToken */
export async function verifyPasswordResetCode(email: string, code: string) {
  return (await api.post<{ resetToken: string; expiresAt: string }>('/auth/password-reset/verify', { email, code })).data
}

/** 모든 기기 로그아웃 · 자동 로그인 없음 */
export async function resetPassword(resetToken: string, newPassword: string) {
  await api.post('/auth/password-reset', { resetToken, newPassword })
}

/** 어드민이 요청한 이메일 변경을 메일 링크의 토큰으로 반영. 모든 기기 로그아웃 */
export async function confirmEmailChange(token: string) {
  await api.post('/auth/email-change/confirm', { token })
}
