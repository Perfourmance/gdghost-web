import { useCallback, useRef } from 'react'
import { newIdempotencyKey } from '@/lib/api'

/**
 * 만드는 POST의 멱등 키. 한 번의 제출 = 한 키 —
 * 같은 내용으로 다시 보내면 같은 키, 내용을 고치면 새 키 (인계 문서 5장)
 */
export function useIdempotencyKey() {
  const last = useRef<{ key: string; payload: string } | null>(null)
  return useCallback((payload: unknown) => {
    const serialized = JSON.stringify(payload)
    if (last.current?.payload !== serialized) {
      last.current = { key: newIdempotencyKey(), payload: serialized }
    }
    return last.current.key
  }, [])
}
