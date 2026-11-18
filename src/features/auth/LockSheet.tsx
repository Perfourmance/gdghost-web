import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { IconLock, StorySheet, StoryButton } from '@/components/story'
import { loginPath } from '@/features/auth/useAuthActions'

interface Props {
  /** 로그인한 뒤 돌아올 주소. null이면 닫힘 */
  next: string | null
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
}

/**
 * 잠금 안내 — 비회원이 부원 전용 내용을 누르면 아래에서 올라온다.
 * 시안 guestlock-final: 노을 띠 + 물결 종이 + 문 유령 → 로그인하면 next로 돌아온다
 */
export function LockSheet({ next, onClose, title = '부원만 볼 수 있어요', description = 'GDGoC SMU 부원으로 로그인해 주세요.' }: Props) {
  const navigate = useNavigate()
  const go = (to: string) => {
    onClose()
    navigate(to)
  }
  return (
    <StorySheet
      open={next != null}
      onOpenChange={(open) => !open && onClose()}
      day
      kicker={
        <>
          <IconLock />
          부원 전용
        </>
      }
      title={title}
      description={description}
    >
      <StoryButton tone="night" className="mt-[26px]" onClick={() => go(next ? loginPath(next) : '/login')}>
        로그인하고 밤으로 들어가기
      </StoryButton>
      <button type="button" className="gh-invite mt-3 w-full" onClick={() => go('/signup')}>
        <span>초대장을 받았나요?</span>
        <em>코드로 가입</em>
      </button>
    </StorySheet>
  )
}
