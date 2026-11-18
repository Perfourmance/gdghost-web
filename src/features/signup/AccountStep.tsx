import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { switchSession } from '@/features/auth/session'
import { completeSignup, type SignupRequest } from '@/features/signup/api'
import { SIGNUP_STEP_LABELS, type SignupDraft, type SignupStep } from '@/features/signup/draft'
import { hasWhitespace, isPasswordValid } from '@/lib/passwordRules'
import { IconTick, PasswordRuleDots, SignupCta, SignupHead, SignupLabel } from '@/features/signup/SignupParts'
import { useLoginIdCheck } from '@/features/signup/useLoginIdCheck'
import { toApiError, type ApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'
import { cn } from '@/lib/utils'

interface Props {
  draft: SignupDraft
  /** 다른 단계의 값을 고쳐야 할 때 그 단계로 보낸다 */
  onRedirect: (step: SignupStep, message: string, patch?: Partial<SignupDraft>) => void
  /** 가입 토큰이 끝났을 때 — 초대 코드부터 다시 */
  onRestart: (message: string) => void
  /** 가입 성공 직전 — 보관한 입력값을 지운다 */
  onFinished: () => void
}

/** 서버가 준 칸 이름 → 그 칸이 있는 단계 */
function stepOfField(field: string): SignupStep | null {
  if (field.startsWith('profile.interestTagIds') || field.startsWith('profile.skillTagIds')) return 'interests'
  if (field.startsWith('profile.experienceTagIds')) return 'experiences'
  if (field.startsWith('profile.statusNote') || field.startsWith('profile.bio')) return 'about'
  if (field.startsWith('profile.')) return 'profile'
  return null
}

function buildRequest(draft: SignupDraft, loginId: string, password: string): SignupRequest | null {
  const { basic, answerable, signupToken } = draft
  if (!signupToken || !basic || !answerable || !basic.position || !basic.status) return null
  return {
    signupToken,
    loginId,
    password,
    profile: {
      name: basic.name.trim(),
      nickname: basic.nickname.trim(),
      position: basic.position,
      studentNo: basic.studentNo,
      department: basic.department.trim(),
      status: basic.status,
      interestTagIds: answerable.interestTagIds,
      skillTagIds: answerable.skillTagIds,
      experienceTagIds: answerable.experienceTagIds,
      statusNote: answerable.statusNote.trim() || null,
      bio: answerable.bio.trim() || null,
    },
  }
}

/** ⑦ 아이디 · 비밀번호 → POST /auth/signup. 성공하면 바로 로그인돼 다크 홈으로 */
export function AccountStep({ draft, onRedirect, onRestart, onFinished }: Props) {
  const queryClient = useQueryClient()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const loginIdCheck = useLoginIdCheck(loginId)

  const signup = useMutation({
    mutationFn: completeSignup,
    onSuccess: (me) => {
      onFinished()
      switchSession(queryClient, me)
    },
    onError: (error) => handleError(toApiError(error)),
  })

  function handleError(e: ApiError) {
    switch (e.code) {
      case 'LOGIN_ID_TAKEN':
        setErrorMessage('이미 사용 중인 아이디')
        return
      case 'PASSWORD_POLICY':
        setErrorMessage('8자 이상 · 영문, 숫자, 특수문자 포함')
        return
      case 'NICKNAME_TAKEN':
        onRedirect('profile', '이미 사용 중인 닉네임')
        return
      case 'NICKNAME_RESERVED':
        onRedirect('profile', "‘익명’으로 시작하는 닉네임은 쓸 수 없어요.")
        return
      case 'EMAIL_ALREADY_USED':
        onRedirect('email', '이미 가입된 이메일이에요. 다른 이메일로 인증해 주세요.', {
          emailVerified: false,
          codeSentTo: undefined,
          resendAvailableAt: undefined,
        })
        return
      case 'SIGNUP_SESSION_EXPIRED':
        onRestart('가입 시간 30분이 지났어요. 초대 코드부터 다시 입력해 주세요.')
        return
      case 'INVITE_CODE_INVALID':
        onRestart('운영진에게 새 초대 코드를 받아 주세요.')
        return
      case 'VALIDATION_FAILED': {
        const field = e.fieldErrors.find((f) => stepOfField(f.field) != null)
        if (field) {
          onRedirect(stepOfField(field.field)!, field.message)
          return
        }
        setErrorMessage(e.fieldErrors[0]?.message ?? '입력한 내용을 확인해 주세요.')
        return
      }
      default:
        setErrorMessage(commonErrorMessage(e))
    }
  }

  const passwordValid = isPasswordValid(password)
  const canSubmit =
    loginIdCheck.state === 'available' && passwordValid && passwordConfirm === password && !signup.isPending

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    const request = buildRequest(draft, loginId.trim(), password)
    if (!request) {
      onRedirect('profile', '빠진 프로필 항목을 확인해 주세요.')
      return
    }
    setErrorMessage('')
    signup.mutate(request)
  }

  const loginIdMessage = {
    empty: <span className="gh-su-hint">영문 · 숫자 4-16자</span>,
    checking: <span className="gh-su-hint">확인하는 중…</span>,
    available: (
      <span className="gh-su-msg is-good">
        <IconTick />
        쓸 수 있어요
      </span>
    ),
    invalid: <span className="gh-su-msg is-bad">{loginIdCheck.state === 'invalid' ? loginIdCheck.message : ''}</span>,
    error: <span className="gh-su-msg is-bad">확인하지 못했어요. 잠시 뒤 다시 입력해 주세요.</span>,
  }[loginIdCheck.state]
  const confirmMismatch = passwordConfirm !== '' && passwordConfirm !== password

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SignupHead eye={SIGNUP_STEP_LABELS.account} title="마지막으로, 열쇠를 만들어요">
        로그인에 쓸 아이디와 비밀번호예요.
      </SignupHead>

      <div className="gh-su-fl">
        <SignupLabel htmlFor="loginId">아이디</SignupLabel>
        <input
          id="loginId"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={16}
          className={cn('gh-su-in', loginIdCheck.state === 'available' && 'is-good')}
          aria-describedby="loginId-help"
          aria-invalid={loginIdCheck.state === 'invalid'}
          value={loginId}
          onChange={(e) => setLoginId(e.target.value.replace(/\s/g, ''))}
        />
        <div id="loginId-help" aria-live="polite">
          {loginIdMessage}
        </div>
      </div>

      <div className="gh-su-fl">
        <SignupLabel htmlFor="newPassword">비밀번호</SignupLabel>
        <input
          id="newPassword"
          name="new-password"
          type="password"
          autoComplete="new-password"
          maxLength={64}
          className="gh-su-in"
          aria-describedby="password-rules"
          aria-invalid={hasWhitespace(password)}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordRuleDots id="password-rules" password={password} />
        {hasWhitespace(password) && <p className="gh-su-msg is-bad">공백은 넣을 수 없어요.</p>}
      </div>

      <div className="gh-su-fl">
        <SignupLabel htmlFor="newPasswordConfirm">비밀번호 확인</SignupLabel>
        <input
          id="newPasswordConfirm"
          type="password"
          autoComplete="new-password"
          maxLength={64}
          className="gh-su-in"
          aria-invalid={confirmMismatch}
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
        />
        {confirmMismatch && <p className="gh-su-msg is-bad">두 비밀번호가 달라요. 같은 비밀번호를 입력해 주세요.</p>}
      </div>

      {errorMessage && (
        <p className="gh-su-msg is-bad" role="alert">
          {errorMessage}
        </p>
      )}

      <SignupCta disabled={!canSubmit}>{signup.isPending ? '가입하는 중…' : '가입하기'}</SignupCta>
    </form>
  )
}
