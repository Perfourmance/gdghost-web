import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Ghost, IconBack } from '@/components/story'
import { PASSWORD_RULES } from '@/lib/passwordRules'
import { cn } from '@/lib/utils'
import '@/styles/day.css'

// 회원가입 낮 화면 부품 (시안 signup/final-1~7 '등불 길 + 말풍선'). 모양은 day.css의 gh-su-*

/** 길 위 등불 7개 (시안 390px 좌표). 지나온 단계 = 켜짐, 지금 = 흰 등불 */
const LAMPS: [x: number, y: number][] = [
  [30, 115],
  [80, 96],
  [135, 83],
  [195, 78],
  [255, 81],
  [310, 94],
  [360, 115],
]

/** 단계마다 해가 진다 — 하늘 위 · 아래, 먼 산, 가까운 언덕, 길 색 */
const SKIES: [top: string, bottom: string, far: string, hill: string, road: string][] = [
  ['#E4EFEF', '#FCF7E4', '#B9C6C1', '#8FA866', '#E8DCC0'],
  ['#CCD7E6', '#F6DDB8', '#9EAAA9', '#7B925A', '#CEC3A9'],
  ['#A7AACF', '#EDB88C', '#848F92', '#677B4E', '#B3A993'],
  ['#7B78AE', '#DD8C70', '#6A747A', '#526442', '#99907C'],
  ['#4C4A82', '#B26A66', '#4F5862', '#3E4E37', '#7F7765'],
  ['#232859', '#5E4766', '#343C4B', '#2A382B', '#645D4F'],
  ['#080D1E', '#1C1A33', '#1A2133', '#16211F', '#4A4438'],
]

/** 등불 유령 위치(가운데 x · 위 y)와 말풍선. 뒤쪽 세 단계는 말풍선이 유령 왼쪽에 붙는다 */
const WALKER: { x: number; y: number; say: string; sayX: number; sayY: number; right?: boolean }[] = [
  { x: 30, y: 53, say: '똑똑, 초대장 있어요?', sayX: 54, sayY: 57 },
  { x: 80, y: 34, say: '연락할 곳을 찾아 둘게요', sayX: 104, sayY: 38 },
  { x: 135, y: 21, say: '반가워요! 이름이 뭐예요?', sayX: 159, sayY: 25 },
  { x: 195, y: 16, say: '좋아하는 걸 이어 볼게요', sayX: 219, sayY: 20 },
  { x: 255, y: 19, say: '어떤 길을 걸어 왔어요?', sayX: 159, sayY: 46, right: true },
  { x: 310, y: 32, say: '요즘 이야기 들려줘요', sayX: 104, sayY: 46, right: true },
  { x: 360, y: 53, say: '쉿, 열쇠는 혼자만 알기', sayX: 54, sayY: 57, right: true },
]

const pct = (px: number) => `${(px / 390) * 100}%`

/** 위 띠 — 노을 길 + 등불 7개 + 등불 유령 + 말풍선 + 뒤로 + 단계 수 */
export function SignupBand({ step, total, onBack, say }: { step: number; total?: number; onBack: () => void; say?: string }) {
  const i = Math.min(Math.max(step, 0), SKIES.length - 1)
  const [top, bottom, far, hill, road] = SKIES[i]
  const walker = { ...WALKER[i], say: say ?? WALKER[i].say }
  return (
    <header className="gh-su-band" style={{ background: `linear-gradient(180deg, ${top}, ${bottom})` }}>
      <svg viewBox="0 0 390 150" preserveAspectRatio="none" aria-hidden>
        <path d="M0 110 Q60 70 120 100 T240 92 T390 104 V150 H0z" fill={far} opacity=".7" />
        <path d="M0 124 Q100 72 195 76 T390 124 V150 H0z" fill={hill} />
        <path d="M20 120 Q100 80 195 78 T370 120" fill="none" stroke={road} strokeWidth="6" strokeLinecap="round" opacity=".9" />
      </svg>
      {LAMPS.map(([x, y], n) => (
        <i
          key={n}
          aria-hidden
          className={cn('gh-su-lp', n < i && 'is-on', n === i && 'is-now')}
          style={{ left: pct(x), top: y - 6 }}
        />
      ))}
      <Ghost pose="lantern" className="gh-su-walker" style={{ left: pct(walker.x), top: walker.y }} />
      <span
        className={cn('gh-su-say', walker.right && 'is-r')}
        style={walker.right ? { right: pct(walker.sayX), top: walker.sayY } : { left: pct(walker.sayX), top: walker.sayY }}
        aria-hidden
      >
        {walker.say}
      </span>
      <button type="button" className="gh-su-back" aria-label="뒤로" onClick={onBack}>
        <IconBack />
      </button>
      {total != null && (
        <span className="gh-su-no" aria-label={`가입 ${total}단계 중 ${step + 1}단계`}>
          {step + 1} / {total}
        </span>
      )}
    </header>
  )
}

/** 단계 제목 — 작은 청록 이름 → 큰 제목 → 짧은 설명 */
export function SignupHead({ eye, title, children }: { eye: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="gh-su-h">
      <p className="gh-su-eye">{eye}</p>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  )
}

/** 칸 이름 줄 — 이름 · (선택) · 오른쪽 개수 */
export function SignupLabel({ htmlFor, children, small, count }: { htmlFor?: string; children: ReactNode; small?: ReactNode; count?: ReactNode }) {
  const Tag = htmlFor ? 'label' : 'span'
  return (
    <div className="gh-su-k">
      <Tag htmlFor={htmlFor}>{children}</Tag>
      {small && <small>{small}</small>}
      {count != null && <em>{count}</em>}
    </div>
  )
}

/** 아래 고정 버튼 (앞에 앰버 별). skip = 건너뛰기 흰 버튼 */
export function SignupCta({ disabled, skip, children }: { disabled?: boolean; skip?: boolean; children: ReactNode }) {
  return (
    <div className="gh-su-cta">
      <div>
        <button type="submit" className={cn(skip && 'is-skip')} disabled={disabled}>
          {children}
        </button>
      </div>
    </div>
  )
}

/** 체크 표시 — 초대장 확인 배지 · 쓸 수 있어요 */
export function IconTick() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

/** 종이 위 칩 — 선택 = 밤색. seg = 한 줄을 똑같이 나눔 (포지션 4 · 상태 3) */
export function SignupChips<T extends string | number>({
  options,
  isOn,
  onToggle,
  label,
  seg,
  labelledBy,
}: {
  options: { value: T; label: ReactNode; disabled?: boolean }[]
  isOn: (v: T) => boolean
  onToggle: (v: T) => void
  label?: string
  labelledBy?: string
  seg?: 3 | 4
}) {
  return (
    <div
      className={cn('gh-su-chips', seg && 'is-seg', seg === 4 && 'is-seg4')}
      role="group"
      aria-label={label}
      aria-labelledby={labelledBy}
    >
      {options.map((o) => {
        const on = isOn(o.value)
        return (
          <button key={String(o.value)} type="button" aria-pressed={on} disabled={o.disabled && !on} onClick={() => onToggle(o.value)}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** 인증번호 6칸 — 진짜 입력은 하나(붙여넣기 · 자동 채우기 그대로), 칸은 그림 */
export function OtpInput({ id, value, onChange, invalid }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean }) {
  return (
    <div className={cn('gh-su-otp', invalid && 'is-bad')}>
      <input
        id={id}
        // 인증번호를 보낸 직후 칸이 나타나면 바로 입력하게
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        aria-invalid={invalid}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      />
      {Array.from({ length: 6 }, (_, n) => (
        <i key={n} aria-hidden className={cn(n === Math.min(value.length, 5) && 'is-cur')}>
          {value[n] ?? ''}
        </i>
      ))}
    </div>
  )
}

/** 비밀번호 규칙 4개 — 맞으면 청록 ✓ */
export function PasswordRuleDots({ id, password }: { id: string; password: string }) {
  return (
    <ul id={id} className="gh-su-rules" aria-label="비밀번호 규칙">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password)
        return (
          <li key={rule.label} className={cn(ok && 'is-ok')}>
            {rule.label.replace('–', '-')}
            <span className="sr-only">{ok ? ' 충족' : ' 미충족'}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** 목록(태그 · 학과)을 못 불러왔을 때 */
export function SignupRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <p className="gh-su-retry" role="alert">
      {message}
      <button type="button" onClick={onRetry}>
        다시 시도
      </button>
    </p>
  )
}

/** 낮 한 장 화면 틀 (계정 찾기 · 비밀번호 재설정 · 이메일 변경 확인) — 노을 길 띠 + 종이 */
export function DayFormPage({ say, fallback = '/login', children }: { say: string; fallback?: string; children: ReactNode }) {
  const navigate = useNavigate()
  function back() {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
  return (
    <div className="gh-day gh-su">
      <div className="mx-auto max-w-md">
        <SignupBand step={0} onBack={back} say={say} />
        <main className="gh-su-page">{children}</main>
      </div>
    </div>
  )
}

/** 새 비밀번호 + 확인 (낮 종이) — 규칙 4개를 입력하면서 청록 ✓ */
export function DayNewPassword({
  label = '비밀번호',
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
}: {
  label?: string
  password: string
  confirm: string
  onPasswordChange: (v: string) => void
  onConfirmChange: (v: string) => void
}) {
  const mismatch = confirm !== '' && confirm !== password
  const space = /\s/.test(password)
  return (
    <>
      <div className="gh-su-fl">
        <SignupLabel htmlFor="newPassword">{label}</SignupLabel>
        <input
          id="newPassword"
          name="new-password"
          type="password"
          autoComplete="new-password"
          maxLength={64}
          className="gh-su-in"
          aria-describedby="password-rules"
          aria-invalid={space}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
        />
        <PasswordRuleDots id="password-rules" password={password} />
        {space && <p className="gh-su-msg is-bad">공백은 넣을 수 없어요.</p>}
      </div>
      <div className="gh-su-fl">
        <SignupLabel htmlFor="newPasswordConfirm">{label} 확인</SignupLabel>
        <input
          id="newPasswordConfirm"
          type="password"
          autoComplete="new-password"
          maxLength={64}
          className="gh-su-in"
          aria-invalid={mismatch}
          value={confirm}
          onChange={(e) => onConfirmChange(e.target.value)}
        />
        {mismatch && <p className="gh-su-msg is-bad">두 비밀번호가 달라요. 같은 비밀번호를 입력해 주세요.</p>}
      </div>
    </>
  )
}
