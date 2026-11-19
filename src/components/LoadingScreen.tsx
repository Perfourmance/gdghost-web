import { Ghost, LoadingDots } from '@/components/story'
import { cn } from '@/lib/utils'

/** 첫 로딩 — 비회원은 낮(문 여는 유령), 회원은 밤(쉿 유령) → 앰버 점 세 개 → 글자 로고 */
export function LoadingScreen({ member }: { member: boolean }) {
  return (
    <div
      className={cn('flex min-h-dvh flex-col items-center justify-center gap-6', member ? 'gh-night' : 'gh-day')}
      role="status"
      aria-label="불러오는 중"
    >
      <Ghost pose={member ? 'shh' : 'door'} className="w-32" />
      <LoadingDots />
      <span className="gh-logo text-2xl">
        <b>GDG</b>host
      </span>
    </div>
  )
}
