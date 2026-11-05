import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Chip } from '@/components/Chip'
import { FieldLabel, StepFooter } from '@/components/form/StepLayout'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button } from '@/components/ui/button'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { FEED_CATEGORY_KEYS, feedCategoryLabel } from '@/features/content/labels'
import { BODY_MAX, feedErrorMessage, useCreateFeedPost } from '@/features/feed/api'
import { uploadErrorMessage } from '@/features/uploads/api'
import { PhotoPicker } from '@/features/uploads/PhotoPicker'
import { usePhotoUploads } from '@/features/uploads/usePhotoUploads'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'
import { toApiError } from '@/lib/api'

/** 피드 글쓰기 (S51) — 분류 · 본문 · 사진 3장. 수정이 없어 올리기 전에 한 번 더 본다 */
export function FeedWritePage() {
  const { data: me } = useMe()
  const location = useLocation()

  if (!me) {
    return (
      <SubPageLayout fallback="/feed">
        <LockPanel next={location.pathname} title="피드는 부원만 쓸 수 있어요" buttonText="로그인하고 글쓰기" />
      </SubPageLayout>
    )
  }
  return (
    <SubPageLayout fallback="/feed">
      <FeedForm />
    </SubPageLayout>
  )
}

function FeedForm() {
  const navigate = useNavigate()
  const create = useCreateFeedPost()
  const keyFor = useIdempotencyKey()
  const uploads = usePhotoUploads('FEED')
  const [category, setCategory] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [triedSubmit, setTriedSubmit] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = body.trim()
  const busy = uploading || create.isPending
  const allowLeave = useLeaveGuard(
    (category != null || body !== '' || uploads.photos.length > 0) && !busy,
    '글쓰기를 그만둘까요? 입력한 내용은 사라져요.',
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTriedSubmit(true)
    if (category == null || trimmed === '' || busy || uploads.preparing || uploads.hasError) return
    setError(null)
    setUploading(true)
    let photoKeys: string[]
    try {
      photoKeys = await uploads.uploadAll()
    } catch (e) {
      setError(uploadErrorMessage(toApiError(e)))
      return
    } finally {
      setUploading(false)
    }
    const input = { category, body: trimmed, photoKeys }
    create.mutate(
      { input, key: keyFor(input) },
      {
        onSuccess: (created) => {
          allowLeave()
          navigate(`/feed/${created.id}`, { replace: true })
        },
        onError: (e) => setError(feedErrorMessage(toApiError(e))),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 className="mb-8 text-[22px] leading-snug font-bold text-title">피드 글쓰기</h1>
      <div className="space-y-8">
        <section>
          <FieldLabel>분류</FieldLabel>
          <div className="flex flex-wrap gap-2" role="group" aria-label="분류">
            {FEED_CATEGORY_KEYS.map((c) => (
              <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>
                {feedCategoryLabel(c)}
              </Chip>
            ))}
          </div>
          {triedSubmit && category == null && <FieldError>분류를 골라 주세요.</FieldError>}
        </section>

        <section>
          <FieldLabel htmlFor="feed-body" aside={`${body.length} / ${BODY_MAX}`}>
            내용
          </FieldLabel>
          <textarea
            id="feed-body"
            maxLength={BODY_MAX}
            rows={6}
            placeholder="오늘 있었던 일, 자랑하고 싶은 일을 나눠 주세요."
            className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {triedSubmit && trimmed === '' && <FieldError>내용을 써 주세요.</FieldError>}
        </section>

        <section>
          <FieldLabel>
            사진 <span className="font-normal text-muted-foreground">(선택)</span>
          </FieldLabel>
          <PhotoPicker uploads={uploads} disabled={busy} />
        </section>
      </div>

      <StepFooter>
        {error && (
          <p className="mb-3 text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="h-12 w-full" disabled={busy || uploads.preparing}>
          {uploading ? '사진 올리는 중…' : create.isPending ? '올리는 중…' : uploads.preparing ? '사진 준비 중…' : '올리기'}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">피드 글은 올린 뒤에 고칠 수 없어요. 지우고 다시 쓸 수 있어요.</p>
      </StepFooter>
    </form>
  )
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-xs text-destructive" role="alert">
      {children}
    </p>
  )
}
