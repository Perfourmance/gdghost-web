import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router'
import { findLoginId } from '@/features/account/api'
import { DayFormPage, SignupHead, SignupLabel } from '@/features/signup/SignupParts'
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
    <DayFormPage say="이름표를 찾아 드릴게요">
      <form onSubmit={handleSubmit} noValidate>
        <SignupHead eye="계정 찾기" title="아이디를 잊으셨나요?">
          가입 때 인증한 이메일로 아이디를 보내 드려요.
        </SignupHead>

        <div className="gh-su-fl">
          <SignupLabel htmlFor="email">가입한 이메일</SignupLabel>
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
              setEmail(e.target.value)
              send.reset()
            }}
          />
        </div>
        {send.isError && (
          <p className="gh-su-msg is-bad" role="alert">
            {emailCodeErrorMessage(toApiError(send.error))}
          </p>
        )}

        {sentTo && (
          // 가입 여부를 드러내지 않도록 항상 같은 안내 (F1-11)
          <div className="gh-su-sent" role="status">
            <b>{sentTo}로 보냈어요</b>
            가입된 이메일이면 아이디가 와요. 메일이 없으면 스팸함을 확인해 주세요.
          </div>
        )}

        <p className="gh-su-foot">가입 때 쓴 이메일이 기억나지 않으면 운영진에게 물어봐 주세요.</p>

        <div className="gh-su-cta is-two">
          <div>
            <button type="submit" className={sentTo ? 'is-skip' : undefined} disabled={!canSend}>
              {send.isPending ? '보내는 중…' : resendWait > 0 ? `${resendWait}초 뒤 다시 보낼 수 있어요` : sentTo ? '다시 보내기' : '아이디 받기'}
            </button>
            {sentTo && <Link to="/login">로그인하러 가기</Link>}
          </div>
        </div>
      </form>
    </DayFormPage>
  )
}
