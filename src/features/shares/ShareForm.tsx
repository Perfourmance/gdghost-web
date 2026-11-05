import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Chip } from '@/components/Chip'
import { FieldLabel, StepFooter } from '@/components/form/StepLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SHARE_CATEGORY_KEYS, shareCategoryLabel } from '@/features/content/labels'
import { BODY_MAX, BODY_MIN, TAG_MAX, TAGS_MAX, TITLE_MAX, TITLE_MIN } from '@/features/shares/api'
import { uploadErrorMessage } from '@/features/uploads/api'
import { PhotoPicker } from '@/features/uploads/PhotoPicker'
import { usePhotoUploads, type ExistingPhoto } from '@/features/uploads/usePhotoUploads'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'
import { toApiError, type ApiError } from '@/lib/api'

export interface ShareFormValues {
  category: string | null
  title: string
  body: string
  tags: string[]
}

export interface ShareFormSubmit {
  values: ShareFormValues
  photoKeys: string[]
  /** 고른 사진이 처음과 달라졌는지 (수정에서 photoKeys를 보낼지) */
  photosChanged: boolean
}

interface Props {
  mode: 'create' | 'edit'
  initial: ShareFormValues
  initialPhotos?: ExistingPhoto[]
  pending: boolean
  error: ApiError | null
  formError: string | null
  /** 사진을 다 올린 뒤 부른다. 저장에 성공해 화면을 옮기기 전에 allowLeave() */
  onSubmit: (submit: ShareFormSubmit, allowLeave: () => void) => void
}

/** 공유 작성 · 수정 공통 — 분류 → 제목 → 본문 → 태그 → 사진 (F6-02) */
export function ShareForm({ mode, initial, initialPhotos = [], pending, error, formError, onSubmit }: Props) {
  const [values, setValues] = useState(initial)
  const uploads = usePhotoUploads('SHARE', initialPhotos)
  const [triedSubmit, setTriedSubmit] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const title = values.title.trim()
  const body = values.body.trim()
  const titleInvalid = title.length < TITLE_MIN
  const bodyInvalid = body.length < BODY_MIN

  const initialKeys = initialPhotos.map((p) => p.objectKey).join()
  const photosChanged = uploads.photos.map((p) => p.objectKey ?? p.id).join() !== initialKeys
  const changed =
    values.category !== initial.category ||
    title !== initial.title.trim() ||
    body !== initial.body.trim() ||
    values.tags.join() !== initial.tags.join() ||
    photosChanged
  const busy = pending || uploading
  const allowLeave = useLeaveGuard(
    changed && !busy,
    mode === 'create' ? '공유 작성을 그만둘까요? 입력한 내용은 사라져요.' : '수정을 그만둘까요? 바꾼 내용은 사라져요.',
  )

  function set(patch: Partial<ShareFormValues>) {
    setValues((v) => ({ ...v, ...patch }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTriedSubmit(true)
    if (values.category == null || titleInvalid || bodyInvalid || busy) return
    if (uploads.preparing || uploads.hasError) return
    setUploadError(null)
    setUploading(true)
    let photoKeys: string[]
    try {
      photoKeys = await uploads.uploadAll()
    } catch (e) {
      setUploadError(uploadErrorMessage(toApiError(e)))
      return
    } finally {
      setUploading(false)
    }
    onSubmit({ values: { ...values, title, body }, photoKeys, photosChanged }, allowLeave)
  }

  const categoryError =
    (triedSubmit && values.category == null ? '분류를 골라 주세요.' : null) ?? error?.fieldMessage('category')
  const titleError =
    (triedSubmit && titleInvalid ? `제목을 ${TITLE_MIN}자 이상 써 주세요.` : null) ?? error?.fieldMessage('title')
  const bodyError =
    (triedSubmit && bodyInvalid ? `본문을 ${BODY_MIN}자 이상 써 주세요.` : null) ?? error?.fieldMessage('body')

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 className="mb-8 text-[22px] leading-snug font-bold text-title">
        {mode === 'create' ? '정보 공유하기' : '공유 수정'}
      </h1>

      <div className="space-y-8">
        <section>
          <FieldLabel>분류</FieldLabel>
          <div className="flex flex-wrap gap-2" role="group" aria-label="분류">
            {SHARE_CATEGORY_KEYS.map((c) => (
              <Chip key={c} selected={values.category === c} onClick={() => set({ category: c })}>
                {shareCategoryLabel(c)}
              </Chip>
            ))}
          </div>
          {categoryError && <FieldError>{categoryError}</FieldError>}
        </section>

        <section>
          <FieldLabel htmlFor="share-title" aside={`${values.title.length} / ${TITLE_MAX}`}>
            제목
          </FieldLabel>
          <Input
            id="share-title"
            maxLength={TITLE_MAX}
            placeholder="예) 학교 앞 혼밥하기 좋은 곳"
            className="h-12 bg-card"
            aria-invalid={titleError ? true : undefined}
            value={values.title}
            onChange={(e) => set({ title: e.target.value })}
          />
          {titleError && <FieldError>{titleError}</FieldError>}
        </section>

        <section>
          <FieldLabel htmlFor="share-body" aside={`${values.body.length} / ${BODY_MAX}`}>
            본문
          </FieldLabel>
          <textarea
            id="share-body"
            maxLength={BODY_MAX}
            rows={8}
            placeholder="직접 겪어 본 내용을 적어 주세요. 링크도 넣을 수 있어요."
            aria-invalid={bodyError ? true : undefined}
            className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
            value={values.body}
            onChange={(e) => set({ body: e.target.value })}
          />
          {bodyError && <FieldError>{bodyError}</FieldError>}
        </section>

        <section>
          <FieldLabel htmlFor="share-tag" aside={`${values.tags.length} / ${TAGS_MAX}`}>
            태그 <span className="font-normal text-muted-foreground">(선택)</span>
          </FieldLabel>
          <TagInput tags={values.tags} onChange={(tags) => set({ tags })} />
        </section>

        <section>
          <FieldLabel>
            사진 <span className="font-normal text-muted-foreground">(선택)</span>
          </FieldLabel>
          <PhotoPicker uploads={uploads} disabled={busy} />
        </section>
      </div>

      <StepFooter>
        {(uploadError ?? formError) && (
          <p className="mb-3 text-center text-sm text-destructive" role="alert">
            {uploadError ?? formError}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full"
          disabled={busy || uploads.preparing || (mode === 'edit' && !changed)}
        >
          {uploading
            ? '사진 올리는 중…'
            : pending
              ? '저장하는 중…'
              : uploads.preparing
                ? '사진 준비 중…'
                : mode === 'create'
                  ? '공유 올리기'
                  : '수정 완료'}
        </Button>
      </StepFooter>
    </form>
  )
}

/** 태그 — 쓰고 Enter(또는 쉼표)로 넣는다. 5개까지 · 한 개에 15자, 같은 태그는 한 번만 */
function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [text, setText] = useState('')
  const full = tags.length >= TAGS_MAX

  function commit() {
    const tag = text.replace(/^#/, '').trim()
    if (!tag || full) return
    if (!tags.includes(tag)) onChange([...tags, tag])
    setText('')
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    // 한글 조합 중 Enter는 글자 확정이라 넘긴다
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && text === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div>
      {tags.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag} className="flex items-center gap-1 rounded-md bg-brand-soft py-1 pr-1 pl-2 text-sm text-brand-text">
              #{tag}
              <button
                type="button"
                aria-label={`${tag} 태그 빼기`}
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                className="flex size-5 items-center justify-center rounded hover:bg-background/50"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id="share-tag"
          maxLength={TAG_MAX}
          disabled={full}
          placeholder={full ? `태그는 ${TAGS_MAX}개까지예요` : '예) 혼밥'}
          className="h-11 bg-card"
          value={text}
          onChange={(e) => setText(e.target.value.replace(',', ''))}
          onKeyDown={handleKey}
          // 다른 칸으로 넘어가면 쓰던 태그도 넣는다
          onBlur={commit}
        />
        <Button type="button" variant="secondary" className="h-11 shrink-0" disabled={full || !text.trim()} onClick={commit}>
          추가
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">검색에 쓰여요. 쓰고 Enter를 누르면 들어가요.</p>
    </div>
  )
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-xs text-destructive" role="alert">
      {children}
    </p>
  )
}
