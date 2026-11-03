import { useCallback, useEffect, useState } from 'react'

export type SignupStep = 'invite' | 'email' | 'profile'

/** 가입 단계 순서. F2-b · F2-c에서 뒤 단계를 더한다 */
export const SIGNUP_STEPS: SignupStep[] = ['invite', 'email', 'profile']
/** 화면에 보여 줄 전체 단계 수 (초대 코드 · 이메일 · 기본 정보 · 답할 수 있는 것 · 아이디) */
export const SIGNUP_STEP_TOTAL = 5

/** 가입 중 입력값. 비밀번호는 넣지 않는다 */
export interface SignupDraft {
  step: SignupStep
  signupToken?: string
  generation?: number
  /** 가입 토큰 만료 시각(ISO). 30분 */
  expiresAt?: string
  email?: string
  /** 인증번호를 보낸 메일 · 다시 보낼 수 있는 시각 */
  codeSentTo?: string
  resendAvailableAt?: string
  emailVerified?: boolean
}

const EMPTY: SignupDraft = { step: 'invite' }
// 메일 앱에 다녀오며 페이지가 새로 열려도 이어서 하도록 탭 단위 저장소에 둔다 (탭을 닫으면 지워짐)
const KEY = 'gdghost.signupDraft'

export function isDraftExpired(draft: SignupDraft): boolean {
  return draft.expiresAt != null && Date.now() >= Date.parse(draft.expiresAt)
}

function load(): { draft: SignupDraft; expired: boolean } {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return { draft: EMPTY, expired: false }
    const draft = JSON.parse(raw) as SignupDraft
    if (!SIGNUP_STEPS.includes(draft.step)) return { draft: EMPTY, expired: false }
    if (isDraftExpired(draft)) return { draft: EMPTY, expired: true }
    return { draft, expired: false }
  } catch {
    return { draft: EMPTY, expired: false }
  }
}

function save(draft: SignupDraft) {
  try {
    if (draft.step === 'invite' && !draft.signupToken) sessionStorage.removeItem(KEY)
    else sessionStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // 저장소를 못 쓰면 메모리로만 진행한다
  }
}

export function useSignupDraft() {
  const [initial] = useState(load)
  const [draft, setDraft] = useState<SignupDraft>(initial.draft)

  useEffect(() => save(draft), [draft])

  const update = useCallback((patch: Partial<SignupDraft>) => setDraft((prev) => ({ ...prev, ...patch })), [])
  const reset = useCallback(() => setDraft(EMPTY), [])

  return { draft, update, reset, loadedExpired: initial.expired }
}

/** 탭을 닫지 않고 가입을 그만둘 때 */
export function clearSignupDraft() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // 무시
  }
}
