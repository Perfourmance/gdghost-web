import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { PURPOSE_MAX, PURPOSE_MIN, requestErrorMessage, useRequestCoffeeChat } from '@/features/coffee/api'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { toApiError } from '@/lib/api'

export interface CoffeeTarget {
  id: number
  nickname: string
}

/** 커피챗 신청 시트 — 궁금한 점을 적어 보낸다 (F3-06). target이 null이면 닫힘 */
export function CoffeeChatSheet({ target, onClose }: { target: CoffeeTarget | null; onClose: () => void }) {
  return (
    <Sheet open={target != null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] max-w-md gap-0 overflow-y-auto rounded-t-2xl border-0 bg-card px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {target && <RequestForm key={target.id} target={target} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

function RequestForm({ target, onClose }: { target: CoffeeTarget; onClose: () => void }) {
  const [purpose, setPurpose] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const request = useRequestCoffeeChat()
  const keyFor = useIdempotencyKey()
  const trimmed = purpose.trim()
  const tooShort = trimmed.length < PURPOSE_MIN

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (tooShort || request.isPending) return
    setError(null)
    const input = { receiverId: target.id, purpose: trimmed }
    request.mutate(
      { input, key: keyFor(input) },
      { onSuccess: () => setDone(true), onError: (err) => setError(requestErrorMessage(toApiError(err))) },
    )
  }

  if (done) {
    return (
      <div className="py-2 text-center">
        <SheetTitle className="text-lg font-bold text-title">신청을 보냈어요</SheetTitle>
        <SheetDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {target.nickname}님이 7일 안에 수락하면, 연락 방법이 담긴 한 줄이 보여요.
        </SheetDescription>
        <Link
          to="/coffee-chats?tab=sent"
          className={buttonVariants({ variant: 'secondary', size: 'lg', className: 'mt-6 h-12 w-full' })}
        >
          보낸 신청 보기
        </Link>
        <Button size="lg" className="mt-2 h-12 w-full" onClick={onClose}>
          닫기
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SheetTitle className="text-lg font-bold text-title">{target.nickname}님에게 커피챗 신청</SheetTitle>
      <SheetDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
        무엇이 궁금한지 적어 주세요. 수락하면 상대가 정해 둔 연락 방법이 14일 동안 보여요.
      </SheetDescription>
      <div className="mt-5">
        <textarea
          aria-label="궁금한 점"
          rows={4}
          maxLength={PURPOSE_MAX}
          placeholder="예) 프론트엔드 인턴 준비 과정이 궁금해요. 30분 정도 이야기 나눌 수 있을까요?"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{tooShort && trimmed.length > 0 ? `${PURPOSE_MIN}자 이상 적어 주세요` : ''}</span>
          <span>
            {purpose.length} / {PURPOSE_MAX}
          </span>
        </div>
      </div>
      {error && (
        <p className="mt-3 text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-5 h-12 w-full" disabled={tooShort || request.isPending}>
        {request.isPending ? '보내는 중…' : '신청 보내기'}
      </Button>
    </form>
  )
}
