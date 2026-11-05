import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { MAX_PHOTOS } from '@/features/uploads/api'
import type { usePhotoUploads } from '@/features/uploads/usePhotoUploads'

/** 사진 고르기 — 3장까지, 미리보기 · 빼기. 상태는 usePhotoUploads로 화면이 들고 있는다 */
export function PhotoPicker({
  uploads,
  disabled = false,
}: {
  uploads: ReturnType<typeof usePhotoUploads>
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [overflow, setOverflow] = useState(false)
  const { photos, add, remove, full } = uploads

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {photos.map((photo, i) => (
          <div key={photo.id} className="relative size-24 overflow-hidden rounded-lg bg-muted">
            <img src={photo.previewUrl} alt={`사진 ${i + 1}`} className="size-full object-cover" />
            {photo.objectKey == null && photo.prepared == null && photo.error == null && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40" aria-label="사진 준비 중">
                <Loader2 className="size-5 animate-spin text-white" />
              </span>
            )}
            {photo.error && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/60 px-1 text-center text-[11px] text-white">
                열 수 없는 사진
              </span>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => remove(photo.id)}
              aria-label={`사진 ${i + 1} 빼기`}
              className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-50"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {!full && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex size-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            <ImagePlus className="size-5" aria-hidden />
            사진 {photos.length} / {MAX_PHOTOS}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        // image/heic를 적지 않아야 아이폰이 고를 때 HEIC를 JPEG로 바꿔서 넘겨준다.
        // PC로 옮긴 HEIC 파일은 브라우저가 못 열면 prepareImage가 안내 문구를 띄운다
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) setOverflow(add(e.target.files))
          // 같은 사진을 뺐다가 다시 고를 수 있게
          e.target.value = ''
        }}
      />

      {photos.some((p) => p.error) && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {photos.find((p) => p.error)?.error} 그 사진을 빼고 다시 골라 주세요.
        </p>
      )}
      {overflow && <p className="mt-2 text-xs text-muted-foreground">사진은 {MAX_PHOTOS}장까지 올릴 수 있어요.</p>}
      <p className="mt-2 text-xs text-muted-foreground">위치 정보는 지우고 크기를 줄여서 올려요.</p>
    </div>
  )
}
