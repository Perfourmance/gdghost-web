import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Ghost, IconHome } from '@/components/story'

/** 없는 주소 — 시안 notfound-final '끊긴 길 + 등불 유령' */
export function NotFoundPage() {
  return (
    <LostWay code="404 · 없는 길" title={<>이 길은<br />마을로 이어지지 않아요</>} description="주소를 다시 확인해 주세요.">
      <Link to="/" className="gh-home">
        <IconHome />
        마을로 돌아가기
      </Link>
    </LostWay>
  )
}

/** 끊긴 길 화면 — 404 · 알 수 없는 오류가 같이 쓴다 */
export function LostWay({
  code,
  title,
  description,
  children,
}: {
  code: string
  title: ReactNode
  description: string
  children: ReactNode
}) {
  return (
    <main className="gh-lostway">
      <div>
        <div className="gh-top">
          <p className="gh-code">{code}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {/* 끊긴 길: 점선이 절벽에서 멈춘다 */}
        <svg className="gh-path" viewBox="0 0 390 200" fill="none" aria-hidden>
          <path d="M-10 160 C 40 150, 90 140, 140 132" stroke="#F5B952" strokeOpacity=".7" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
          <path d="M150 126 l10 -8 M152 138 l12 2" stroke="#F5B952" strokeOpacity=".5" strokeWidth="2.5" strokeLinecap="round" />
          <text x="300" y="40" fill="#F5B952" fillOpacity=".8" fontFamily="Cafe24Ssurround" fontSize="22">
            ?
          </text>
        </svg>
        <Ghost pose="lantern" className="gh-walker" />
        {children}
      </div>
    </main>
  )
}
