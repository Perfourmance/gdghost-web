import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { authorName } from '@/features/member/author'
import type { AnswerNode } from '@/features/questions/api'
import {
  ANSWER_MAX,
  ANSWER_MIN,
  answerErrorMessage,
  REPLY_MIN,
  useCreateAnswer,
  useUpdateAnswer,
} from '@/features/questions/answers'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'
import { toApiError } from '@/lib/api'

/** 시트가 무엇을 쓰는지 — 답변 · 어떤 답변에 답글 · 내 답변 수정 */
export type AnswerSheetTarget =
  | { kind: 'answer' }
  | { kind: 'reply'; parent: AnswerNode }
  | { kind: 'edit'; answer: AnswerNode }

interface Props {
  questionId: number
  target: AnswerSheetTarget | null
  /** 익명 질문에서만 익명 체크가 보인다 (F2-06) */
  canPostAnonymously: boolean
  /** 익명 체크 기본값 */
  defaultAnonymous: boolean
  onClose: () => void
}

/** 답변 · 답글 작성 · 수정 시트 (IA 3장 시트, 기능명세 F2-04 · F2-09) */
export function AnswerSheet({ target, onClose, ...rest }: Props) {
  const [dirty, setDirty] = useState(false)

  function handleOpenChange(open: boolean) {
    if (open) return
    if (dirty && !window.confirm('작성 중인 내용을 지울까요?')) return
    setDirty(false)
    onClose()
  }

  return (
    <Sheet open={target != null} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] max-w-md gap-0 overflow-y-auto rounded-t-2xl border-0 bg-card px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {target && (
          <AnswerForm
            // 대상이 바뀌면 입력 상태를 새로
            key={formKey(target)}
            target={target}
            onDirtyChange={setDirty}
            onDone={() => {
              setDirty(false)
              onClose()
            }}
            {...rest}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function formKey(target: AnswerSheetTarget) {
  if (target.kind === 'reply') return `reply-${target.parent.id}`
  if (target.kind === 'edit') return `edit-${target.answer.id}`
  return 'answer'
}

function AnswerForm({
  questionId,
  target,
  canPostAnonymously,
  defaultAnonymous,
  onDirtyChange,
  onDone,
}: Omit<Props, 'target' | 'onClose'> & {
  target: AnswerSheetTarget
  onDirtyChange: (dirty: boolean) => void
  onDone: () => void
}) {
  const initialBody = target.kind === 'edit' ? (target.answer.body ?? '') : ''
  const [body, setBody] = useState(initialBody)
  const [anonymous, setAnonymous] = useState(canPostAnonymously && defaultAnonymous)
  const create = useCreateAnswer(questionId)
  const update = useUpdateAnswer(questionId)
  const keyFor = useIdempotencyKey()

  const isReply = target.kind === 'reply' || (target.kind === 'edit' && target.answer.parentId != null)
  const min = isReply ? REPLY_MIN : ANSWER_MIN
  const trimmed = body.trim()
  const dirty = trimmed !== initialBody.trim()
  const pending = create.isPending || update.isPending
  const allowLeave = useLeaveGuard(dirty && !pending, '작성 중인 내용을 지울까요?')

  function handleChange(value: string) {
    setBody(value)
    onDirtyChange(value.trim() !== initialBody.trim())
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (trimmed.length < min || pending) return
    const done = () => {
      allowLeave()
      onDone()
    }
    if (target.kind === 'edit') {
      update.mutate({ answerId: target.answer.id, body: trimmed }, { onSuccess: done })
      return
    }
    const input = {
      body: trimmed,
      parentId: target.kind === 'reply' ? target.parent.id : null,
      anonymous: canPostAnonymously && anonymous,
    }
    create.mutate({ input, key: keyFor(input) }, { onSuccess: done })
  }

  const error = create.error ?? update.error
  const showAnonymous = target.kind !== 'edit' && canPostAnonymously

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SheetTitle className="text-base font-bold text-title">{sheetTitle(target)}</SheetTitle>
      <SheetDescription className="mt-1 text-xs text-muted-foreground">
        {target.kind === 'reply' && target.parent.body ? (
          <span className="line-clamp-2">{target.parent.body}</span>
        ) : isReply ? (
          '꼬리 질문이나 감사 인사를 남겨 보세요.'
        ) : (
          `${ANSWER_MIN}자 이상 적어 주세요. 겪어 본 일을 나눠 주면 큰 도움이 돼요.`
        )}
      </SheetDescription>

      <textarea
        // 시트가 열리면 바로 쓸 수 있게
        autoFocus
        aria-label={isReply ? '답글 내용' : '답변 내용'}
        maxLength={ANSWER_MAX}
        rows={isReply ? 3 : 6}
        placeholder={isReply ? '답글을 남겨 주세요' : '답변을 남겨 주세요'}
        className="mt-4 w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        value={body}
        onChange={(e) => handleChange(e.target.value)}
      />
      <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>{trimmed.length > 0 && trimmed.length < min ? `${min}자 이상 적어 주세요.` : ''}</span>
        <span>
          {body.length} / {ANSWER_MAX}
        </span>
      </div>

      {showAnonymous && (
        <label className="mt-3 flex items-center gap-2.5 text-sm text-title">
          <Checkbox checked={anonymous} onCheckedChange={(on) => setAnonymous(on === true)} />
          익명으로 남기기
        </label>
      )}

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {answerErrorMessage(toApiError(error))}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="mt-4 h-12 w-full"
        disabled={pending || trimmed.length < min || (target.kind === 'edit' && !dirty)}
      >
        {pending ? '저장하는 중…' : target.kind === 'edit' ? '수정 완료' : '등록'}
      </Button>
    </form>
  )
}

function sheetTitle(target: AnswerSheetTarget) {
  if (target.kind === 'answer') return '답변 달기'
  if (target.kind === 'reply') return `${authorName(target.parent.author)}님에게 답글`
  return target.answer.parentId != null ? '답글 수정' : '답변 수정'
}
