import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { checkInviteCode } from '@/features/signup/api'
import { SIGNUP_STEP_LABELS, type SignupDraft } from '@/features/signup/draft'
import { StepFooter, StepHeader } from '@/features/signup/StepLayout'
import { toApiError } from '@/lib/api'
import { commonErrorMessage, formatWait } from '@/lib/errorMessage'

function inviteErrorMessage(error: unknown): string {
  const e = toApiError(error)
  switch (e.code) {
    case 'INVITE_CODE_INVALID':
    case 'VALIDATION_FAILED':
      return '쓸 수 없는 초대 코드예요. 운영진에게 받은 코드를 다시 확인해 주세요.'
    case 'INVITE_CODE_LOCKED':
      return `여러 번 틀려서 잠시 막혔어요. ${formatWait(e.retryAfter ?? 600)} 뒤에 다시 시도해 주세요.`
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
      <StepHeader
        eyebrow={SIGNUP_STEP_LABELS.invite}
        title="초대 코드를 입력해 주세요"
        description="운영진에게 받은 코드예요. 기수는 코드로 정해져요."
      />
      <div className="space-y-2">
        <Label className="font-bold text-title" htmlFor="inviteCode">초대 코드</Label>
        <Input
          id="inviteCode"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={40}
          className="h-12 bg-card text-base tracking-wider uppercase"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      {check.isError && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {inviteErrorMessage(check.error)}
        </p>
      )}
      <StepFooter>
        <Button type="submit" size="lg" className="h-12 w-full" disabled={code.trim() === '' || check.isPending}>
          {check.isPending ? '확인 중…' : '다음'}
        </Button>
      </StepFooter>
    </form>
  )
}
