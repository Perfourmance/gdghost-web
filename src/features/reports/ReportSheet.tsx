import { useState, type FormEvent } from 'react'
import { FieldError, IconFlag, LinedBox, Pill, StoryButton, StorySheet } from '@/components/story'
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

/** 신고 시트 — 이유를 적어 운영진에게 보낸다 (F2-10). 시안 report-final '쉿 유령 + 줄 그은 상자'. target이 null이면 닫힘 */
export function ReportSheet({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  const [done, setDone] = useState<'sent' | 'already' | null>(null)
  const name = target ? TARGET_NAMES[target.type] : ''

  function close() {
    setDone(null)
    onClose()
  }

  return (
    <StorySheet
      open={target != null}
      onOpenChange={(next) => !next && close()}
      ghost="shh"
      bubble={done ? '전해 둘게요' : '쉿, 운영진에게만 전할게요'}
      title={done === 'sent' ? '신고했어요' : done === 'already' ? '이미 신고했어요' : `이 ${name} 신고할까요?`}
      description={
        done ? (
          '운영진이 살펴보고 필요하면 숨겨요. 쓴 사람에게는 신고 사실을 알리지 않아요.'
        ) : (
          <>
            신고는 <b>운영진만</b> 볼 수 있어요. 쓴 사람에게는 알림이 가지 않아요.
          </>
        )
      }
    >
      {done ? (
        <StoryButton tone="blue" className="mt-6" onClick={close}>
          확인
        </StoryButton>
      ) : (
        // 대상이 바뀌면 입력을 새로
        target && <ReportForm key={`${target.type}-${target.id}`} target={target} onDone={setDone} />
      )}
    </StorySheet>
  )
}

function ReportForm({ target, onDone }: { target: ReportTarget; onDone: (done: 'sent' | 'already') => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const create = useCreateReport()
  const keyFor = useIdempotencyKey()
  const trimmed = reason.trim()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || create.isPending) return
    setError(null)
    create.mutate(
      { target, reason: trimmed, key: keyFor({ target, reason: trimmed }) },
      {
        onSuccess: () => onDone('sent'),
        onError: (err) => {
          const apiError = toApiError(err)
          if (apiError.code === 'ALREADY_REPORTED') onDone('already')
          else setError(reportErrorMessage(apiError))
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mt-[18px]">
        <LinedBox
          id="report-reason"
          label="신고 이유"
          autoFocus
          maxLength={REASON_MAX}
          placeholder="어떤 점이 불편했는지 적어 주세요."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <FieldError>{error}</FieldError>
      <div className="gh-foot">
        <small>
          {reason.length} / {REASON_MAX}
        </small>
        <Pill type="submit" disabled={!trimmed || create.isPending}>
          <IconFlag />
          {create.isPending ? '보내는 중…' : '신고 보내기'}
        </Pill>
      </div>
    </form>
  )
}
