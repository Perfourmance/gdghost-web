import { useNavigate } from 'react-router'
import { Ghost, IconBack, IconLock, StoryButtonLink, StoryLogo } from '@/components/story'
import { loginPath } from '@/features/auth/useAuthActions'

/**
 * 비회원 잠금 화면 — 부원 전용 주소로 바로 들어왔을 때 한 화면 전체로 (guestlock-final의 낮 시트를 화면으로).
 * 목록에서 누를 때는 LockSheet(아래에서 올라오는 창)를 쓴다
 */
export function LockPanel({ next, title, buttonText = '로그인하고 밤으로 들어가기' }: { next: string; title: string; buttonText?: string }) {
  const navigate = useNavigate()
  function back() {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/', { replace: true })
  }
  return (
    <main className="gh-day gh-daylock">
      <div className="mx-auto max-w-md pb-28">
        <header className="gh-daylock-top">
          <button type="button" aria-label="뒤로" onClick={back}>
            <IconBack />
          </button>
          <StoryLogo />
          <span className="w-10" />
        </header>
        <div className="gh-daylock-dusk" aria-hidden>
          <i />
        </div>
        <section className="gh-daylock-wave">
          <Ghost pose="door" className="gh-door" />
          <span className="gh-kicker">
            <IconLock />
            부원 전용
          </span>
          <h1>{title.replace(/\.$/, '')}</h1>
          <p>GDGoC SMU 부원으로 들어오면 볼 수 있어요.</p>
          <StoryButtonLink to={loginPath(next)} tone="night">
            {buttonText}
          </StoryButtonLink>
          <button type="button" className="gh-invite w-full" onClick={() => navigate('/signup')}>
            <span>초대장을 받았나요?</span>
            <em>코드로 가입</em>
          </button>
        </section>
      </div>
    </main>
  )
}
