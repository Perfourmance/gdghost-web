import { useState, type FormEvent } from 'react'
import { FieldError, Ghost, Hint, IconSend, Pill, PillLink, StorySheet } from '@/components/story'
import { PURPOSE_MAX, PURPOSE_MIN, requestErrorMessage, useRequestCoffeeChat } from '@/features/coffee/api'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { toApiError } from '@/lib/api'
import '@/styles/members.css'

export interface CoffeeTarget {
  id: number
  nickname: string
}

/** 커피챗 신청 시트 — 시안 cofreq-final '불 켜진 창문 + 노란 쪽지'. 궁금한 점을 적어 보낸다 (F3-06). target이 null이면 닫힘 */
export function CoffeeChatSheet({ target, onClose }: { target: CoffeeTarget | null; onClose: () => void }) {
  const [done, setDone] = useState(false)
  const name = target?.nickname ?? ''

  function close() {
    setDone(false)
    onClose()
  }

  return (
    <StorySheet
      open={target != null}
      onOpenChange={(next) => !next && close()}
      title={
        done ? (
          '쪽지를 창문에 붙였어요'
        ) : (
          <>
            <em>{name}</em>님 창문에 커피챗 신청
          </>
        )
      }
      description={
        done ? (
          `${name}님이 7일 안에 수락하면 연락 방법을 볼 수 있어요.`
        ) : (
          <>
            궁금한 점을 적어 주세요. {name}님이 수락하면 <b>14일 동안</b> 연락 방법을 볼 수 있어요.
          </>
        )
      }
    >
      <div className="gh-cofwin" aria-hidden>
        <Ghost pose="b" />
      </div>
      <span className="gh-knock" aria-hidden>
        {done ? '쪽지 붙였어요!' : '똑똑, 커피 한잔 어때요?'}
      </span>
      {done ? (
        <div className="mt-6 flex gap-2">
          <PillLink to="/coffee-chats?tab=sent" soft className="flex-1 justify-center">
            보낸 신청 보기
          </PillLink>
          <Pill className="flex-1 justify-center" onClick={close}>
            닫기
          </Pill>
        </div>
      ) : (
        target && <RequestForm key={target.id} target={target} onDone={() => setDone(true)} />
      )}
    </StorySheet>
  )
}

function RequestForm({ target, onDone }: { target: CoffeeTarget; onDone: () => void }) {
  const [purpose, setPurpose] = useState('')
  const [error, setError] = useState<string | null>(null)
  const request = useRequestCoffeeChat()
  const keyFor = useIdempotencyKey()
  const trimmed = purpose.trim()
  const tooShort = trimmed.length < PURPOSE_MIN

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (tooShort || request.isPending) return
    setError(null)
    const input = { receiverId: target.id, purpose: trimmed }
    request.mutate({ input, key: keyFor(input) }, { onSuccess: onDone, onError: (err) => setError(requestErrorMessage(toApiError(err))) })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="gh-cofnote">
        <textarea
          aria-label="궁금한 점"
          autoFocus
          maxLength={PURPOSE_MAX}
          placeholder="예: 프론트엔드 인턴 준비, 30분 정도 이야기 나눌 수 있을까요?"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />
      </div>
      {tooShort && trimmed.length > 0 && <Hint>{PURPOSE_MIN}자 이상 적어 주세요.</Hint>}
      <FieldError>{error}</FieldError>
      <div className="gh-foot">
        <small>
          {purpose.length} / {PURPOSE_MAX}
        </small>
        <span className="gh-cofsend">
          {request.isPending ? '보내는 중…' : '신청 보내기'}
          <button type="submit" aria-label="신청 보내기" disabled={tooShort || request.isPending}>
            <IconSend />
          </button>
        </span>
      </div>
    </form>
  )
}
