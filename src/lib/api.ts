import axios, { isAxiosError } from 'axios'

// 모든 API는 상대 경로로 부른다 (Vite 프록시 → 8080). 같은 주소라 쿠키 · CSRF가 그대로 동작한다
export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  // 쓰기 요청에 XSRF-TOKEN 쿠키 값을 X-XSRF-TOKEN 헤더로 붙인다 (axios 기본값을 명시)
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

/** 만드는 POST에 붙일 멱등 키. 한 번의 제출 = 한 키, 재시도 때는 같은 키를 다시 쓴다 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID()
}

export function idempotencyHeader(key: string) {
  return { 'Idempotency-Key': key }
}

export interface FieldError {
  field: string
  message: string
}

/** 백엔드 Problem JSON(RFC 7807 + code)을 화면에서 쓰기 좋게 정리한 에러 */
export class ApiError extends Error {
  /** HTTP 상태. 서버에 닿지 못했으면 0 */
  readonly status: number
  /** 백엔드 에러 코드(예: NOT_AUTHOR). 화면 분기는 이 값으로 한다 */
  readonly code: string
  readonly fieldErrors: FieldError[]
  /** 429일 때 다시 시도까지 기다릴 초 */
  readonly retryAfter: number | null

  constructor(status: number, code: string, message: string, fieldErrors: FieldError[] = [], retryAfter: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.retryAfter = retryAfter
  }

  /** 입력칸 이름으로 그 칸의 에러 문구를 찾는다 */
  fieldMessage(field: string): string | undefined {
    return this.fieldErrors.find((e) => e.field === field)?.message
  }
}

export const NETWORK_ERROR = 'NETWORK_ERROR'
export const UNKNOWN_ERROR = 'UNKNOWN_ERROR'

interface ProblemBody {
  code?: unknown
  detail?: unknown
  title?: unknown
  errors?: unknown
}

function isFieldError(value: unknown): value is FieldError {
  return typeof value === 'object' && value !== null && typeof (value as FieldError).field === 'string'
}

/** 어떤 에러든 ApiError로 바꾼다 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (!isAxiosError(error)) {
    return new ApiError(0, UNKNOWN_ERROR, '알 수 없는 오류가 났어요')
  }
  if (!error.response) {
    return new ApiError(0, NETWORK_ERROR, '서버에 연결하지 못했어요')
  }

  const { status, data, headers } = error.response
  const body: ProblemBody = typeof data === 'object' && data !== null ? data : {}
  const code = typeof body.code === 'string' ? body.code : UNKNOWN_ERROR
  const message =
    typeof body.detail === 'string' ? body.detail : typeof body.title === 'string' ? body.title : '요청을 처리하지 못했어요'
  const fieldErrors = Array.isArray(body.errors) ? body.errors.filter(isFieldError) : []
  const retryHeader = Number(headers['retry-after'])
  const retryAfter = Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : null

  return new ApiError(status, code, message, fieldErrors, retryAfter)
}

// 응답 에러를 모두 ApiError로 바꿔서 던진다 → 화면에서는 error.code만 보면 된다
api.interceptors.response.use(undefined, (error: unknown) => Promise.reject(toApiError(error)))
