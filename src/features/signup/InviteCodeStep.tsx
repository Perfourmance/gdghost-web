import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { checkInviteCode } from '@/features/signup/api'
import { SIGNUP_STEP_LABELS, type SignupDraft } from '@/features/signup/draft'
import { SignupCta, SignupHead, SignupLabel } from '@/features/signup/SignupParts'
import { toApiError } from '@/lib/api'
import { commonErrorMessage, formatWait } from '@/lib/errorMessage'

function inviteErrorMessage(error: unknown): string {
  const e = toApiError(error)
  switch (e.code) {
    case 'INVITE_CODE_INVALID':
    case 'VALIDATION_FAILED':
      return '사용할 수 없는 코드예요. 운영진에게 받은 코드를 다시 확인해 주세요.'
    case 'INVITE_CODE_LOCKED':
      return `시도 횟수를 넘었어요. ${formatWait(e.retryAfter ?? 600)} 뒤 다시 시도해 주세요.`
    default:
      return commonErrorMessage(e)
  }
}

/** ① 초대 코드 — 맞으면 30분짜리 가입 토큰과 기수를 받는다 */
export function InviteCodeStep({ onDone }: { onDone: (patch: Partial<SignupDraft>) => void }) {
  const [code, setCode] = useState('')
  const check = useMutation({
    mutationFn: checkInviteCode,
    onSuccess: (res) =>
      onDone({
        step: 'email',
        signupToken: res.signupToken,
        generation: res.generation,
        expiresAt: res.expiresAt,
        email: undefined,
        codeSentTo: undefined,
        resendAvailableAt: undefined,
        emailVerified: false,
      }),
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (code.trim() === '' || check.isPending) return
    check.mutate(code.trim())
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SignupHead eye={SIGNUP_STEP_LABELS.invite} title="초대 코드를 보여 주세요">
        운영진에게 받은 코드예요. 기수는 코드로 정해져요.
      </SignupHead>
      <div className="gh-su-fl">
        <SignupLabel htmlFor="inviteCode">초대 코드</SignupLabel>
        <input
          id="inviteCode"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={40}
          placeholder="코드 입력"
          className="gh-su-in is-big"
          aria-invalid={check.isError}
          aria-describedby={check.isError ? 'inviteCode-error' : undefined}
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            if (check.isError) check.reset()
          }}
        />
      </div>
      {check.isError && (
        <p id="inviteCode-error" className="gh-su-msg is-bad" role="alert">
          {inviteErrorMessage(check.error)}
        </p>
      )}
      <SignupCta disabled={code.trim() === '' || check.isPending}>{check.isPending ? '확인하는 중…' : '코드 확인'}</SignupCta>
    </form>
  )
}
