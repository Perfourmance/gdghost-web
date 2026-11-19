import { useRef, useState } from 'react'
import { IconImage, IconX } from '@/components/story'
import { MAX_PHOTOS } from '@/features/uploads/api'
import type { usePhotoUploads } from '@/features/uploads/usePhotoUploads'
import { cn } from '@/lib/utils'

/** 폴라로이드 사진 칸 (fwrite-final) — 빨랫줄 아래 3칸, 첫 빈칸이 '사진 걸기'. 상태는 usePhotoUploads가 들고 있다 */
export function PolaroidPicker({ uploads, disabled = false }: { uploads: ReturnType<typeof usePhotoUploads>; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [overflow, setOverflow] = useState(false)
  const { photos, add, remove, full } = uploads
  const empties = Math.max(0, MAX_PHOTOS - photos.length - (full ? 0 : 1))
  const badPhoto = photos.find((p) => p.error)

  return (
    <div>
      <div className="gh-slots">
        {photos.map((photo, i) => (
          <div key={photo.id} className="gh-slot is-photo">
            <i className="gh-pin" aria-hidden />
            <div className="gh-in">
              <img src={photo.previewUrl} alt={`사진 ${i + 1}`} />
              {photo.objectKey == null && photo.prepared == null && photo.error == null && <span className="gh-state">준비 중…</span>}
              {photo.error && <span className="gh-state">열 수 없는 사진</span>}
            </div>
            <button type="button" className="gh-x" disabled={disabled} aria-label={`사진 ${i + 1} 빼기`} onClick={() => remove(photo.id)}>
              <IconX />
            </button>
          </div>
        ))}
        {!full && (
          <button type="button" className="gh-slot is-add" disabled={disabled} onClick={() => inputRef.current?.click()}>
            <i className="gh-pin" aria-hidden />
            <span className="gh-in">
              <IconImage />
              사진 걸기
            </span>
          </button>
        )}
        {Array.from({ length: empties }, (_, i) => (
          <div key={`empty-${i}`} className="gh-slot is-empty" aria-hidden>
            <i className="gh-pin" />
            <div className="gh-in" />
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        // image/heic를 적지 않아야 아이폰이 고를 때 HEIC를 JPEG로 바꿔서 넘겨준다
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) setOverflow(add(e.target.files))
          // 같은 사진을 뺐다가 다시 고를 수 있게
          e.target.value = ''
        }}
      />

      {badPhoto ? (
        <p className="gh-phn is-bad" role="alert">
          {badPhoto.error} 그 사진을 빼고 다시 골라 주세요.
        </p>
      ) : overflow ? (
        <p className="gh-phn">사진은 {MAX_PHOTOS}장까지 걸 수 있어요.</p>
      ) : (
        <p className={cn('gh-phn')}>사진은 위치 정보를 지우고 용량을 줄여서 걸어요.</p>
      )}
    </div>
  )
}
