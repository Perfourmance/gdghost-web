import { useState, type FormEvent } from 'react'
import { FieldError, IconCamera, LinedBox, Pill, StorySheet } from '@/components/story'
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
  const resubmit = target?.mode === 'resubmit'
  return (
    <StorySheet
      open={target != null}
      onOpenChange={(next) => !next && onClose()}
      ghost="star"
      bubble={resubmit ? '다시 띄워 볼까요?' : '오늘의 별 하나!'}
      title={resubmit ? '인증 다시 올리기' : '인증 올리기'}
      description={
        target?.mode === 'resubmit' ? (
          <>반려 사유: {target.rejectReason}</>
        ) : requirement ? (
          <>필요한 것: {requirement}</>
        ) : (
          '운영진이 확인하면 인증 횟수에 반영돼요.'
        )
      }
    >
        {/* 닫으면 고른 사진 · 글을 비운다 */}
        {target && (
          <CertificationForm
            key={target.mode === 'resubmit' ? target.id : 'new'}
            eventId={eventId}
            photoRequired={photoRequired}
            target={target}
            onDone={onClose}
          />
        )}
    </StorySheet>
  )
}

function CertificationForm({
  eventId,
  photoRequired,
  target,
  onDone,
}: {
  eventId: number
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
    <form onSubmit={handleSubmit} noValidate className="mt-5">
      <p className="mb-2 font-title text-[13px] text-gh-sky">사진 {!photoRequired && <span className="text-gh-sub">· 선택</span>}</p>
      <PhotoPicker uploads={uploads} disabled={pending} />
      {triedSubmit && noPhoto && <FieldError>사진을 한 장 이상 골라 주세요.</FieldError>}

      <div className="mt-5">
        <LinedBox
          id="cert-body"
          label="한 줄"
          rows={2}
          maxLength={BODY_MAX}
          placeholder="예: 오늘은 DP 문제를 풀었어요"
          value={body}
          onChange={(e) => setBody(e.target.value.replace(/\n/g, ' '))}
        />
      </div>
      {triedSubmit && noBody && <FieldError>한 줄을 써 주세요.</FieldError>}
      <FieldError>{error}</FieldError>

      <div className="gh-foot">
        <small>
          {body.length} / {BODY_MAX} · 운영진이 확인하면 알림이 가요
        </small>
        <Pill type="submit" disabled={pending || uploads.preparing}>
          <IconCamera />
          {uploading ? '사진 올리는 중…' : pending ? '저장하는 중…' : uploads.preparing ? '사진 준비 중…' : resubmit ? '다시 올리기' : '올리기'}
        </Pill>
      </div>
    </form>
  )
}
