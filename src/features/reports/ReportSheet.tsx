import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { REASON_MAX, reportErrorMessage, useCreateReport, type ReportTarget } from '@/features/reports/api'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { toApiError } from '@/lib/api'

/** 조사까지 붙인 이름 — "이 질문을 신고할까요?" */
const TARGET_NAMES: Record<ReportTarget['type'], string> = {
  QUESTION: '질문을',
  ANSWER: '답변을',
  SHARE: '공유 글을',
  SHARE_NOTE: '덧붙인 글을',
  FEED: '피드 글을',
  FEED_COMMENT: '댓글을',
  NOTICE_COMMENT: '댓글을',
}

/** 신고 시트 — 이유를 적어 운영진에게 보낸다 (F2-10). target이 null이면 닫힘 */
export function ReportSheet({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  return (
    <Sheet open={target != null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] max-w-md gap-0 overflow-y-auto rounded-t-2xl border-0 bg-card px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {/* 대상이 바뀌면 입력을 새로 */}
        {target && <ReportForm key={`${target.type}-${target.id}`} target={target} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

function ReportForm({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<'sent' | 'already' | null>(null)
  const create = useCreateReport()
  const keyFor = useIdempotencyKey()
  const trimmed = reason.trim()
  const name = TARGET_NAMES[target.type]

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || create.isPending) return
    setError(null)
    create.mutate(
      { target, reason: trimmed, key: keyFor({ target, reason: trimmed }) },
      {
        onSuccess: () => setDone('sent'),
        onError: (err) => {
          const apiError = toApiError(err)
          if (apiError.code === 'ALREADY_REPORTED') setDone('already')
          else setError(reportErrorMessage(apiError))
        },
      },
    )
  }

  if (done) {
    return (
      <div role="status">
        <SheetTitle className="text-lg font-bold text-title">
          {done === 'sent' ? '신고했어요' : '이미 신고했어요'}
        </SheetTitle>
        <SheetDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
          운영진이 확인하고 필요하면 숨길게요. 신고한 사실은 작성자에게 알리지 않아요.
        </SheetDescription>
        <Button size="lg" className="mt-6 h-12 w-full font-bold" onClick={onClose}>
          확인
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <SheetTitle className="text-lg font-bold text-title">이 {name} 신고할까요?</SheetTitle>
      <SheetDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
        운영진만 볼 수 있어요. 작성자에게는 알리지 않아요.
      </SheetDescription>
      <textarea
        autoFocus
        aria-label="신고 이유"
        rows={4}
        maxLength={REASON_MAX}
        placeholder="어떤 점이 문제인지 적어 주세요"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="mt-5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
      />
      <div className="mt-1 flex justify-between gap-2 text-xs tabular-nums">
        <span className="text-destructive" role={error ? 'alert' : undefined}>
          {error ?? ''}
        </span>
        <span className="shrink-0 text-muted-foreground">
          {reason.length} / {REASON_MAX}
        </span>
      </div>
      <Button type="submit" size="lg" className="mt-4 h-12 w-full font-bold" disabled={!trimmed || create.isPending}>
        {create.isPending ? '보내는 중…' : '신고하기'}
      </Button>
    </form>
  )
}
