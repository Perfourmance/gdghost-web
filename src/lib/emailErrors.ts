import type { ApiError } from '@/lib/api'
import { commonErrorMessage, formatWait } from '@/lib/errorMessage'

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 메일 발송 · 인증번호 확인 공통 에러 문구. 남은 횟수처럼 서버 문구에 정보가 있는 건 서버 문구를 쓴다 */
export function emailCodeErrorMessage(e: ApiError): string {
  switch (e.code) {
    case 'EMAIL_RESEND_TOO_SOON':
      return `${formatWait(e.retryAfter ?? 60)} 뒤에 다시 보낼 수 있어요.`
    case 'EMAIL_DAILY_LIMIT':
    case 'VERIFICATION_CODE_INVALID':
    case 'VERIFICATION_CODE_EXPIRED':
      return e.message
    case 'VALIDATION_FAILED':
      return e.fieldMessage('code') ? '인증번호는 숫자 6자리예요.' : '이메일 형식을 확인해 주세요.'
    default:
      return commonErrorMessage(e)
  }
}
