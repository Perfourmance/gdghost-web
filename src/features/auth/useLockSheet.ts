import { useCallback, useState } from 'react'

/** 잠금 안내를 여닫는 상태. open(돌아올 주소)로 연다 */
export function useLockSheet() {
  const [next, setNext] = useState<string | null>(null)
  const open = useCallback((path: string) => setNext(path), [])
  const close = useCallback(() => setNext(null), [])
  return { next, open, close }
}
