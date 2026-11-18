import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { IconLock } from '@/components/story'
import '@/styles/day.css'

/** 낮 산책길의 정거장 — 왼쪽 동그란 핀 + 제목(+작은 원래 이름) + 더보기 */
export function Stop({ icon, title, sub, moreTo, children }: { icon: ReactNode; title: string; sub?: string; moreTo?: string; children: ReactNode }) {
  return (
    <section className="gh-stop">
      <span className="gh-stop-pin" aria-hidden>
        {icon}
      </span>
      <div className="gh-stop-h">
        <h2>
          {title}
          {sub && <small>{sub}</small>}
        </h2>
        {moreTo && <Link to={moreTo}>더보기</Link>}
      </div>
      {children}
    </section>
  )
}

/** 낮 질문 = 흰 편지 카드. 답변 수에 자물쇠 (부원이 되면 열림) */
export function LetterCard({ category, title, meta, answers, onClick }: { category: string; title: string; meta: string; answers: number; onClick: () => void }) {
  return (
    <button type="button" className="gh-letter" onClick={onClick}>
      <span className="gh-lab is-day">{category}</span>
      <h3>{title}</h3>
      <div className="gh-lmeta">
        {meta}
        <span className="gh-lock">
          <IconLock />
          답변 {answers}
        </span>
      </div>
    </button>
  )
}

/** 불러오지 못했을 때 (낮) */
export function DayRetry({ children, onRetry }: { children: ReactNode; onRetry: () => void }) {
  return (
    <div className="gh-retry" role="alert">
      <p>{children}</p>
      <button type="button" onClick={onRetry}>
        다시 시도
      </button>
    </div>
  )
}

/* 정거장 핀 아이콘 (guest-final) */
export const PinBoard = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
    <path d="M5 4h14v11H5z" />
    <path d="M9 15v5M15 15v5" />
  </svg>
)
export const PinLetter = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 8l9 6 9-6" />
  </svg>
)
export const PinCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
    <rect x="4" y="6" width="16" height="14" rx="2" />
    <path d="M4 10h16M8 4v4M16 4v4" />
  </svg>
)
export const PinBookmark = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
    <path d="M7 4h10v16l-5-3.5L7 20z" />
  </svg>
)
