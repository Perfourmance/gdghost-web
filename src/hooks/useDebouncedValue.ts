import { useEffect, useState } from 'react'

/** 입력이 delay(ms) 동안 멈추면 그 값을 돌려준다 */
export function useDebouncedValue<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])

  return debounced
}
