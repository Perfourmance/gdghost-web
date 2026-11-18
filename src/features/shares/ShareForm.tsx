import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { FieldError, Hint, IconX, LinedTextarea, PaperChips, PaperInput, PaperLabel, TitleInput, WriteForm } from '@/components/story'
import { SHARE_CATEGORY_KEYS, shareCategoryLabel } from '@/features/content/labels'
import { BODY_MAX, BODY_MIN, TAG_MAX, TAGS_MAX, TITLE_MAX, TITLE_MIN } from '@/features/shares/api'
import { MAX_PHOTOS, uploadErrorMessage } from '@/features/uploads/api'
import { PolaroidPicker } from '@/features/uploads/PolaroidPicker'
import { usePhotoUploads, type ExistingPhoto } from '@/features/uploads/usePhotoUploads'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'
import { toApiError, type ApiError } from '@/lib/api'
import '@/styles/feed.css'

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
    mode === 'create' ? '공유 작성을 그만둘까요? 입력한 내용은 저장되지 않아요.' : '수정을 그만둘까요? 변경 사항은 저장되지 않아요.',
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
    <WriteForm
      title={mode === 'create' ? '책갈피 꽂기' : '책갈피 고치기'}
      description="직접 겪어 본 걸 마을 책장에 꽂아요."
      submitLabel={mode === 'create' ? '책장에 꽂기' : '고친 책갈피 저장'}
      pendingLabel={uploading ? '사진 올리는 중…' : uploads.preparing ? '사진 준비 중…' : '저장하는 중…'}
      pending={busy}
      disabled={uploads.preparing || (mode === 'edit' && !changed)}
      error={uploadError ?? formError}
      onSubmit={handleSubmit}
    >
      <PaperLabel aside="하나 골라 주세요">어느 칸에 꽂을까요?</PaperLabel>
      <PaperChips
        label="분류"
        options={SHARE_CATEGORY_KEYS.map((c) => ({ value: c, label: shareCategoryLabel(c) }))}
        isOn={(c) => values.category === c}
        onToggle={(c) => set({ category: c })}
      />
      <FieldError>{categoryError}</FieldError>

      <PaperLabel htmlFor="share-title" aside={`${values.title.length} / ${TITLE_MAX}`}>
        제목
      </PaperLabel>
      <TitleInput
        id="share-title"
        rows={1}
        maxLength={TITLE_MAX}
        placeholder="예: 학교 앞 혼밥하기 좋은 곳"
        aria-invalid={titleError ? true : undefined}
        value={values.title}
        onChange={(e) => set({ title: e.target.value.replace(/\n/g, ' ') })}
      />
      <FieldError>{titleError}</FieldError>

      <PaperLabel htmlFor="share-body" aside={`${values.body.length} / ${BODY_MAX}`}>
        본문
      </PaperLabel>
      <LinedTextarea
        id="share-body"
        maxLength={BODY_MAX}
        placeholder="직접 겪어 본 내용을 적어 주세요. 링크도 넣을 수 있어요."
        aria-invalid={bodyError ? true : undefined}
        value={values.body}
        onChange={(e) => set({ body: e.target.value })}
      />
      <FieldError>{bodyError}</FieldError>

      <PaperLabel htmlFor="share-tag" aside={`선택 · ${values.tags.length} / ${TAGS_MAX}`}>
        태그
      </PaperLabel>
      <TagInput tags={values.tags} onChange={(tags) => set({ tags })} />

      <PaperLabel aside={`선택 · ${uploads.photos.length} / ${MAX_PHOTOS}`}>사진</PaperLabel>
      <PolaroidPicker uploads={uploads} disabled={busy} />
    </WriteForm>
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
        <ul className="gh-tags-in">
          {tags.map((tag) => (
            <li key={tag}>
              #{tag}
              <button type="button" aria-label={`${tag} 태그 빼기`} onClick={() => onChange(tags.filter((t) => t !== tag))}>
                <IconX />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="gh-tag-row">
        <PaperInput
          id="share-tag"
          maxLength={TAG_MAX}
          disabled={full}
          placeholder={full ? `태그는 ${TAGS_MAX}개까지예요` : '예: 혼밥'}
          value={text}
          onChange={(e) => setText(e.target.value.replace(',', ''))}
          onKeyDown={handleKey}
          // 다른 칸으로 넘어가면 쓰던 태그도 넣는다
          onBlur={commit}
        />
        <button type="button" disabled={full || !text.trim()} onClick={commit}>
          추가
        </button>
      </div>
      <Hint>태그를 쓰고 Enter를 누르면 검색에 쓰여요.</Hint>
    </div>
  )
}
