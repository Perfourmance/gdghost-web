import { useEffect, useState } from 'react'
import { useConfirm } from '@/components/story'
import { Navigate, useBlocker, useNavigate } from 'react-router'
import { useMe } from '@/features/auth/session'
import { AboutStep } from '@/features/signup/AboutStep'
import { AccountStep } from '@/features/signup/AccountStep'
import { BasicInfoStep } from '@/features/signup/BasicInfoStep'
import { EmailStep } from '@/features/signup/EmailStep'
import { ExperienceStep } from '@/features/signup/ExperienceStep'
import { InterestStep } from '@/features/signup/InterestStep'
import { InviteCodeStep } from '@/features/signup/InviteCodeStep'
import { SignupBand } from '@/features/signup/SignupParts'
import {
  clearSignupDraft,
  isDraftExpired,
  SIGNUP_STEPS,
  useSignupDraft,
  type SignupDraft,
  type SignupStep,
} from '@/features/signup/draft'

const EXPIRED_MESSAGE = '가입 시간 30분이 지났어요. 초대 코드부터 다시 입력해 주세요.'

/** 가입 (S02) — 시안 signup/final-1~7 '등불 길'. 한 주소 안에서 단계를 바꾼다 */
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
  const confirm = useConfirm()
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => inProgress && !me && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    void confirm({
      title: '가입을 그만둘까요?',
      description: '입력한 내용은 저장되지 않아요.',
      confirmLabel: '그만두기',
      cancelLabel: '계속 가입하기',
      danger: true,
      ghost: 'lantern',
    }).then((ok) => {
      if (ok) {
        clearSignupDraft()
        blocker.proceed()
      } else {
        blocker.reset()
      }
    })
  }, [blocker, confirm])

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

  return (
    <div className="gh-day gh-su">
      <div className="mx-auto max-w-md">
        <SignupBand step={stepIndex} total={SIGNUP_STEPS.length} onBack={handleBack} />
        <main className="gh-su-page">
          {notice && (
            <p className="gh-su-notice" role="status">
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
    </div>
  )
}
