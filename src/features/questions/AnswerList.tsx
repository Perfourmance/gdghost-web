import { Link } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import { authorName, authorProfileId, type Author } from '@/features/member/author'
import type { AnswerNode } from '@/features/questions/api'
import { formatRelative } from '@/lib/time'
import { cn } from '@/lib/utils'
import { IconStar } from '@/components/story'

// 답글 들여쓰기는 3단계(depth 1–3)까지. 더 깊은 답글은 백엔드가 depth 3 자리(형제)로 올려 보낸다 (기능명세 F2-09)
const MAX_INDENT = 3

/** 답변 아래 글씨 버튼들의 동작. 없으면 읽기 전용 */
export interface AnswerActions {
  /** 질문자면 답변(답글 제외)에 채택 · 채택 취소 */
  questionMine: boolean
  disabled: boolean
  onReply: (answer: AnswerNode) => void
  onEdit: (answer: AnswerNode) => void
  onDelete: (answer: AnswerNode) => void
  /** adopt=false면 채택 취소 */
  onAdopt: (answer: AnswerNode, adopt: boolean) => void
  /** 남의 답변 · 답글 신고 (F2-10) */
  onReport: (answer: AnswerNode) => void
}

/** 답변 · 답글 트리 — 밤 유리 카드, 답글은 휜 선으로 들여쓰기, 채택은 앰버 빛 */
export function AnswerList({ answers, now, actions }: { answers: AnswerNode[]; now: number; actions?: AnswerActions }) {
  const byId = indexById(answers)
  return (
    <ul>
      {answers.map((answer) => (
        <AnswerItem key={answer.id} answer={answer} now={now} actions={actions} byId={byId} />
      ))}
    </ul>
  )
}

/** 답글이 누구에게 단 것인지 찾으려고 — depth 3 자리에선 형제에게 단 답글도 있다 */
function indexById(answers: AnswerNode[], map = new Map<number, AnswerNode>()) {
  for (const answer of answers) {
    map.set(answer.id, answer)
    indexById(answer.replies, map)
  }
  return map
}

interface ItemProps {
  answer: AnswerNode
  now: number
  actions?: AnswerActions
  byId: Map<number, AnswerNode>
}

function AnswerItem({ answer, now, actions, byId }: ItemProps) {
  const isReply = answer.depth > 0
  const parent = answer.parentId != null ? byId.get(answer.parentId) : undefined
  const pickLabel = answer.adopted ? (actions?.questionMine ? '내가 채택한 답장' : '채택된 답장') : null
  return (
    // 알림 · 신고 링크의 #answer-{id}로 바로 내려온다
    <li id={`answer-${answer.id}`} className="scroll-mt-20">
      <article className={cn('gh-ans', isReply && 'is-reply', pickLabel && 'is-pick', answer.mine && !pickLabel && 'is-mine')}>
        {answer.deletedBy ? (
          <p className="gh-gone">{answer.deletedBy === 'STAFF' ? '운영진이 숨긴 답장이에요' : '삭제된 답장이에요'}</p>
        ) : (
          <>
            {pickLabel && (
              <span className="gh-pick-tag">
                <IconStar />
                {pickLabel}
              </span>
            )}
            <div className="gh-who">
              <b>
                <AuthorLink author={answer.author} className="" />
              </b>
              <span>
                {formatRelative(answer.createdAt, now)}
                {answer.mine && ' · 나'}
                {answer.editedAt && ' · 고침'}
              </span>
            </div>
            {isReply && <ReplyTarget parent={parent} />}
            {answer.body && <LinkifiedText text={answer.body} className="gh-body" />}
            {actions && <ActionRow answer={answer} actions={actions} />}
          </>
        )}
      </article>

      {answer.replies.length > 0 && (
        <ul className={cn(answer.depth >= MAX_INDENT && '!pl-0')}>
          {answer.replies.map((reply) => (
            <AnswerItem key={reply.id} answer={reply} now={now} actions={actions} byId={byId} />
          ))}
        </ul>
      )}
    </li>
  )
}

/** 누구에게 단 답글인지 — 대상이 지워졌으면 그렇게 적는다 */
function ReplyTarget({ parent }: { parent: AnswerNode | undefined }) {
  const gone = !parent || parent.deletedBy != null
  return <div className="gh-to">{gone ? '삭제된 답장에 남긴 답글' : `@${authorName(parent.author)}님에게`}</div>
}

/** 답글 · 수정 · 삭제 · 신고 · 채택 — 시안 06의 작은 글씨 줄. 지운 자리에는 없다 */
function ActionRow({ answer, actions }: { answer: AnswerNode; actions: AnswerActions }) {
  const canAdopt = actions.questionMine && answer.depth === 0
  const buttons: { label: string; onClick: () => void; tone?: 'dim' | 'amber' }[] = [
    { label: '답글', onClick: () => actions.onReply(answer) },
  ]
  if (answer.mine) {
    buttons.push({ label: '수정', onClick: () => actions.onEdit(answer) })
    buttons.push({ label: '삭제', onClick: () => actions.onDelete(answer), tone: 'dim' })
  } else {
    buttons.push({ label: '신고', onClick: () => actions.onReport(answer), tone: 'dim' })
  }
  if (canAdopt) {
    buttons.push(
      answer.adopted
        ? { label: '채택 취소', onClick: () => actions.onAdopt(answer, false), tone: 'amber' }
        : { label: '채택하기', onClick: () => actions.onAdopt(answer, true), tone: 'amber' },
    )
  }
  return (
    <div className="gh-acts">
      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          disabled={actions.disabled}
          onClick={b.onClick}
          className={cn(b.tone === 'dim' && 'is-dim', b.tone === 'amber' && 'is-amber')}
        >
          {b.label}
        </button>
      ))}
    </div>
  )
}

/** 닉네임을 누르면 프로필로. 익명 · 탈퇴자는 링크 없음 (IA 2장) */
export function AuthorLink({ author, className = 'font-bold text-title hover:underline' }: { author: Author | null; className?: string }) {
  const profileId = authorProfileId(author)
  const name = authorName(author)
  if (profileId == null) return <span className={className}>{name}</span>
  return (
    <Link to={`/members/${profileId}`} className={className}>
      {name}
    </Link>
  )
}
