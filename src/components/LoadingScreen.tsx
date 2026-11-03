import door from '@/assets/mascot/door.png'
import shh from '@/assets/mascot/shh.png'
import { Logo } from '@/components/Logo'

const DOT_DELAYS = ['0ms', '150ms', '300ms']

/** 시안 07 — 캐릭터 → 파란 점 세 개 → 로고. 비회원은 문 여는 유령, 회원은 쉿 포즈 */
export function LoadingScreen({ member }: { member: boolean }) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background"
      role="status"
      aria-label="불러오는 중"
    >
      <img src={member ? shh : door} alt="" className="w-32" />
      <div className="flex gap-2" aria-hidden>
        {DOT_DELAYS.map((delay) => (
          <span
            key={delay}
            className="size-2 animate-bounce rounded-full bg-brand"
            style={{ animationDelay: delay }}
          />
        ))}
      </div>
      <Logo className="text-2xl" />
    </div>
  )
}
