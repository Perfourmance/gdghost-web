// 사진을 올리기 전에 다듬는다 (기능명세 입력 규칙 · 인계 문서 5장).
// 캔버스에 다시 그리면 EXIF(GPS 등)가 모두 빠진다. 긴 쪽을 줄이고 1MB 이하가 될 때까지 압축한다

export const MAX_UPLOAD_BYTES = 1024 * 1024
const MAX_SIDE = 1600
const QUALITIES = [0.85, 0.75, 0.65, 0.55]

export class ImageError extends Error {}

export interface PreparedImage {
  blob: Blob
  /** image/webp 또는 image/jpeg */
  type: string
  width: number
  height: number
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/** 사진 한 장 → EXIF 없는 WebP(안 되는 브라우저는 JPEG), 긴 쪽 1600px 이하, 1MB 이하 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  let bitmap: ImageBitmap
  try {
    // 휴대폰 사진의 회전 정보는 지우기 전에 그림에 반영한다
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // 아이폰 사진(HEIC)을 PC로 옮겨 Chrome 등에서 고른 경우. 아이폰에서 바로 고르면 JPEG로 넘어와 여기 오지 않는다
    if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
      throw new ImageError('이 브라우저에서는 HEIC 사진을 열 수 없어요. 휴대폰에서 바로 올리거나 JPEG로 바꿔서 골라 주세요.')
    }
    throw new ImageError('이 사진은 열 수 없어요. JPEG · PNG · WebP 사진을 골라 주세요.')
  }

  let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  try {
    // 그래도 크면 크기를 조금씩 줄여 다시 시도
    for (let attempt = 0; attempt < 4; attempt++) {
      const width = Math.max(1, Math.round(bitmap.width * scale))
      const height = Math.max(1, Math.round(bitmap.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new ImageError('사진을 처리하지 못했어요.')
      // 투명한 PNG가 JPEG로 바뀔 때 검게 되지 않게
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, width, height)
      context.drawImage(bitmap, 0, 0, width, height)

      for (const quality of QUALITIES) {
        let blob = await toBlob(canvas, 'image/webp', quality)
        // WebP로 못 만드는 브라우저(일부 Safari)는 PNG를 돌려준다 → JPEG로
        if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality)
        if (!blob) throw new ImageError('사진을 처리하지 못했어요.')
        if (blob.size <= MAX_UPLOAD_BYTES) return { blob, type: blob.type, width, height }
      }
      scale *= 0.75
    }
  } finally {
    bitmap.close()
  }
  throw new ImageError('사진이 너무 커요. 다른 사진을 골라 주세요.')
}
