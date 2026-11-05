import { Link } from 'react-router'
import shh from '@/assets/mascot/shh.png'
import { buttonVariants } from '@/components/ui/button'
import { loginPath } from '@/features/auth/useAuthActions'

/**
 * 잠금 안내 패널 — 비회원이 부원 전용 화면에 바로 들어왔을 때 그 자리에 보인다 (디자인 가이드 4장 · 7장).
 * 목록에서 누를 때는 LockSheet(아래에서 올라오는 창)를 쓴다
 */
export function LockPanel({ next, title, buttonText = '로그인하고 보기' }: { next: string; title: string; buttonText?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-panel px-6 py-10 text-center">
      <img src={shh} alt="" className="w-28" />
      <p className="mt-5 text-lg font-bold text-title">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">GDGoC SMU 부원이라면 로그인해 주세요.</p>
      <Link to={loginPath(next)} className={buttonVariants({ size: 'lg', className: 'mt-6 h-12 w-full' })}>
        {buttonText}
      </Link>
      <Link
        to="/signup"
        className={buttonVariants({ variant: 'secondary', size: 'lg', className: 'mt-2 h-12 w-full' })}
      >
        초대 코드로 가입하기
      </Link>
    </div>
  )
}
