import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import {
  BODY_MAX,
  certificationErrorMessage,
  useResubmitCertification,
  useSubmitCertification,
  type CertificationItem,
} from '@/features/events/api'
import { PhotoPicker } from '@/features/uploads/PhotoPicker'
import { usePhotoUploads } from '@/features/uploads/usePhotoUploads'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { toApiError } from '@/lib/api'

/** 무엇을 올리나 — 새 인증, 또는 반려된 인증 다시 올리기(사유 · 지금 글이 있으면 채운다) */
export type CertificationTarget =
  | { mode: 'create' }
  | { mode: 'resubmit'; id: number; rejectReason: string; item: CertificationItem | null }

/** 인증 올리기 시트 (F5-07) — 사진(1–3장, 필수) + 한 줄 */
export function CertificationSheet({
  eventId,
  requirement,
  photoRequired,
  target,
  onClose,
}: {
  eventId: number
  requirement: string | null
  /** 이벤트마다 정한다 (사진이 필요 없는 이벤트도 있다) */
  photoRequired: boolean
  target: CertificationTarget | null
  onClose: () => void
}) {
  return (
    <Sheet open={target != null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] max-w-md gap-0 overflow-y-auto rounded-t-2xl border-0 bg-card px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {/* 닫으면 고른 사진 · 글을 비운다 */}
        {target && (
          <CertificationForm
            key={target.mode === 'resubmit' ? target.id : 'new'}
            eventId={eventId}
            requirement={requirement}
            photoRequired={photoRequired}
            target={target}
            onDone={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function CertificationForm({
  eventId,
  requirement,
  photoRequired,
  target,
  onDone,
}: {
  eventId: number
  requirement: string | null
  photoRequired: boolean
  target: CertificationTarget
  onDone: () => void
}) {
  const resubmit = target.mode === 'resubmit'
  const item = resubmit ? target.item : null
  const uploads = usePhotoUploads(
    'CERT',
    item?.photos.map((p) => ({ objectKey: p.objectKey, url: p.url })) ?? [],
  )
  const [body, setBody] = useState(item?.body ?? '')
  const [triedSubmit, setTriedSubmit] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = useSubmitCertification(eventId)
  const update = useResubmitCertification(eventId)
  const keyFor = useIdempotencyKey()

  const pending = uploading || submit.isPending || update.isPending
  const noPhoto = photoRequired && uploads.photos.length === 0
  const noBody = body.trim() === ''

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTriedSubmit(true)
    if (noPhoto || noBody || uploads.preparing || uploads.hasError || pending) return
    setError(null)
    setUploading(true)
    let photoKeys: string[]
    try {
      // 저장할 때 올린다 — 이미 올린 사진은 다시 올리지 않는다
      photoKeys = await uploads.uploadAll()
    } catch (e) {
      setError(certificationErrorMessage(toApiError(e)))
      return
    } finally {
      setUploading(false)
    }

    const onError = (e: unknown) => setError(certificationErrorMessage(toApiError(e)))
    if (target.mode === 'create') {
      // 사진이 필요 없는 이벤트에서 안 골랐으면 빈 목록
      const input = { body: body.trim(), photoKeys }
      submit.mutate({ input, key: keyFor(input) }, { onSuccess: onDone, onError })
    } else {
      update.mutate({ id: target.id, input: { body: body.trim(), photoKeys } }, { onSuccess: onDone, onError })
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SheetTitle className="text-lg font-bold text-title">{resubmit ? '인증 다시 올리기' : '인증 올리기'}</SheetTitle>
      <SheetDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {resubmit ? (
          <>
            반려 사유: <span className="text-foreground">{target.rejectReason}</span>
          </>
        ) : requirement ? (
          <>필요한 것: {requirement}</>
        ) : (
          '운영진이 확인하면 인증 횟수에 들어가요.'
        )}
      </SheetDescription>

      <div className="mt-6 space-y-6">
        <section>
          <p className="mb-2 text-sm font-bold text-title">
            사진 {!photoRequired && <span className="font-normal text-muted-foreground">(선택)</span>}
          </p>
          <PhotoPicker uploads={uploads} disabled={pending} />
          {triedSubmit && noPhoto && (
            <p className="mt-2 text-xs text-destructive" role="alert">
              사진을 한 장 이상 골라 주세요.
            </p>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="cert-body" className="text-sm font-bold text-title">
              한 줄
            </label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {body.length} / {BODY_MAX}
            </span>
          </div>
          <input
            id="cert-body"
            maxLength={BODY_MAX}
            placeholder="예) 오늘은 DP 문제를 풀었어요"
            className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {triedSubmit && noBody && (
            <p className="mt-2 text-xs text-destructive" role="alert">
              한 줄을 써 주세요.
            </p>
          )}
        </section>
      </div>

      {error && (
        <p className="mt-5 text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-6 h-12 w-full" disabled={pending || uploads.preparing}>
        {uploading ? '사진 올리는 중…' : pending ? '저장하는 중…' : uploads.preparing ? '사진 준비 중…' : resubmit ? '다시 올리기' : '인증 올리기'}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">운영진이 확인하면 알림이 가요.</p>
    </form>
  )
}
