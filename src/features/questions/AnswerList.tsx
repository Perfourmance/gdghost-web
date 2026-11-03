import { Link } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import { authorName, authorProfileId, type Author } from '@/features/member/author'
import type { AnswerNode } from '@/features/questions/api'
import { formatRelative } from '@/lib/time'
import { cn } from '@/lib/utils'

// 들여쓰기는 3단계까지, 더 깊은 답글은 같은 깊이로 이어 붙인다 (기능명세 F2-09)
const MAX_INDENT = 3

/** 답변 · 답글 트리 (읽기 전용. 쓰기 · 채택은 F7) */
export function AnswerList({ answers, now }: { answers: AnswerNode[]; now: number }) {
  return (
    <ul className="space-y-3">
      {answers.map((answer) => (
        <AnswerItem key={answer.id} answer={answer} now={now} />
      ))}
    </ul>
  )
}

function AnswerItem({ answer, now }: { answer: AnswerNode; now: number }) {
  const isReply = answer.depth > 0
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
            {answer.deletedBy === 'STAFF' ? '운영진이 숨긴 답변입니다' : '삭제된 답변입니다'}
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
            {answer.body && <LinkifiedText text={answer.body} className="mt-2 text-sm leading-relaxed text-foreground" />}
          </>
        )}
      </div>

      {answer.replies.length > 0 && (
        <ul className={cn('mt-2 space-y-2', answer.depth < MAX_INDENT - 1 ? 'pl-4' : 'pl-0')}>
          {answer.replies.map((reply) => (
            <AnswerItem key={reply.id} answer={reply} now={now} />
          ))}
        </ul>
      )}
    </li>
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
