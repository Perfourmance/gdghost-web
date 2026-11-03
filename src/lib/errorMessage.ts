import { NETWORK_ERROR, type ApiError } from '@/lib/api'

/** 남은 초를 "N초" · "N분"으로 */
export function formatWait(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.ceil(seconds))}초`
  return `${Math.ceil(seconds / 60)}분`
}

/** 화면마다 따로 정하지 않은 에러의 공통 문구 */
export function commonErrorMessage(error: ApiError): string {
  if (error.code === NETWORK_ERROR) return '서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.'
  if (error.status === 429) {
    return error.retryAfter
      ? `요청이 너무 많아요. ${formatWait(error.retryAfter)} 뒤에 다시 시도해 주세요.`
      : '요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요.'
  }
  return '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.'
}
