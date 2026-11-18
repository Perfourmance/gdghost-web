import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { IconLock, IconSend } from './icons'

type Tone = 'blue' | 'night' | 'amber' | 'glass'

const toneClass: Record<Tone, string | false> = { blue: false, night: 'is-night', amber: 'is-amber', glass: 'is-glass' }

interface StoryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** blue 밤의 주요 동작 · night 낮의 주요 동작(밤으로 간다는 예고, 앰버 점) · amber 완료 · glass 보조 */
  tone?: Tone
}

/** 큰 버튼 (56px, 완전히 둥글게) */
export function StoryButton({ tone = 'blue', className, type = 'button', ...props }: StoryButtonProps) {
  return <button type={type} className={cn('gh-btn', toneClass[tone], className)} {...props} />
}

/** 큰 버튼 모양 링크 */
export function StoryButtonLink({ to, tone = 'blue', className, children }: { to: string; tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={cn('gh-btn', toneClass[tone], className)}>
      {children}
    </Link>
  )
}

/** 알약 버튼 (46px). soft = 연한 파랑 작은 알약 */
export function Pill({ soft, className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { soft?: boolean }) {
  return <button type={type} className={cn('gh-pill', soft && 'is-soft', className)} {...props} />
}

export function PillLink({ to, state, soft, className, children }: { to: string; state?: unknown; soft?: boolean; className?: string; children: ReactNode }) {
  return (
    <Link to={to} state={state} className={cn('gh-pill', soft && 'is-soft', className)}>
      {children}
    </Link>
  )
}

/** 떠 있는 작성 버튼 — 파란 알약 + 이야기 동사. members = 티켓색 자물쇠 "부원" (낮) */
export function Fab({
  to,
  onClick,
  icon,
  children,
  night,
  membersOnly,
}: {
  to?: string
  onClick?: () => void
  icon: ReactNode
  children: ReactNode
  night?: boolean
  membersOnly?: boolean
}) {
  const body = (
    <>
      {icon}
      {children}
      {membersOnly && (
        <span className="gh-fab-tag">
          <IconLock />
          부원
        </span>
      )}
    </>
  )
  const className = cn('gh-fab', night && 'is-night')
  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" className={className} onClick={onClick}>
      {body}
    </button>
  )
}

/** 둥근 아이콘 보내기 (입력 전 회색) */
export function RoundSend({ big, label, className, type = 'submit', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { big?: boolean; label: string }) {
  return (
    <button type={type} aria-label={label} className={cn('gh-send', big && 'is-big', className)} {...props}>
      <IconSend />
    </button>
  )
}
