import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Navigate, useBlocker, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useMe } from '@/features/auth/session'
import { EmailStep } from '@/features/signup/EmailStep'
import { InviteCodeStep } from '@/features/signup/InviteCodeStep'
import {
  clearSignupDraft,
  isDraftExpired,
  SIGNUP_STEP_TOTAL,
  SIGNUP_STEPS,
  useSignupDraft,
  type SignupStep,
} from '@/features/signup/draft'

const EXPIRED_MESSAGE = '가입 시간(30분)이 지났어요. 초대 코드부터 다시 입력해 주세요.'

/** 가입 (S02). 한 주소 안에서 단계를 바꾼다 */
export function SignupPage() {
  const { data: me } = useMe()
  const navigate = useNavigate()
  const { draft, update, reset, loadedExpired } = useSignupDraft()
  const [notice, setNotice] = useState(loadedExpired ? EXPIRED_MESSAGE : '')

  const stepIndex = SIGNUP_STEPS.indexOf(draft.step)
  const inProgress = draft.signupToken != null

  // 입력한 내용이 있으면 화면을 나갈 때 한 번 묻는다 (IA 2장)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => inProgress && !me && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('가입을 그만둘까요? 입력한 내용은 사라져요.')) {
      clearSignupDraft()
      blocker.proceed()
    } else {
      blocker.reset()
    }
  }, [blocker])

  // 단계를 넘길 때 30분이 지났으면 처음으로
  function goTo(patch: Parameters<typeof update>[0]) {
    if (isDraftExpired(draft)) {
      restart(EXPIRED_MESSAGE)
      return
    }
    setNotice('')
    update(patch)
  }

  function restart(message: string) {
    reset()
    setNotice(message)
  }

  function handleBack() {
    if (stepIndex <= 0) {
      navigate(-1)
      return
    }
    update({ step: SIGNUP_STEPS[stepIndex - 1] as SignupStep })
  }

  // 가입이 끝나 로그인됐거나 이미 회원이면 홈으로
  if (me) return <Navigate to="/" replace />

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex h-14 max-w-md items-center justify-between px-2">
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-lg hover:bg-accent"
          aria-label="뒤로"
          onClick={handleBack}
        >
          <ChevronLeft className="size-6" />
        </button>
        <span className="px-3 text-sm text-muted-foreground" aria-label="가입 단계">
          {stepIndex + 1} / {SIGNUP_STEP_TOTAL}
        </span>
      </header>

      <main className="mx-auto max-w-md px-4 pt-4 pb-10">
        {notice && (
          <p className="mb-4 rounded-lg bg-muted px-3 py-2 text-sm text-foreground" role="status">
            {notice}
          </p>
        )}

        {draft.step === 'invite' && <InviteCodeStep onDone={goTo} />}
        {draft.step === 'email' && (
          <EmailStep draft={draft} onUpdate={goTo} onSessionExpired={() => restart(EXPIRED_MESSAGE)} />
        )}
        {draft.step === 'profile' && (
          // F2-b에서 기본 정보 단계로 바꾼다
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-title">이메일 인증 완료</h2>
            <p className="text-sm text-muted-foreground">
              {draft.email} 인증을 마쳤어요. 다음 단계(기본 정보)는 준비 중이에요.
            </p>
            <Button variant="secondary" className="w-full" onClick={() => restart('')}>
              처음부터 다시
            </Button>
          </section>
        )}
      </main>
    </div>
  )
}
