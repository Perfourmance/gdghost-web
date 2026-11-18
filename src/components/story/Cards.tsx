import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { IconBookmark, IconBookmarkFill, IconChat, IconCup, IconEye, IconHeart, IconHeartLine, IconImage, IconPencil, IconStar } from './icons'

const tint = (color?: string) => (color ? ({ '--c': color } as CSSProperties) : undefined)

/** 분류 라벨 (밤 하늘색 / 낮 청록 / 분류 색 연하게 / 앰버) */
export function Lab({ tone, color, children }: { tone?: 'day' | 'amber'; color?: string; children: ReactNode }) {
  return (
    <span className={cn('gh-lab', tone === 'day' && 'is-day', tone === 'amber' && 'is-amber', color && 'is-tint')} style={tint(color)}>
      {children}
    </span>
  )
}

/** 섹션 머리 — "답장 2 · 답글 1"처럼 숫자는 하늘색(amber면 앰버) */
export function SectionHead({ children, count, sub, amber, line }: { children: ReactNode; count?: number; sub?: ReactNode; amber?: boolean; line?: boolean }) {
  return (
    <h2 className={cn('gh-sh', line && 'is-line')}>
      {children}
      {count !== undefined && <em className={cn(amber && 'is-amber')}>{count}</em>}
      {sub && <small>{sub}</small>}
    </h2>
  )
}

/** 아이콘 + 숫자 (글자 "답변 2" 대신) */
export function Nums({ answers, views }: { answers?: number; views?: number }) {
  return (
    <span className="gh-nums">
      {answers !== undefined && (
        <span aria-label={`답변 ${answers}`}>
          <IconChat />
          {answers}
        </span>
      )}
      {views !== undefined && (
        <span aria-label={`조회 ${views}`}>
          <IconEye />
          {views}
        </span>
      )}
    </span>
  )
}

/** 질문 줄 목록 — 왼쪽 별빛 선 */
export function StarLine({ children }: { children: ReactNode }) {
  return <ul className="gh-starline">{children}</ul>
}

type StarKind = 'plain' | 'wait' | 'pick' | 'off'

/** 질문 하나 = 별 하나. wait = 깜빡이는 앰버 고리, pick = 앰버 별 + 앰버 빛 카드, off = 아직 안 켜진 별(낮) */
export function StarItem({ kind = 'plain', to, children }: { kind?: StarKind; to?: string; children: ReactNode }) {
  const body = <div className="gh-starbody">{children}</div>
  return (
    <li className={cn(kind === 'pick' && 'is-pick')}>
      <span className={cn('gh-star', kind !== 'plain' && `is-${kind}`)} aria-hidden>
        {kind === 'pick' && <IconStar />}
      </span>
      {to ? (
        <Link to={to} className="gh-starbody">
          {children}
        </Link>
      ) : (
        body
      )}
    </li>
  )
}

/** "OO님이 답했어요" 파란 말풍선 / 없으면 "아직 빛을 기다리는 질문이에요" */
export function ReplyBubble({ names }: { names: string | null }) {
  if (!names) return <div className="gh-rep is-none">아직 빛을 기다리는 질문이에요</div>
  return (
    <div className="gh-rep">
      <IconChat />
      <span>
        <b>{names}</b>님이 답했어요
      </span>
    </div>
  )
}

/** 부원 = 집 한 채. 지붕 색 = 분야, 창문 불 = 커피챗 받는 중 */
export function House({
  to,
  roofColor,
  track,
  staff,
  lit,
  generation,
  name,
  intro,
  field,
  answers,
}: {
  to: string
  roofColor: string
  track: string
  staff?: boolean
  lit: boolean
  generation: string
  name: string
  intro?: string | null
  field?: string | null
  answers: number
}) {
  return (
    <Link to={to} className={cn('gh-house', lit && 'is-lit')}>
      <div className="gh-roof" style={{ '--r': roofColor } as CSSProperties}>
        {staff && <span className="gh-flag">운영진</span>}
        <span className="gh-trk">{track}</span>
      </div>
      <div className="gh-wall">
        <i className="gh-win" aria-hidden />
        <div className="gh-g">{generation}</div>
        <h3>{name}</h3>
        <p>{intro}</p>
        <div className="gh-f">
          {field ? <span className="gh-lab">{field}</span> : <span />}
          <span className="gh-n" aria-label={`답변 ${answers}`}>
            <IconChat />
            {answers}
          </span>
        </div>
        {lit && (
          <div className="gh-cof">
            <IconCup />
            커피챗 받는 중
          </div>
        )}
      </div>
    </Link>
  )
}

/** 집들을 2열(왼→오 순서)로 */
export function Town({ children }: { children: ReactNode[] }) {
  const left = children.filter((_, i) => i % 2 === 0)
  const right = children.filter((_, i) => i % 2 === 1)
  return (
    <div className="gh-town">
      <div>{left}</div>
      <div>{right}</div>
    </div>
  )
}

/** 공유 = 책갈피. 선반 한 줄에 2개 */
export function Bookmark({
  to,
  color,
  category,
  title,
  tags,
  by,
  saved,
  saveCount,
  noteCount,
  hasPhoto,
  onClick,
}: {
  to: string
  /** 있으면 링크 대신 버튼 (비회원 잠금 안내) */
  onClick?: () => void
  color: string
  category: string
  title: string
  tags?: string[]
  by?: string
  saved?: boolean
  saveCount?: number
  noteCount?: number
  hasPhoto?: boolean
}) {
  const Save = saved ? IconBookmarkFill : IconBookmark
  const body = (
    <>
      <span className="gh-cat">{category}</span>
      {hasPhoto && <IconImage className="gh-ph" />}
      <Save className={cn('gh-sv', saved && 'is-on')} />
      <h3>{title}</h3>
      {tags && tags.length > 0 && <div className="gh-tg">{tags.map((t) => `#${t}`).join(' ')}</div>}
      {by && <div className="gh-by">{by}</div>}
      {(!!saveCount || !!noteCount) && (
        <div className="gh-bn">
          {!!saveCount && (
            <span aria-label={`저장 ${saveCount}`}>
              <IconBookmark />
              {saveCount}
            </span>
          )}
          {!!noteCount && (
            <span aria-label={`한 줄 ${noteCount}`}>
              <IconPencil />
              {noteCount}
            </span>
          )}
        </div>
      )}
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className="gh-bk w-full text-left" style={tint(color)}>
      {body}
    </button>
  ) : (
    <Link to={to} className="gh-bk" style={tint(color)}>
      {body}
    </Link>
  )
}

export function Shelf({ children }: { children: ReactNode[] }) {
  const rows: ReactNode[][] = []
  children.forEach((c, i) => (i % 2 === 0 ? rows.push([c]) : rows[rows.length - 1].push(c)))
  return (
    <div className="gh-shelf">
      {rows.map((row, i) => (
        <div key={i} className="gh-shelf-row">
          {row}
        </div>
      ))}
    </div>
  )
}

/** 빨랫줄 (휘어진 선) */
export function Rope({ className }: { className?: string }) {
  return (
    <div className={cn('gh-rope', className)} aria-hidden>
      <svg viewBox="0 0 390 30" preserveAspectRatio="none">
        <path d="M0 6 Q195 34 390 6" stroke="#6F7C96" strokeWidth="2" fill="none" />
      </svg>
    </div>
  )
}

/** 피드 글 = 빨랫줄에 집게로 건 종이. 사진 = 폴라로이드, 글만 = 분류 색 쪽지. 번갈아 기울임 */
export function HangingNote({
  to,
  index,
  color,
  photo,
  text,
  author,
  date,
  category,
  likes,
  liked,
  comments,
}: {
  to: string
  index: number
  color: string
  photo?: string
  text: string
  author: string
  date: string
  category: string
  likes: number
  liked?: boolean
  comments: number
}) {
  const Heart = liked ? IconHeart : IconHeartLine
  return (
    <>
      <Rope />
      <Link to={to} className={cn('gh-hang', index % 2 === 1 && 'is-r', !photo && 'is-note')} style={tint(color)}>
        <i className="gh-pin is-a" aria-hidden />
        <i className="gh-pin is-b" aria-hidden />
        {photo && <img className="gh-photo" src={photo} alt="" loading="lazy" />}
        <p className="gh-cp">{text}</p>
        <div className="gh-hmeta">
          <b>{author}</b>
          {date}
          <span className="gh-lab is-tint" style={tint(color)}>
            {category}
          </span>
          <span className="gh-ic">
            <span className={cn(liked && 'is-liked')} aria-label={`좋아요 ${likes}`}>
              <Heart />
              {likes}
            </span>
            <span aria-label={`댓글 ${comments}`}>
              <IconChat />
              {comments}
            </span>
          </span>
        </div>
      </Link>
    </>
  )
}

/** 답장 · 댓글 (밤 유리 카드). reply = 휜 선으로 이어 들여쓰기, pick = 앰버 빛 */
export function AnswerCard({
  name,
  date,
  to,
  reply,
  pickLabel,
  children,
  actions,
}: {
  name: ReactNode
  date: string
  to?: string
  reply?: boolean
  pickLabel?: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <article className={cn('gh-ans', reply && 'is-reply', pickLabel && 'is-pick')}>
      {pickLabel && (
        <span className="gh-pick-tag">
          <IconStar />
          {pickLabel}
        </span>
      )}
      <div className="gh-who">
        <b>{name}</b>
        <span>{date}</span>
      </div>
      {to && <div className="gh-to">@{to}님에게</div>}
      <p>{children}</p>
      {actions && <div className="gh-acts">{actions}</div>}
    </article>
  )
}

/** 테이프 붙은 크림 쪽지 댓글 (피드 · 공지). reply = 분홍 쪽지 들여쓰기 */
export function Scrap({
  name,
  meta,
  mine,
  to,
  reply,
  right,
  children,
  actions,
}: {
  name: ReactNode
  meta?: ReactNode
  mine?: boolean
  to?: string
  reply?: boolean
  right?: ReactNode
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <article className={cn('gh-scrap', reply && 'is-reply')}>
      <div className="gh-who">
        <b>{name}</b>
        {mine && <span className="gh-me">나</span>}
        {meta}
        {right && <span className="gh-right">{right}</span>}
      </div>
      {to && <div className="gh-to">@{to}님에게</div>}
      <p>{children}</p>
      {actions && <div className="gh-acts">{actions}</div>}
    </article>
  )
}

/** 일정 = 크림 티켓(위 분류 색 띠) + 오른쪽 D-day 그루터기 */
export function Ticket({
  to,
  color,
  category,
  official,
  title,
  when,
  dday,
  ddayCaption,
  holeColor,
}: {
  to: string
  color: string
  category: string
  official?: boolean
  title: string
  when: string
  dday?: string
  ddayCaption?: string
  /** 그루터기 구멍 색 = 바탕색 (기본 밤) */
  holeColor?: string
}) {
  return (
    <Link to={to} className="gh-ticket" style={{ '--c': color, '--gh-hole': holeColor } as CSSProperties}>
      <div className="gh-tbody">
        <div className="gh-tt">
          <span className="gh-chip">{category}</span>
          {official && <span className="gh-off">★ 공식</span>}
        </div>
        <h3>{title}</h3>
        <div className="gh-tw">{when}</div>
      </div>
      {dday && (
        <div className="gh-stub">
          <b>{dday}</b>
          {ddayCaption && <span>{ddayCaption}</span>}
        </div>
      )}
    </Link>
  )
}

/** 공지 = 포스트잇. mustRead = 앰버 "필독" 도장 */
export function PostIt({ mint, small, mustRead, children, to }: { mint?: boolean; small?: boolean; mustRead?: boolean; children: ReactNode; to?: string }) {
  const className = cn('gh-postit', mint && 'is-mint', small && 'is-small')
  const body = (
    <>
      {mustRead && <span className="gh-seal">필독</span>}
      {children}
    </>
  )
  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

/** 코르크 게시판 (밤 = 어두운 코르크 / 낮 = 밝은 코르크 2열) */
export function Board({ day, children }: { day?: boolean; children: ReactNode }) {
  return <div className={cn('gh-board', day && 'is-day')}>{children}</div>
}
