import { useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { api } from '@/lib/api'

export type NicknameCheck =
  | { state: 'empty' | 'checking' | 'available' | 'error' }
  | { state: 'invalid'; message: string }

interface AvailabilityResponse {
  available: boolean
  reason: 'TAKEN' | 'RESERVED' | null
}

/** 화면에서 먼저 거르는 닉네임 규칙 (서버와 같음: 2–12자, '익명' 시작 금지) */
export function nicknameRuleError(nickname: string): string | null {
  const trimmed = nickname.trim()
  if (trimmed.length < 2 || trimmed.length > 12) return '닉네임은 2–12자예요.'
  if (trimmed.startsWith('익명')) return "'익명'으로 시작하는 닉네임은 쓸 수 없어요."
  return null
}

/** 입력이 0.5초 멈추면 사용 가능 여부를 확인한다 */
export function useNicknameCheck(nickname: string): NicknameCheck {
  const trimmed = nickname.trim()
  const debounced = useDebouncedValue(trimmed)
  const ruleError = trimmed === '' ? null : nicknameRuleError(trimmed)
  const ready = debounced === trimmed && trimmed !== '' && ruleError == null

  const query = useQuery({
    queryKey: ['nickname-availability', debounced],
    queryFn: async () =>
      (await api.get<AvailabilityResponse>('/auth/nicknames/availability', { params: { nickname: debounced } })).data,
    enabled: ready,
    staleTime: 10_000,
  })

  if (trimmed === '') return { state: 'empty' }
  if (ruleError) return { state: 'invalid', message: ruleError }
  if (!ready || query.isPending) return { state: 'checking' }
  if (query.isError) return { state: 'error' }
  if (query.data.available) return { state: 'available' }
  return {
    state: 'invalid',
    message:
      query.data.reason === 'RESERVED' ? "'익명'으로 시작하는 닉네임은 쓸 수 없어요." : '이미 쓰는 닉네임이에요.',
  }
}
