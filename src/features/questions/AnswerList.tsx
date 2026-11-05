import { Link } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import { authorName, authorProfileId, type Author } from '@/features/member/author'
import type { AnswerNode } from '@/features/questions/api'
import { formatRelative } from '@/lib/time'
import { cn } from '@/lib/utils'

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
}

/** 답변 · 답글 트리 */
export function AnswerList({ answers, now, actions }: { answers: AnswerNode[]; now: number; actions?: AnswerActions }) {
  const byId = indexById(answers)
  return (
    <ul className="space-y-3">
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
  return (
    // 알림 · 신고 링크의 #answer-{id}로 바로 내려온다
    <li id={`answer-${answer.id}`} className="scroll-mt-20">
      <div
        className={cn(
          // 답글은 카드 대신 왼쪽 선으로 구분 (다크에서도 답변 카드와 헷갈리지 않게)
          isReply ? 'border-l-2 border-border py-1.5 pl-3' : 'rounded-xl bg-card px-4 py-3.5',
          answer.adopted && 'ring-2 ring-brand',
        )}
      >
        {answer.deletedBy ? (
          <p className="text-sm text-muted-foreground">
            {answer.deletedBy === 'STAFF' ? '운영진이 숨긴 답변이에요' : '삭제된 답변이에요'}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs">
              {answer.adopted && (
                <span className="rounded bg-brand px-1.5 py-0.5 text-[11px] font-bold text-white">채택</span>
              )}
              <AuthorLink author={answer.author} />
              <span className="text-muted-foreground">{formatRelative(answer.createdAt, now)}</span>
              {answer.editedAt && <span className="text-muted-foreground">· 수정됨</span>}
            </div>
            {isReply && <ReplyTarget parent={parent} />}
            {answer.body && <LinkifiedText text={answer.body} className="mt-2 text-sm leading-relaxed text-foreground" />}
            {actions && <ActionRow answer={answer} actions={actions} />}
          </>
        )}
      </div>

      {answer.replies.length > 0 && (
        <ul className={cn('mt-2 space-y-2', answer.depth < MAX_INDENT ? 'pl-3' : 'pl-0')}>
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
  return (
    <p className="mt-1.5 text-xs text-muted-foreground">
      {gone ? (
        '삭제된 답변에 남긴 답글'
      ) : (
        <>
          <span className="font-bold text-brand-text">@{authorName(parent.author)}</span>님에게
        </>
      )}
    </p>
  )
}

/** 답글 · 수정 · 삭제 · 채택 — 시안 06의 작은 글씨 줄. 지운 자리에는 없다 */
function ActionRow({ answer, actions }: { answer: AnswerNode; actions: AnswerActions }) {
  const canAdopt = actions.questionMine && answer.depth === 0
  const buttons: { label: string; onClick: () => void; strong?: boolean }[] = [
    { label: '답글', onClick: () => actions.onReply(answer) },
  ]
  if (answer.mine) {
    buttons.push({ label: '수정', onClick: () => actions.onEdit(answer) })
    buttons.push({ label: '삭제', onClick: () => actions.onDelete(answer) })
  }
  if (canAdopt) {
    buttons.push(
      answer.adopted
        ? { label: '채택 취소', onClick: () => actions.onAdopt(answer, false) }
        : { label: '채택하기', onClick: () => actions.onAdopt(answer, true), strong: true },
    )
  }
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
      {buttons.map((b, i) => (
        <span key={b.label} className="flex items-center gap-x-1">
          {i > 0 && <span aria-hidden>·</span>}
          <button
            type="button"
            disabled={actions.disabled}
            onClick={b.onClick}
            className={cn('py-1 hover:underline disabled:opacity-50', b.strong && 'font-bold text-brand-text')}
          >
            {b.label}
          </button>
        </span>
      ))}
    </div>
  )
}

/** 닉네임을 누르면 프로필로. 익명 · 탈퇴자는 링크 없음 (IA 2장) */
export function AuthorLink({ author }: { author: Author | null }) {
  const profileId = authorProfileId(author)
  const name = authorName(author)
  if (profileId == null) return <span className="font-bold text-title">{name}</span>
  return (
    <Link to={`/members/${profileId}`} className="font-bold text-title hover:underline">
      {name}
    </Link>
  )
}
