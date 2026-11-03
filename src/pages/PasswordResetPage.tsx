import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { NewPasswordFields } from '@/components/form/NewPasswordFields'
import { StepFooter, StepHeader } from '@/components/form/StepLayout'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword, sendPasswordResetCode, verifyPasswordResetCode } from '@/features/account/api'
import { meQueryKey, switchSession } from '@/features/auth/session'
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
    <SubPageLayout fallback="/login">
      {notice && (
        <p className="mb-6 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-text" role="status">
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
          onTokenExpired={() => restart('인증한 지 10분이 지났어요. 인증번호를 다시 받아 주세요.')}
        />
      )}
      {step === 'done' && (
        <div className="pb-10">
          <StepHeader
            eyebrow="비밀번호 재설정"
            title="비밀번호를 바꿨어요"
            description="모든 기기에서 로그아웃됐어요. 새 비밀번호로 다시 로그인해 주세요."
          />
          <Link to="/login" replace className={buttonVariants({ size: 'lg', className: 'h-12 w-full' })}>
            로그인하러 가기
          </Link>
        </div>
      )}
    </SubPageLayout>
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
      <StepHeader
        eyebrow="계정 찾기"
        title="비밀번호 재설정"
        description="가입할 때 인증한 이메일로 인증번호를 보내 드려요."
      />

      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="font-bold text-title" htmlFor="email">
            가입한 이메일
          </Label>
          <div className="flex gap-2">
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              maxLength={254}
              className="h-12 flex-1 bg-card"
              value={email}
              onChange={(e) => {
                onEmailChange(e.target.value)
                send.reset()
              }}
            />
            <Button
              type="button"
              variant="secondary"
              className="h-12 shrink-0"
              disabled={!canSend}
              onClick={() => {
                verify.reset()
                send.mutate()
              }}
            >
              {send.isPending ? '보내는 중…' : resendWait > 0 ? `${resendWait}초` : sentToThisEmail ? '다시 받기' : '인증번호 받기'}
            </Button>
          </div>
          {send.isError && (
            <p className="text-sm text-destructive" role="alert">
              {emailCodeErrorMessage(toApiError(send.error))}
            </p>
          )}
          {sentToThisEmail && !send.isError && (
            // 가입 여부를 드러내지 않도록 항상 같은 안내 (F1-07)
            <p className="rounded-lg bg-brand-soft px-3 py-2 text-xs leading-relaxed text-brand-text">
              가입된 메일이면 인증번호가 도착해요(10분 유효). 메일이 안 오면 스팸함을 확인해 주세요.
            </p>
          )}
        </div>

        {sentToThisEmail && (
          <div className="space-y-2">
            <Label className="font-bold text-title" htmlFor="code">
              인증번호 6자리
            </Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="h-12 bg-card text-lg tracking-[0.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            {verify.isError && (
              <p className="text-sm text-destructive" role="alert">
                {emailCodeErrorMessage(toApiError(verify.error))}
              </p>
            )}
          </div>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          가입한 이메일이 기억나지 않으면 운영진에게 문의해 주세요.
        </p>
      </div>

      <StepFooter>
        <Button type="submit" size="lg" className="h-12 w-full" disabled={!canVerify}>
          {verify.isPending ? '확인 중…' : '다음'}
        </Button>
      </StepFooter>
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
      <StepHeader
        eyebrow="비밀번호 재설정"
        title="새 비밀번호를 정해 주세요"
        description="바꾸면 모든 기기에서 로그아웃돼요."
      />

      <div className="space-y-6">
        <NewPasswordFields
          label="새 비밀번호"
          password={password}
          confirm={confirm}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirm}
        />
        {errorCode && errorCode.code !== 'RESET_TOKEN_INVALID' && (
          <p className="text-sm text-destructive" role="alert">
            {errorCode.code === 'PASSWORD_POLICY'
              ? '비밀번호는 8자 이상, 영문 · 숫자 · 특수문자를 모두 넣어 주세요.'
              : commonErrorMessage(errorCode)}
          </p>
        )}
      </div>

      <StepFooter>
        <Button type="submit" size="lg" className="h-12 w-full" disabled={!canSubmit}>
          {reset.isPending ? '바꾸는 중…' : '비밀번호 바꾸기'}
        </Button>
      </StepFooter>
    </form>
  )
}
