import { api, ApiError, type ApiError as ApiErrorType } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'
import type { PreparedImage } from '@/lib/image'

// 사진 업로드 (백엔드 UploadController). 주소를 받고 브라우저가 R2에 직접 PUT한다.
// 받은 objectKey를 글 작성 · 수정 요청에 넣으면 서버가 연결한다. 연결하지 않은 사진은 하루 뒤 지워진다

/** SHARE 공유 · FEED 피드 · CERT 이벤트 인증 */
export type UploadPurpose = 'SHARE' | 'FEED' | 'CERT'

export const MAX_PHOTOS = 3

interface PresignItem {
  objectKey: string
  uploadUrl: string
  method: string
  headers: Record<string, string>
  expiresAt: string
}

/** R2 PUT 실패 — 서버 에러가 아니라 저장소(네트워크 · CORS · 서명 만료) 문제 */
export const UPLOAD_PUT_FAILED = 'UPLOAD_PUT_FAILED'

/** 다듬은 사진들을 올리고 objectKey를 같은 순서로 돌려준다 (한 번에 3장까지) */
export async function uploadPhotos(purpose: UploadPurpose, images: PreparedImage[]): Promise<string[]> {
  if (images.length === 0) return []
  const { data } = await api.post<{ items: PresignItem[] }>('/uploads/presigned-urls', {
    purpose,
    files: images.map((image) => ({ contentType: image.type, size: image.blob.size })),
  })
  await Promise.all(
    data.items.map(async (item, i) => {
      // 우리 서버가 아니라 R2로 보내므로 axios(쿠키 · XSRF 헤더) 대신 fetch. 크기는 신청한 값과 같아야 한다
      let response: Response
      try {
        response = await fetch(item.uploadUrl, { method: item.method, headers: item.headers, body: images[i].blob })
      } catch {
        throw new ApiError(0, UPLOAD_PUT_FAILED, '사진을 올리지 못했어요')
      }
      if (!response.ok) throw new ApiError(response.status, UPLOAD_PUT_FAILED, '사진을 올리지 못했어요')
    }),
  )
  return data.items.map((item) => item.objectKey)
}

export function uploadErrorMessage(error: ApiErrorType): string {
  switch (error.code) {
    case UPLOAD_PUT_FAILED:
      return '사진을 올리지 못했어요. 잠시 뒤 다시 시도해 주세요.'
    case 'UPLOAD_TYPE_NOT_ALLOWED':
      return 'JPEG · PNG · WebP 사진만 올릴 수 있어요.'
    case 'UPLOAD_TOO_LARGE':
      return '사진은 한 장에 1MB까지 올릴 수 있어요.'
    case 'UPLOAD_NOT_FOUND':
      return '사진 올리기가 끝나지 않았어요. 사진을 다시 골라 주세요.'
    default:
      // 분당 20장 · 하루 30장. 기다릴 시간이 길면 하루 한도
      if (error.status === 429 && (error.retryAfter ?? 0) > 600) {
        return '오늘 올릴 수 있는 사진 수(30장)를 넘었어요. 내일 다시 시도해 주세요.'
      }
      return commonErrorMessage(error)
  }
}
