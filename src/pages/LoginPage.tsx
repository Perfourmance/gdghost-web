import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { Ghost, IconBack, LoadingDots, Toggle } from '@/components/story'
import '@/styles/day.css'
import { switchSession, useMe, type Me } from '@/features/auth/session'
import { safeNextPath, useLogin } from '@/features/auth/useAuthActions'
import { fetchHome, homeQueryKey, type HomeResponse } from '@/features/home/useHome'
import { NETWORK_ERROR, toApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

/** 에러 code → 화면 문구 (S01) */
function loginErrorMessage(error: unknown): string {
  const e = toApiError(error)
  switch (e.code) {
    case 'LOGIN_FAILED':
      return '아이디 또는 비밀번호를 확인해 주세요.'
    case 'ACCOUNT_SUSPENDED':
      return '이용이 정지된 계정이에요. 운영진에게 문의해 주세요.'
    case 'LOGIN_LOCKED':
    case 'RATE_LIMITED': {
      const minutes = Math.max(1, Math.ceil((e.retryAfter ?? 60) / 60))
      return `로그인 시도 횟수를 넘었어요. ${minutes}분 뒤 다시 시도해 주세요.`
    }
    case 'VALIDATION_FAILED':
      return '아이디와 비밀번호를 입력해 주세요.'
    case NETWORK_ERROR:
      return '서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.'
    default:
      return '로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.'
  }
}

/** 낮 → 밤 전환: 해 질 녘 1.5초 → 밤(쉿 유령)에서 홈 데이터가 오면 들어간다 */
type Phase = 'day' | 'dusk' | 'night'
const DUSK_MS = 1500
const NIGHT_MIN_MS = 700

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** 로그인 (S01) — 시안 login-final '동화책 한 장' */
export function LoginPage() {
  const { data: me } = useMe()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const login = useLogin({ deferSession: true })
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [phase, setPhase] = useState<Phase>('day')
  const timers = useRef<number[]>([])
  // 전환 중에 화면을 떠나도 로그인은 된 상태라 세션은 꼭 바꾼다
  const pending = useRef<Me | null>(null)

  const next = safeNextPath(searchParams.get('next'))

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t))
      if (pending.current) switchSession(queryClient, pending.current)
    },
    [queryClient],
  )

  // 이미 로그인했으면(자동 로그인 포함) 전환 없이 바로 보낸다. 로그인 성공 뒤엔 전환이 끝나고 여기로 온다
  if (me) return <Navigate to={next} replace />

  /** 전환이 끝나면 세션을 바꾼다. 홈으로 가면 미리 받아 둔 홈 데이터를 넣어 바로 보이게 한다 */
  function enter(user: Me, home: HomeResponse | null) {
    pending.current = null
    switchSession(queryClient, user)
    if (home) queryClient.setQueryData(homeQueryKey, home)
  }

  function startNightfall(user: Me) {
    if (prefersReducedMotion()) {
      enter(user, null)
      return
    }
    pending.current = user
    setPhase('dusk')
    // 쿠키가 이미 회원이라 회원 홈을 받는다. 실패해도 홈 화면이 다시 부른다
    const home = next === '/' ? fetchHome().catch(() => null) : Promise.resolve(null)
    const nightAt = Date.now() + DUSK_MS
    timers.current.push(window.setTimeout(() => setPhase('night'), DUSK_MS))
    void home.then((data) => {
      const wait = Math.max(0, nightAt + NIGHT_MIN_MS - Date.now())
      timers.current.push(window.setTimeout(() => enter(user, data), wait))
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (login.isPending || phase !== 'day') return
    login.mutate({ loginId: loginId.trim(), password, remember }, { onSuccess: startNightfall })
  }

  const canSubmit = loginId.trim() !== '' && password !== '' && !login.isPending && phase === 'day'

  return (
    <div className={cn('gh-day gh-login', phase !== 'day' && 'is-dusk', phase === 'night' && 'is-night')}>
      <section className="gh-login-scene">
        <button type="button" className="gh-login-back" aria-label="뒤로" onClick={() => navigate(-1)}>
          <IconBack />
        </button>
        <Link to="/" className="gh-login-mark" aria-label="홈으로">
          <b>GDG</b>host
        </Link>
        <div className="gh-login-title">
          <p className="gh-login-eye">부원 입구</p>
          <h1>
            해가 지면
            <br />
            <em>문이 열려요</em>
          </h1>
          <p>들어오는 순간, 마을에 별이 떠요.</p>
        </div>
        <span className="gh-login-glow" aria-hidden />
        <Ghost pose="lantern" className="gh-login-walker" />
      </section>

      <form className="gh-login-page" onSubmit={handleSubmit} noValidate>
        <div className="gh-login-pair">
          <label>
            <span className="gh-login-ic" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="8.5" r="3.5" />
                <path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" />
              </svg>
            </span>
            <input
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              placeholder="아이디"
              aria-label="아이디"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
            />
          </label>
          <label>
            <span className="gh-login-ic" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
                <circle cx="8" cy="12" r="3.5" />
                <path d="M11.5 12H20M17 12v3M20 12v2" />
              </svg>
            </span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="비밀번호"
              aria-label="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>

        <div className="gh-login-opts">
          <span className="gh-login-keep">
            <Toggle small checked={remember} onChange={setRemember} label="다음에도 바로 들어오기 (로그인 유지)" />
            다음에도 바로 들어오기
          </span>
          <nav className="gh-login-find" aria-label="계정 도움">
            <Link to="/find-login-id">아이디</Link> · <Link to="/password-reset">비밀번호</Link> 찾기
          </nav>
        </div>

        {login.isError && (
          <p className="gh-err" role="alert">
            {loginErrorMessage(login.error)}
          </p>
        )}

        <button type="submit" className="gh-btn is-night gh-login-go" disabled={!canSubmit}>
          {login.isPending ? '문 여는 중…' : '밤으로 들어가기'}
        </button>

        <Link to="/signup" className="gh-login-ticket">
          <span className="gh-l">
            <Ghost pose="door" />
            <span>
              <b>초대장을 받았나요?</b>
              <small>운영진이 준 코드로 가입해요</small>
            </span>
          </span>
          <span className="gh-r">코드 입력</span>
        </Link>
      </form>

      {/* 밤이 내려오는 층 */}
      <div className="gh-login-dusk" aria-hidden />
      <div className="gh-login-night" aria-hidden />
      <div className="gh-login-hush" role="status" aria-live="polite" aria-hidden={phase !== 'night'}>
        <span className="gh-halo" aria-hidden />
        <Ghost pose="shh" />
        <h2>쉿, 별 켜는 중이에요</h2>
        <p>마을 불빛이 하나씩 들어와요</p>
        <LoadingDots className="mt-[22px]" />
      </div>
    </div>
  )
}
