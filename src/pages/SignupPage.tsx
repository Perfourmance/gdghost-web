import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Navigate, useBlocker, useNavigate } from 'react-router'
import { useMe } from '@/features/auth/session'
import { AboutStep } from '@/features/signup/AboutStep'
import { AccountStep } from '@/features/signup/AccountStep'
import { BasicInfoStep } from '@/features/signup/BasicInfoStep'
import { EmailStep } from '@/features/signup/EmailStep'
import { ExperienceStep } from '@/features/signup/ExperienceStep'
import { InterestStep } from '@/features/signup/InterestStep'
import { InviteCodeStep } from '@/features/signup/InviteCodeStep'
import {
  clearSignupDraft,
  isDraftExpired,
  SIGNUP_STEPS,
  useSignupDraft,
  type SignupDraft,
  type SignupStep,
} from '@/features/signup/draft'

const EXPIRED_MESSAGE = '가입 시간(30분)이 지났어요. 초대 코드부터 다시 입력해 주세요.'

/** 가입 (S02). 한 주소 안에서 단계를 바꾼다 */
export function SignupPage() {
  const { data: me } = useMe()
  const navigate = useNavigate()
  const { draft, update, reset, loadedExpired } = useSignupDraft()
  const [notice, setNotice] = useState(loadedExpired ? EXPIRED_MESSAGE : '')
  // 방금 가입을 마쳤으면 홈 대신 알림 준비로
  const [finished, setFinished] = useState(false)

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

  // 단계가 바뀌면 화면 맨 위부터 보여 준다
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [draft.step])

  // 단계를 넘길 때 30분이 지났으면 처음으로
  function goTo(patch: Partial<SignupDraft>) {
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

  // 마지막 가입 요청에서 다른 단계의 값이 막혔을 때
  function redirect(step: SignupStep, message: string, patch?: Partial<SignupDraft>) {
    update({ ...patch, step })
    setNotice(message)
  }

  function handleBack() {
    if (stepIndex <= 0) {
      navigate(-1)
      return
    }
    update({ step: SIGNUP_STEPS[stepIndex - 1] })
  }

  // 가입이 끝나 로그인됐으면 알림 준비, 이미 회원이면 홈으로
  if (me) return <Navigate to={finished ? '/welcome' : '/'} replace />

  const progress = ((stepIndex + 1) / SIGNUP_STEPS.length) * 100

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 bg-background">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-2">
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-lg hover:bg-accent"
            aria-label="뒤로"
            onClick={handleBack}
          >
            <ChevronLeft className="size-6" />
          </button>
          <span className="px-3 text-xs text-muted-foreground tabular-nums">
            {stepIndex + 1} / {SIGNUP_STEPS.length}
          </span>
        </div>
        <div
          className="mx-auto h-1 max-w-md bg-muted"
          role="progressbar"
          aria-label="가입 진행"
          aria-valuemin={1}
          aria-valuemax={SIGNUP_STEPS.length}
          aria-valuenow={stepIndex + 1}
        >
          <div className="h-full rounded-r-full bg-brand transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-8">
        {notice && (
          <p className="mb-6 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-text" role="status">
            {notice}
          </p>
        )}

        {draft.step === 'invite' && <InviteCodeStep onDone={goTo} />}
        {draft.step === 'email' && (
          <EmailStep draft={draft} onUpdate={goTo} onSessionExpired={() => restart(EXPIRED_MESSAGE)} />
        )}
        {draft.step === 'profile' && <BasicInfoStep draft={draft} onUpdate={goTo} />}
        {draft.step === 'interests' && <InterestStep draft={draft} onUpdate={goTo} />}
        {draft.step === 'experiences' && <ExperienceStep draft={draft} onUpdate={goTo} />}
        {draft.step === 'about' && <AboutStep draft={draft} onUpdate={goTo} />}
        {draft.step === 'account' && (
          <AccountStep
            draft={draft}
            onRedirect={redirect}
            onRestart={restart}
            onFinished={() => {
              setFinished(true)
              clearSignupDraft()
              reset()
            }}
          />
        )}
      </main>
    </div>
  )
}
