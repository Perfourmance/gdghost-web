import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { resetPassword, sendPasswordResetCode, verifyPasswordResetCode } from '@/features/account/api'
import { meQueryKey, switchSession } from '@/features/auth/session'
import { DayFormPage, DayNewPassword, OtpInput, SignupCta, SignupHead, SignupLabel } from '@/features/signup/SignupParts'
import { useSecondsUntil } from '@/hooks/useSecondsUntil'
import { toApiError } from '@/lib/api'
import { EMAIL_PATTERN, emailCodeErrorMessage } from '@/lib/emailErrors'
import { commonErrorMessage } from '@/lib/errorMessage'
import { isPasswordValid } from '@/lib/passwordRules'

type Step = 'verify' | 'password' | 'done'

/**
 * 비밀번호 재설정 (S03 · F1-07) — 메일 → 인증번호 → 새 비밀번호.
 * resetToken은 10분짜리 열쇠라 저장소에 두지 않고 메모리에만 둔다
 */
export function PasswordResetPage() {
  const [step, setStep] = useState<Step>('verify')
  const [email, setEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [notice, setNotice] = useState('')

  function restart(message: string) {
    setResetToken('')
    setStep('verify')
    setNotice(message)
  }

  return (
    <DayFormPage say={step === 'done' ? '새 열쇠가 생겼어요' : '열쇠를 다시 만들어요'}>
      {notice && (
        <p className="gh-su-notice" role="status">
          {notice}
        </p>
      )}
      {step === 'verify' && (
        <VerifyStep
          email={email}
          onEmailChange={setEmail}
          onVerified={(token) => {
            setNotice('')
            setResetToken(token)
            setStep('password')
          }}
        />
      )}
      {step === 'password' && (
        <NewPasswordStep
          resetToken={resetToken}
          onDone={() => setStep('done')}
          onTokenExpired={() => restart('인증 후 10분이 지났어요. 인증번호를 다시 받아 주세요.')}
        />
      )}
      {step === 'done' && (
        <>
          <SignupHead eye="비밀번호 재설정" title="비밀번호를 바꿨어요">
            모든 기기에서 로그아웃했어요. 새 비밀번호로 로그인해 주세요.
          </SignupHead>
          <div className="gh-su-cta is-two">
            <div>
              <Link to="/login" replace>
                로그인하러 가기
              </Link>
            </div>
          </div>
        </>
      )}
    </DayFormPage>
  )
}

function VerifyStep({
  email,
  onEmailChange,
  onVerified,
}: {
  email: string
  onEmailChange: (value: string) => void
  onVerified: (resetToken: string) => void
}) {
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resendAt, setResendAt] = useState<number | null>(null)
  const resendWait = useSecondsUntil(sentTo === email.trim() ? resendAt : null)

  const trimmed = email.trim()
  const send = useMutation({
    mutationFn: () => sendPasswordResetCode(trimmed),
    onSuccess: (res) => {
      setSentTo(trimmed)
      setResendAt(Date.parse(res.resendAvailableAt))
    },
  })
  const verify = useMutation({
    mutationFn: () => verifyPasswordResetCode(trimmed, code),
    onSuccess: (res) => onVerified(res.resetToken),
  })

  const sentToThisEmail = sentTo != null && sentTo === trimmed
  const canSend = EMAIL_PATTERN.test(trimmed) && !send.isPending && resendWait === 0
  const canVerify = sentToThisEmail && /^\d{6}$/.test(code) && !verify.isPending

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canVerify) verify.mutate()
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SignupHead eye="계정 찾기" title="비밀번호를 다시 정해요">
        가입할 때 인증한 이메일로 인증번호를 보내요.
      </SignupHead>

      <div className="gh-su-fl">
        <SignupLabel htmlFor="email">가입한 이메일</SignupLabel>
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
            aria-invalid={send.isError}
            value={email}
            onChange={(e) => {
              onEmailChange(e.target.value)
              send.reset()
            }}
          />
          <button
            type="button"
            className="gh-su-side"
            disabled={!canSend}
            onClick={() => {
              verify.reset()
              send.mutate()
            }}
          >
            {send.isPending ? '보내는 중…' : resendWait > 0 ? `${resendWait}초` : sentToThisEmail ? '다시 받기' : '인증번호 받기'}
          </button>
        </div>
      </div>
      {send.isError && (
        <p className="gh-su-msg is-bad" role="alert">
          {emailCodeErrorMessage(toApiError(send.error))}
        </p>
      )}
      {sentToThisEmail && !send.isError && (
        // 가입 여부를 드러내지 않도록 항상 같은 안내 (F1-07)
        <p className="gh-su-msg is-info" role="status">
          가입한 이메일이면 인증번호가 와요. 10분 안에 입력해 주세요.
        </p>
      )}

      {sentToThisEmail && (
        <div className="gh-su-fl">
          <SignupLabel htmlFor="code">인증번호 6자리</SignupLabel>
          <OtpInput
            id="code"
            value={code}
            invalid={verify.isError}
            onChange={(v) => {
              setCode(v)
              if (verify.isError) verify.reset()
            }}
          />
          {verify.isError && (
            <p className="gh-su-msg is-bad" role="alert">
              {emailCodeErrorMessage(toApiError(verify.error))}
            </p>
          )}
        </div>
      )}
      <p className="gh-su-foot">가입 때 쓴 이메일이 기억나지 않으면 운영진에게 물어봐 주세요.</p>

      <SignupCta disabled={!canVerify}>{verify.isPending ? '확인하는 중…' : '인증번호 확인'}</SignupCta>
    </form>
  )
}

function NewPasswordStep({
  resetToken,
  onDone,
  onTokenExpired,
}: {
  resetToken: string
  onDone: () => void
  onTokenExpired: () => void
}) {
  const queryClient = useQueryClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const reset = useMutation({
    mutationFn: () => resetPassword(resetToken, password),
    onSuccess: () => {
      // 모든 기기가 로그아웃된다 — 이 기기에서 로그인 중이었어도 비회원으로
      if (queryClient.getQueryData(meQueryKey)) switchSession(queryClient, null)
      onDone()
    },
    onError: (error) => {
      if (toApiError(error).code === 'RESET_TOKEN_INVALID') onTokenExpired()
    },
  })

  const canSubmit = isPasswordValid(password) && confirm === password && !reset.isPending
  const errorCode = reset.isError ? toApiError(reset.error) : null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canSubmit) reset.mutate()
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SignupHead eye="비밀번호 재설정" title="새 열쇠를 만들어요">
        비밀번호를 바꾸면 모든 기기에서 로그아웃돼요.
      </SignupHead>

      <DayNewPassword label="새 비밀번호" password={password} confirm={confirm} onPasswordChange={setPassword} onConfirmChange={setConfirm} />
      {errorCode && errorCode.code !== 'RESET_TOKEN_INVALID' && (
        <p className="gh-su-msg is-bad" role="alert">
          {errorCode.code === 'PASSWORD_POLICY' ? '8자 이상 · 영문, 숫자, 특수문자 포함' : commonErrorMessage(errorCode)}
        </p>
      )}

      <SignupCta disabled={!canSubmit}>{reset.isPending ? '바꾸는 중…' : '비밀번호 바꾸기'}</SignupCta>
    </form>
  )
}
