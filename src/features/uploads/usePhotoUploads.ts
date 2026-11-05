import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_PHOTOS, uploadPhotos, type UploadPurpose } from '@/features/uploads/api'
import { ImageError, prepareImage, type PreparedImage } from '@/lib/image'

export interface PickedPhoto {
  id: string
  /** 미리보기 주소 (새 사진은 blob:, 이미 올린 사진은 서명 주소) */
  previewUrl: string
  /** 다듬는 중이면 null */
  prepared: PreparedImage | null
  /** 올린 뒤(또는 수정 화면의 기존 사진) 키 */
  objectKey: string | null
  error: string | null
}

/** 수정 화면에서 이미 붙어 있는 사진 */
export interface ExistingPhoto {
  objectKey: string
  url: string
}

// 화면 안에서만 쓰는 구분용 번호. crypto.randomUUID는 HTTPS · localhost에서만 있어서 쓰지 않는다
let nextPhotoId = 0
const newPhotoId = () => `photo-${++nextPhotoId}`

/**
 * 사진 고르기 상태. 고를 때 EXIF를 지우고 줄여 두고, 글을 저장할 때 uploadAll()로 올린다
 * (고르기만 하고 그만둔 사진이 하루 30장 한도를 쓰지 않게). 한 번 올린 사진은 다시 올리지 않는다
 */
export function usePhotoUploads(purpose: UploadPurpose, initial: ExistingPhoto[] = []) {
  const [photos, setPhotos] = useState<PickedPhoto[]>(() =>
    initial.map((p) => ({ id: p.objectKey, previewUrl: p.url, prepared: null, objectKey: p.objectKey, error: null })),
  )
  // 이벤트 · 업로드 함수가 지금 목록을 읽도록
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  // 화면을 떠날 때 미리보기 주소를 정리
  useEffect(
    () => () => {
      for (const p of photosRef.current) if (p.previewUrl.startsWith('blob:')) URL.revokeObjectURL(p.previewUrl)
    },
    [],
  )

  const update = (id: string, patch: Partial<PickedPhoto>) =>
    setPhotos((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const add = useCallback((files: FileList | File[]) => {
    const room = MAX_PHOTOS - photosRef.current.length
    const picked = Array.from(files).slice(0, Math.max(0, room))
    const added = picked.map((file) => ({
      id: newPhotoId(),
      previewUrl: URL.createObjectURL(file),
      prepared: null,
      objectKey: null,
      error: null,
      file,
    }))
    setPhotos((list) => [...list, ...added.map(({ file: _file, ...p }) => p)])
    for (const { id, file } of added) {
      prepareImage(file)
        .then((prepared) => {
          // 미리보기를 다듬은 사진으로 바꾼다 — 올라갈 모습 그대로, 원본(HEIC 등)을 못 그리는 브라우저에서도 보이게
          const previewUrl = URL.createObjectURL(prepared.blob)
          setPhotos((list) =>
            list.map((p) => {
              if (p.id !== id) return p
              URL.revokeObjectURL(p.previewUrl)
              return { ...p, prepared, previewUrl }
            }),
          )
        })
        .catch((e: unknown) =>
          update(id, { error: e instanceof ImageError ? e.message : '사진을 처리하지 못했어요.' }),
        )
    }
    return Array.from(files).length > picked.length
  }, [])

  const remove = useCallback((id: string) => {
    setPhotos((list) => {
      const target = list.find((p) => p.id === id)
      if (target?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(target.previewUrl)
      return list.filter((p) => p.id !== id)
    })
  }, [])

  /** 아직 안 올린 사진을 올리고, 모든 사진의 키를 화면 순서대로 돌려준다. 실패하면 ApiError를 던진다 */
  const uploadAll = useCallback(async (): Promise<string[]> => {
    const list = photosRef.current
    const pending = list.filter((p) => p.objectKey == null && p.prepared != null)
    const keys = await uploadPhotos(
      purpose,
      pending.map((p) => p.prepared!),
    )
    const byId = new Map(pending.map((p, i) => [p.id, keys[i]]))
    setPhotos((current) => current.map((p) => (byId.has(p.id) ? { ...p, objectKey: byId.get(p.id)! } : p)))
    return list.map((p) => p.objectKey ?? byId.get(p.id)).filter((k): k is string => k != null)
  }, [purpose])

  return {
    photos,
    add,
    remove,
    uploadAll,
    /** 다듬는 중인 사진이 있으면 저장을 막는다 */
    preparing: photos.some((p) => p.objectKey == null && p.prepared == null && p.error == null),
    /** 열 수 없는 사진이 있으면 빼야 저장할 수 있다 */
    hasError: photos.some((p) => p.error != null),
    full: photos.length >= MAX_PHOTOS,
  }
}
