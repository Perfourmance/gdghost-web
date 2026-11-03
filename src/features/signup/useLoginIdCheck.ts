import { useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { api } from '@/lib/api'

export type LoginIdCheck =
  | { state: 'empty' | 'checking' | 'available' | 'error' }
  | { state: 'invalid'; message: string }

export const LOGIN_ID_PATTERN = /^[A-Za-z0-9]{4,16}$/

/** 입력이 0.5초 멈추면 사용 가능 여부를 확인한다. 대소문자만 다른 아이디도 쓰는 것으로 본다(서버) */
export function useLoginIdCheck(loginId: string): LoginIdCheck {
  const value = loginId.trim()
  const debounced = useDebouncedValue(value)
  const valid = LOGIN_ID_PATTERN.test(value)
  const ready = debounced === value && valid

  const query = useQuery({
    queryKey: ['login-id-availability', debounced],
    queryFn: async () =>
      (await api.get<{ available: boolean }>('/auth/login-ids/availability', { params: { loginId: debounced } })).data,
    enabled: ready,
    staleTime: 10_000,
  })

  if (value === '') return { state: 'empty' }
  if (!valid) return { state: 'invalid', message: '영문 · 숫자 4–16자로 정해 주세요.' }
  if (!ready || query.isPending) return { state: 'checking' }
  if (query.isError) return { state: 'error' }
  return query.data.available ? { state: 'available' } : { state: 'invalid', message: '이미 쓰는 아이디예요.' }
}
