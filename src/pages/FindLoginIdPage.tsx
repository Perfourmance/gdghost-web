import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router'
import { StepFooter, StepHeader } from '@/components/form/StepLayout'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { findLoginId } from '@/features/account/api'
import { useSecondsUntil } from '@/hooks/useSecondsUntil'
import { toApiError } from '@/lib/api'
import { EMAIL_PATTERN, emailCodeErrorMessage } from '@/lib/emailErrors'

// 응답에 다시 보낼 시각이 없어 서버 규칙(60초)대로 센다
const nextResendAt = () => Date.now() + 60_000

/** 아이디 찾기 (S03 · F1-11) — 가입한 메일로 아이디를 보낸다 */
export function FindLoginIdPage() {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resendAt, setResendAt] = useState<number | null>(null)
  const resendWait = useSecondsUntil(resendAt)

  const trimmed = email.trim()
  const send = useMutation({
    mutationFn: () => findLoginId(trimmed),
    onSuccess: () => {
      setSentTo(trimmed)
      setResendAt(nextResendAt())
    },
  })

  const canSend = EMAIL_PATTERN.test(trimmed) && !send.isPending && resendWait === 0

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canSend) send.mutate()
  }

  return (
    <SubPageLayout fallback="/login">
      <form onSubmit={handleSubmit} noValidate>
        <StepHeader
          eyebrow="계정 찾기"
          title="아이디 찾기"
          description="가입할 때 인증한 이메일을 넣으면, 그 메일로 아이디를 보내 드려요."
        />

        <div className="space-y-2">
          <Label className="font-bold text-title" htmlFor="email">
            가입한 이메일
          </Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            maxLength={254}
            className="h-12 bg-card"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              send.reset()
            }}
          />
          {send.isError && (
            <p className="text-sm text-destructive" role="alert">
              {emailCodeErrorMessage(toApiError(send.error))}
            </p>
          )}
        </div>

        {sentTo && (
          // 가입 여부를 드러내지 않도록 항상 같은 안내 (F1-11)
          <div className="mt-6 space-y-1 rounded-xl bg-brand-soft p-4 text-sm leading-relaxed text-brand-text" role="status">
            <p className="font-bold">{sentTo}로 보냈어요</p>
            <p>가입된 메일이면 아이디가 도착해요. 메일이 안 오면 스팸함을 확인해 주세요.</p>
          </div>
        )}

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          가입한 이메일이 기억나지 않으면 운영진에게 문의해 주세요.
        </p>

        <StepFooter>
          <div className="space-y-2">
            <Button
              type="submit"
              size="lg"
              variant={sentTo ? 'secondary' : 'default'}
              className="h-12 w-full"
              disabled={!canSend}
            >
              {send.isPending ? '보내는 중…' : resendWait > 0 ? `${resendWait}초 뒤 다시 보낼 수 있어요` : sentTo ? '다시 보내기' : '아이디 받기'}
            </Button>
            {sentTo && (
              <Link to="/login" className={buttonVariants({ size: 'lg', className: 'h-12 w-full' })}>
                로그인하러 가기
              </Link>
            )}
          </div>
        </StepFooter>
      </form>
    </SubPageLayout>
  )
}
