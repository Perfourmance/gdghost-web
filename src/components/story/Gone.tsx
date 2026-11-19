import { Link } from 'react-router'
import { PillLink, Pill } from './Buttons'
import { EmptyState } from './Feedback'
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

/** 불러오지 못했을 때 — 쉿 유령 한 줄 + 다시 시도 */
export function LoadFail({ title, onRetry, className }: { title: string; onRetry: () => void; className?: string }) {
  return (
    <div className={className ?? 'px-4 pt-4'}>
      <EmptyState
        row
        pose="shh"
        title={title}
        action={
          <Pill soft className="mt-2" onClick={onRetry}>
            다시 시도
          </Pill>
        }
      />
    </div>
  )
}

/** 들어갈 수 없을 때 — 쉿 유령 + 안내 + 돌아가기 */
export function Blocked({ title, text, to, link }: { title: string; text: string; to: string; link: string }) {
  return (
    <div className="px-4 pt-6">
      <EmptyState pose="shh" title={title} action={<PillLink to={to} className="mt-3">{link}</PillLink>}>
        {text}
      </EmptyState>
    </div>
  )
}
