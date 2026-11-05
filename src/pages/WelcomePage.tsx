import { Link, Navigate } from 'react-router'
import mascot from '@/assets/mascot/default.png'
import { StepFooter } from '@/components/form/StepLayout'
import { buttonVariants } from '@/components/ui/button'
import { useMe } from '@/features/auth/session'
import { PushPanel } from '@/features/push/PushPanel'

/** 가입 마지막 · 알림 준비 (S02) — 웹 푸시 허용 · 홈 화면에 추가. 건너뛸 수 있고, 나중에 설정에서 다시 켠다 */
export function WelcomePage() {
  const { data: me } = useMe()
  if (!me) return <Navigate to="/" replace />

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-md px-4 pt-12">
        <img src={mascot} alt="" className="mx-auto w-24" />
        <p className="mt-6 text-xs font-bold text-brand-text">알림 준비</p>
        <h1 className="mt-2 text-[22px] leading-snug font-bold text-title">{me.nickname}님, 가입을 마쳤어요</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          내 질문에 답변이 달리거나 선배에게 질문이 오면 바로 알려 드릴게요. 지금 하지 않아도 설정에서 언제든 켤 수 있어요.
        </p>

        <div className="mt-8 rounded-xl bg-card px-4">
          <PushPanel />
        </div>

        <StepFooter>
          <Link to="/" replace className={buttonVariants({ size: 'lg', className: 'h-12 w-full' })}>
            시작하기
          </Link>
          <Link
            to="/"
            replace
            className="mt-2 block py-2 text-center text-sm text-muted-foreground hover:text-foreground"
          >
            나중에 할게요
          </Link>
        </StepFooter>
      </main>
    </div>
  )
}
