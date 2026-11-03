import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { confirmSignupEmail, sendSignupEmail } from '@/features/signup/api'
import type { SignupDraft } from '@/features/signup/draft'
import { useSecondsUntil } from '@/hooks/useSecondsUntil'
import { toApiError, type ApiError } from '@/lib/api'
import { commonErrorMessage, formatWait } from '@/lib/errorMessage'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 메일 발송 · 확인 에러. 남은 횟수처럼 서버 문구에 정보가 있는 건 서버 문구를 쓴다 */
function emailErrorMessage(e: ApiError): string {
  switch (e.code) {
    case 'EMAIL_ALREADY_USED':
      return '이미 가입된 이메일이에요. 로그인하거나 다른 이메일을 써 주세요.'
    case 'EMAIL_RESEND_TOO_SOON':
      return `${formatWait(e.retryAfter ?? 60)} 뒤에 다시 보낼 수 있어요.`
    case 'EMAIL_DAILY_LIMIT':
    case 'VERIFICATION_CODE_INVALID':
    case 'VERIFICATION_CODE_EXPIRED':
      return e.message
    case 'RATE_LIMITED':
      // 가입 한 번에 5통을 넘긴 경우는 retryAfter 없이 서버 문구로 안내
      return e.retryAfter ? commonErrorMessage(e) : e.message
    case 'VALIDATION_FAILED':
      return e.fieldMessage('code') ? '인증번호는 숫자 6자리예요.' : '이메일 형식을 확인해 주세요.'
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
    <form className="space-y-4" onSubmit={handleConfirm} noValidate>
      <div>
        <h2 className="text-xl font-bold text-title">이메일을 인증해 주세요</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {draft.generation}기로 가입해요. 아이디 · 비밀번호를 찾을 때 이 메일을 써요.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <div className="flex gap-2">
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            maxLength={254}
            className="h-11 flex-1 bg-card"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              send.reset()
            }}
          />
          <Button type="button" variant="secondary" className="h-11 shrink-0" disabled={!canSend} onClick={handleSend}>
            {send.isPending ? '보내는 중…' : resendWait > 0 ? `${resendWait}초` : sentToThisEmail ? '다시 받기' : '인증번호 받기'}
          </Button>
        </div>
        {sendError && (
          <p className="text-sm text-destructive" role="alert">
            {sendError}
          </p>
        )}
        {sentToThisEmail && !sendError && (
          <p className="text-sm text-muted-foreground">
            인증번호를 보냈어요(10분 유효). 메일이 안 오면 스팸함을 확인해 주세요.
          </p>
        )}
      </div>

      {sentToThisEmail && (
        <div className="space-y-2">
          <Label htmlFor="code">인증번호 6자리</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="h-11 bg-card tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          {confirmError && (
            <p className="text-sm text-destructive" role="alert">
              {confirmError}
            </p>
          )}
        </div>
      )}

      <Button type="submit" size="lg" className="h-11 w-full" disabled={!canConfirm}>
        {confirm.isPending ? '확인 중…' : '다음'}
      </Button>
    </form>
  )
}
