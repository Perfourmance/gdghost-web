import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { Ghost, Toggle } from '@/components/story'
import { useMe } from '@/features/auth/session'
import { pushBlockedText, useInstall, usePush } from '@/features/push/push'
import '@/styles/day.css'

/** 하늘에 하나씩 켜지는 등불 (시안 좌표) */
const LAMPS: [x: number, y: number][] = [
  [28, 40],
  [70, 26],
  [116, 18],
  [162, 14],
  [208, 16],
  [254, 24],
  [300, 36],
]

/** 가입 마지막 · 알림 준비 (S02) — 시안 signup/final-done. 웹 푸시 허용 · 홈 화면에 추가. 건너뛸 수 있고, 나중에 설정에서 다시 켠다 */
export function WelcomePage() {
  const { data: me } = useMe()
  if (!me) return <Navigate to="/" replace />

  return (
    <div className="gh-night gh-welcome">
      <div className="gh-welcome-scene" aria-hidden />
      <div className="gh-welcome-lamps" aria-hidden>
        {LAMPS.map(([x, y], n) => (
          <i key={n} style={{ left: `${(x / 390) * 100}%`, top: y, animationDelay: `${0.2 + n * 0.12}s` }} />
        ))}
      </div>
      <Ghost pose="star" className="gh-welcome-hero" />
      <main className="gh-welcome-wrap">
        <p className="gh-welcome-eye">알림 준비</p>
        <h1>
          {me.nickname}님,
          <br />
          가입을 마쳤어요
        </h1>
        <p className="gh-welcome-d">답변이나 질문이 오면 바로 알려요. 설정에서 나중에 켤 수도 있어요.</p>

        <WelcomeOptions />

        <Link to="/" replace className="gh-welcome-start">
          시작하기
        </Link>
        <Link to="/" replace className="gh-welcome-later">
          나중에
        </Link>
      </main>
    </div>
  )
}

/** 이 기기 알림 켜기 + 홈 화면에 추가 (설정의 PushPanel과 같은 동작, 밤 유리 카드 모양) */
function WelcomeOptions() {
  const push = usePush()
  const install = useInstall()
  const [installResult, setInstallResult] = useState<'accepted' | 'dismissed' | 'failed' | null>(null)
  const on = push.state === 'on'
  const blocked = pushBlockedText(push.state, install.ios, install.installed)

  return (
    <div className="gh-welcome-opt">
      <div className="gh-welcome-o1">
        <div>
          <b id="push-on-label">이 기기에서 알림 받기</b>
          <span>답변·댓글·커피챗·공지 알림</span>
        </div>
        <Toggle
          label="이 기기에서 알림 받기"
          checked={on}
          disabled={push.state === 'loading' || push.pending || (blocked != null && !on)}
          onChange={(next) => void (next ? push.turnOn() : push.turnOff())}
        />
      </div>
      {blocked && <p className="gh-welcome-warn">{blocked}</p>}
      {push.error && (
        <p className="gh-welcome-warn is-bad" role="alert">
          {push.error}
        </p>
      )}

      <div className="gh-welcome-o2">
        <b>홈 화면에 추가</b>
        {install.installed || installResult === 'accepted' ? (
          <span>{installResult === 'accepted' ? '설치했어요. 홈 화면이나 앱 목록에서 GDGhost를 열어 주세요.' : '앱으로 열려 있어요.'}</span>
        ) : install.canPrompt ? (
          <>
            <span>홈 화면에서 바로 열 수 있어요.</span>
            <button type="button" className="gh-welcome-install" onClick={async () => setInstallResult(await install.prompt())}>
              홈 화면에 추가
            </button>
          </>
        ) : install.ios ? (
          <span>
            사파리 아래쪽 공유 버튼 → <strong>홈 화면에 추가</strong>를 눌러 주세요.
          </span>
        ) : (
          <span>
            {installResult === 'dismissed' && '설치를 취소했어요. '}
            {installResult === 'failed' && '설치 창을 열 수가 없어요. '}
            브라우저 메뉴(⋮)에서 <strong>홈 화면에 추가</strong> 또는 <strong>앱 설치</strong>를 눌러 주세요. PC 크롬에서는 주소창 오른쪽 설치 아이콘도 쓸 수 있어요.
          </span>
        )}
      </div>
    </div>
  )
}
