import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { confirmSignupEmail, sendSignupEmail } from '@/features/signup/api'
import { SIGNUP_STEP_LABELS, type SignupDraft } from '@/features/signup/draft'
import { IconTick, OtpInput, SignupCta, SignupHead, SignupLabel } from '@/features/signup/SignupParts'
import { useSecondsUntil } from '@/hooks/useSecondsUntil'
import { toApiError, type ApiError } from '@/lib/api'
import { commonErrorMessage, formatWait } from '@/lib/errorMessage'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 메일 발송 · 확인 에러. 남은 횟수처럼 서버 문구에 정보가 있는 건 서버 문구를 쓴다 */
function emailErrorMessage(e: ApiError): string {
  switch (e.code) {
    case 'EMAIL_ALREADY_USED':
      return '이미 가입된 이메일이에요. 로그인하거나 다른 이메일을 사용해 주세요.'
    case 'EMAIL_RESEND_TOO_SOON':
      return `${formatWait(e.retryAfter ?? 60)} 뒤 다시 보낼 수 있어요.`
    case 'EMAIL_DAILY_LIMIT':
    case 'VERIFICATION_CODE_INVALID':
    case 'VERIFICATION_CODE_EXPIRED':
      return e.message
    case 'RATE_LIMITED':
      // 가입 한 번에 5통을 넘긴 경우는 retryAfter 없이 서버 문구로 안내
      return e.retryAfter ? commonErrorMessage(e) : e.message
    case 'VALIDATION_FAILED':
      return e.fieldMessage('code') ? '인증번호 숫자 6자리' : '이메일 주소를 확인해 주세요.'
    default:
      return commonErrorMessage(e)
  }
}

interface Props {
  draft: SignupDraft
  onUpdate: (patch: Partial<SignupDraft>) => void
  /** 가입 토큰이 만료됐을 때 — 초대 코드부터 다시 */
  onSessionExpired: () => void
}

/** ② 이메일 인증 — 메일 입력 → 인증번호 받기 → 6자리 확인 */
export function EmailStep({ draft, onUpdate, onSessionExpired }: Props) {
  const signupToken = draft.signupToken ?? ''
  const [email, setEmail] = useState(draft.email ?? '')
  const [code, setCode] = useState('')

  const trimmedEmail = email.trim()
  const sentToThisEmail = draft.codeSentTo != null && draft.codeSentTo === trimmedEmail
  const resendWait = useSecondsUntil(
    sentToThisEmail && draft.resendAvailableAt ? Date.parse(draft.resendAvailableAt) : null,
  )

  function handleError(error: unknown) {
    if (toApiError(error).code === 'SIGNUP_SESSION_EXPIRED') onSessionExpired()
  }

  const send = useMutation({
    mutationFn: () => sendSignupEmail(signupToken, trimmedEmail),
    onSuccess: (res) =>
      onUpdate({ email: trimmedEmail, codeSentTo: trimmedEmail, resendAvailableAt: res.resendAvailableAt }),
    onError: handleError,
  })

  const confirm = useMutation({
    mutationFn: () => confirmSignupEmail(signupToken, trimmedEmail, code),
    onSuccess: () => onUpdate({ email: trimmedEmail, emailVerified: true, step: 'profile' }),
    onError: handleError,
  })

  const emailValid = EMAIL_PATTERN.test(trimmedEmail)
  const canSend = emailValid && !send.isPending && resendWait === 0
  const canConfirm = sentToThisEmail && /^\d{6}$/.test(code) && !confirm.isPending

  function handleSend() {
    if (!canSend) return
    confirm.reset()
    send.mutate()
  }

  function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canConfirm) confirm.mutate()
  }

  const sendError = send.isError ? emailErrorMessage(toApiError(send.error)) : null
  const confirmError = confirm.isError ? emailErrorMessage(toApiError(confirm.error)) : null

  return (
    <form onSubmit={handleConfirm} noValidate>
      {/* 기수는 초대 코드로 정해진다 (F1-01) — 앞 단계 결과를 확인시켜 준다 */}
      <span className="gh-su-ok">
        <IconTick />
        {draft.generation}기 초대장 확인
      </span>
      <SignupHead eye={SIGNUP_STEP_LABELS.email} title="연락받을 이메일을 알려 주세요">
        아이디·비밀번호를 찾을 때 써요.
      </SignupHead>

      <div className="gh-su-fl">
        <SignupLabel htmlFor="email">이메일</SignupLabel>
        <div className="gh-su-row">
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            maxLength={254}
            placeholder="name@example.com"
            className="gh-su-in"
            aria-invalid={sendError != null}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              send.reset()
            }}
          />
          <button type="button" className="gh-su-side" disabled={!canSend} onClick={handleSend}>
            {send.isPending ? '보내는 중…' : resendWait > 0 ? `${resendWait}초` : sentToThisEmail ? '다시 받기' : '인증번호 받기'}
          </button>
        </div>
      </div>
      {sendError && (
        <p className="gh-su-msg is-bad" role="alert">
          {sendError}
        </p>
      )}
      {sentToThisEmail && !sendError && (
        <p className="gh-su-msg is-info" role="status">
          인증번호를 보냈어요. 10분 안에 입력해 주세요.
        </p>
      )}

      {sentToThisEmail && (
        <div className="gh-su-fl">
          <SignupLabel htmlFor="code">인증번호 6자리</SignupLabel>
          <OtpInput
            id="code"
            value={code}
            invalid={confirmError != null}
            onChange={(v) => {
              setCode(v)
              if (confirm.isError) confirm.reset()
            }}
          />
          {confirmError && (
            <p className="gh-su-msg is-bad" role="alert">
              {confirmError}
            </p>
          )}
        </div>
      )}

      <SignupCta disabled={!canConfirm}>{confirm.isPending ? '확인하는 중…' : '이메일 인증하기'}</SignupCta>
    </form>
  )
}
