import { useState, type FormEvent } from 'react'
import { FieldError, Hint, IconSend, LinedBox, Pill, StorySheet, Toggle, useConfirm } from '@/components/story'
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
  const confirm = useConfirm()

  async function handleOpenChange(open: boolean) {
    if (open) return
    if (dirty && !(await confirm({ title: '쓰던 답장을 지울까요?', confirmLabel: '지우기', cancelLabel: '계속 쓰기', danger: true }))) return
    setDirty(false)
    onClose()
  }

  return (
    <StorySheet
      open={target != null}
      onOpenChange={handleOpenChange}
      ghost="b"
      bubble={target?.kind === 'answer' ? '후배에게 빛을 보내 줘요' : undefined}
      title={target ? sheetTitle(target) : ''}
      description={target ? sheetDescription(target) : undefined}
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
    </StorySheet>
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
      <div className="mt-[18px]">
        <LinedBox
          id="answer-body"
          // 시트가 열리면 바로 쓸 수 있게
          autoFocus
          label={isReply ? '답글' : '답장'}
          maxLength={ANSWER_MAX}
          rows={isReply ? 3 : 6}
          placeholder={isReply ? '답글을 남겨 주세요' : '선배의 경험을 나눠 주세요'}
          value={body}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>
      {trimmed.length > 0 && trimmed.length < min && <Hint>{min}자 이상 적어 주세요.</Hint>}

      {showAnonymous && (
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span>익명으로 남기기</span>
          <Toggle small label="익명으로 남기기" checked={anonymous} onChange={setAnonymous} />
        </div>
      )}

      <FieldError>{error ? answerErrorMessage(toApiError(error)) : null}</FieldError>

      <div className="gh-foot">
        <small>
          {body.length} / {ANSWER_MAX}
        </small>
        <Pill type="submit" disabled={pending || trimmed.length < min || (target.kind === 'edit' && !dirty)}>
          <IconSend />
          {pending ? '보내는 중…' : target.kind === 'edit' ? '고치기' : '보내기'}
        </Pill>
      </div>
    </form>
  )
}

function sheetDescription(target: AnswerSheetTarget) {
  if (target.kind === 'reply' && target.parent.body) return <span className="line-clamp-2">{target.parent.body}</span>
  if (target.kind === 'reply' || (target.kind === 'edit' && target.answer.parentId != null)) return '추가 질문이나 감사 인사'
  if (target.kind === 'edit') return undefined
  return `직접 해 본 방법이나 팁을 ${ANSWER_MIN}자 이상 남겨 주세요.`
}

function sheetTitle(target: AnswerSheetTarget) {
  if (target.kind === 'answer') return '답장 보내기'
  if (target.kind === 'reply') return `${authorName(target.parent.author)}님에게 답글`
  return target.answer.parentId != null ? '답글 고치기' : '답장 고치기'
}
