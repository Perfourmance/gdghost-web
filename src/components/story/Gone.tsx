import { Link } from 'react-router'
import { Ghost } from './Ghost'
import { IconBack } from './icons'

/** 없는 글 · 삭제 · 숨김 — 비어 버린 편지지 자리 + 쉿 유령 + 목록으로 (gone-final) */
export function GoneSlot({
  title = '편지가 있던 자리만 남았어요',
  text = '지워졌거나 운영진이 숨긴 글이에요.',
  to,
  link,
}: {
  title?: string
  text?: string
  to: string
  link: string
}) {
  return (
    <>
      <div className="gh-gone-slot" aria-hidden>
        <span className="gh-stamp" />
        <span className="gh-l" style={{ top: 24, width: 80 }} />
        <span className="gh-l" style={{ top: 58, width: 220, height: 16 }} />
        <span className="gh-l" style={{ top: 84, width: 150, height: 16 }} />
        <Ghost pose="shh" />
      </div>
      <div className="gh-gone-txt">
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      <Link to={to} replace className="gh-gone-back">
        <IconBack />
        {link}
      </Link>
    </>
  )
}
