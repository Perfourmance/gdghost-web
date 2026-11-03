import { api } from '@/lib/api'

// 가입 API (백엔드 SignupController). 가입 API는 멱등 키가 필요 없다

export interface InviteCodeCheckResponse {
  signupToken: string
  generation: number
  expiresAt: string
}

export interface VerificationSentResponse {
  expiresAt: string
  resendAvailableAt: string
}

export async function checkInviteCode(code: string) {
  return (await api.post<InviteCodeCheckResponse>('/auth/signup/invite-code', { code })).data
}

export async function sendSignupEmail(signupToken: string, email: string) {
  return (await api.post<VerificationSentResponse>('/auth/signup/email-verifications', { signupToken, email })).data
}

export async function confirmSignupEmail(signupToken: string, email: string, code: string) {
  return (await api.post<{ verified: boolean }>('/auth/signup/email-verifications/confirm', { signupToken, email, code }))
    .data
}
