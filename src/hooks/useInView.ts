import { useEffect, useState } from 'react'

/**
 * 요소가 화면에 들어왔는지 — 무한 스크롤의 바닥 표시에 쓴다.
 * ref를 콜백으로 받아, 요소가 나중에 그려져도(첫 페이지를 받은 뒤) 그때부터 지켜본다
 */
export function useInView<T extends Element>(rootMargin = '200px') {
  const [el, setEl] = useState<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin })
    observer.observe(el)
    return () => {
      observer.disconnect()
      setInView(false)
    }
  }, [el, rootMargin])

  return { ref: setEl, inView }
}
