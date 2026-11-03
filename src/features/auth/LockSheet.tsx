import { Link } from 'react-router'
import shh from '@/assets/mascot/shh.png'
import { buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { loginPath } from '@/features/auth/useAuthActions'

interface Props {
  /** 로그인한 뒤 돌아올 주소. null이면 닫힘 */
  next: string | null
  onClose: () => void
  title?: string
  description?: string
}

/**
 * 잠금 안내 — 비회원이 부원 전용 내용을 누르면 아래에서 올라온다 (디자인 가이드 4장).
 * 쉿 포즈 → 굵은 한 줄 → 로그인 버튼. 로그인하면 next로 돌아온다
 */
export function LockSheet({
  next,
  onClose,
  title = '부원에게 열려 있어요',
  description = 'GDGoC SMU 부원으로 로그인하면 볼 수 있어요.',
}: Props) {
  return (
    <Sheet open={next != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-md rounded-t-2xl border-0 bg-panel px-6 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex flex-col items-center text-center">
          <img src={shh} alt="" className="w-24" />
          <SheetTitle className="mt-4 text-lg font-bold text-title">{title}</SheetTitle>
          <SheetDescription className="mt-1 text-sm text-muted-foreground">
            {description}
          </SheetDescription>
        </div>
        <div className="mt-2 space-y-2">
          <Link
            to={next ? loginPath(next) : '/login'}
            onClick={onClose}
            className={buttonVariants({ size: 'lg', className: 'h-12 w-full' })}
          >
            로그인하고 보기
          </Link>
          <Link
            to="/signup"
            onClick={onClose}
            className={buttonVariants({ variant: 'secondary', size: 'lg', className: 'h-12 w-full' })}
          >
            초대 코드로 가입하기
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
