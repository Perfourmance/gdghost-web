import type { Me } from '@/features/auth/session'
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

export interface SignupRequest {
  signupToken: string
  loginId: string
  password: string
  profile: {
    name: string
    nickname: string
    position: string
    studentNo: string
    department: string
    status: string
    interestTagIds: number[]
    skillTagIds: number[]
    experienceTagIds: number[]
    statusNote: string | null
    bio: string | null
  }
}

/** 가입 완료 — 계정을 만들고 바로 로그인한다(로그인 유지). 응답은 /auth/me와 같은 모양 */
export async function completeSignup(request: SignupRequest) {
  return (await api.post<Me>('/auth/signup', request)).data
}
