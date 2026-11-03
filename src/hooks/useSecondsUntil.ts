import { useEffect, useState } from 'react'

/** target 시각(ms)까지 남은 초. 1초마다 줄고 0이 되면 멈춘다. target이 null이면 0 */
export function useSecondsUntil(target: number | null): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (target == null) return
    let intervalId = 0
    const tick = () => {
      const current = Date.now()
      setNow(current)
      if (current >= target) window.clearInterval(intervalId)
    }
    const firstId = window.setTimeout(tick, 0)
    intervalId = window.setInterval(tick, 1000)
    return () => {
      window.clearTimeout(firstId)
      window.clearInterval(intervalId)
    }
  }, [target])

  return target == null ? 0 : Math.max(0, Math.ceil((target - now) / 1000))
}
