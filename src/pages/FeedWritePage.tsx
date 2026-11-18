import { useState, type CSSProperties, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { DotChips, FieldError, Ghost, IconSend, Rope, StorySubPage } from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { FEED_CATEGORY_KEYS, feedCategoryLabel } from '@/features/content/labels'
import { BODY_MAX, feedErrorMessage, useCreateFeedPost } from '@/features/feed/api'
import { MAX_PHOTOS, uploadErrorMessage } from '@/features/uploads/api'
import { PolaroidPicker } from '@/features/uploads/PolaroidPicker'
import { usePhotoUploads } from '@/features/uploads/usePhotoUploads'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'
import { toApiError } from '@/lib/api'
import { colorOf, FEED_COLORS } from '@/lib/categoryColors'
import { cn } from '@/lib/utils'
import '@/styles/feed.css'

/** 피드 글쓰기 (S51) — 분류 · 본문 · 사진 3장. 수정이 없어 올리기 전에 한 번 더 본다 */
export function FeedWritePage() {
  const { data: me } = useMe()
  const location = useLocation()

  if (!me) {
    return (
      <SubPageLayout fallback="/feed">
        <LockPanel next={location.pathname} title="피드는 부원만 쓸 수 있어요." buttonText="로그인하고 글쓰기" />
      </SubPageLayout>
    )
  }
  return (
    <StorySubPage fallback="/feed" className="gh-fw">
      <FeedForm />
    </StorySubPage>
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
    '글쓰기를 그만둘까요? 입력한 내용은 저장되지 않아요.',
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

  const color = colorOf(FEED_COLORS, category ?? 'DAILY')
  const blocked = (triedSubmit && (category == null || trimmed === '')) || error != null

  return (
    <form onSubmit={handleSubmit} noValidate style={{ '--c': color } as CSSProperties}>
      <div className="gh-fw-ttl">
        <h1>
          어떤 하루를
          <br />
          걸어 둘까요?
        </h1>
        <p>빨랫줄에 걸면 마을 사람들이 봐요.</p>
        <Ghost pose="b" />
      </div>
      <DotChips
        label="분류"
        className={cn(triedSubmit && category == null && 'is-error')}
        value={category ?? ''}
        onChange={(v) => setCategory(v)}
        options={FEED_CATEGORY_KEYS.map((c) => ({ value: c, label: feedCategoryLabel(c), color: colorOf(FEED_COLORS, c) }))}
      />
      {triedSubmit && category == null && <FieldError>분류를 골라 주세요.</FieldError>}

      <Rope className="mt-[22px]" />
      <div className="gh-fwnote">
        <i className="gh-pin is-a" aria-hidden />
        <i className="gh-pin is-b" aria-hidden />
        <textarea
          id="feed-body"
          aria-label="내용"
          maxLength={BODY_MAX}
          placeholder="오늘 있었던 일이나 자랑하고 싶은 것"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="gh-n">
          <span className="gh-chip">{category ? feedCategoryLabel(category) : '분류 고르기 전'}</span>
          {body.length} / {BODY_MAX}
        </div>
      </div>
      {triedSubmit && trimmed === '' && <FieldError>내용을 써 주세요.</FieldError>}

      <p className="gh-fwph">
        사진
        <small>
          선택 · {uploads.photos.length} / {MAX_PHOTOS}
        </small>
      </p>
      <Rope className="gh-mini" />
      <PolaroidPicker uploads={uploads} disabled={busy} />

      <div className="gh-go2">
        {uploading ? '사진 거는 중…' : create.isPending ? '거는 중…' : uploads.preparing ? '사진 준비 중…' : '하루 걸어 두기'}
        <button type="submit" aria-label="하루 걸어 두기" disabled={busy || uploads.preparing}>
          <IconSend />
        </button>
      </div>
      <p className={cn('gh-gon', blocked && error && 'is-bad')} role={error ? 'alert' : undefined}>
        {error ?? (
          <>
            걸어 둔 뒤에는 고칠 수 없어요.
            <br />
            내리고 다시 걸 수는 있어요.
          </>
        )}
      </p>
    </form>
  )
}
