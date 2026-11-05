import { useEffect, useState } from 'react'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** "방금 전 · 10분 전 · 3시간 전 · 2일 전", 일주일이 넘으면 "11.3" */
export function formatRelative(iso: string, now: number): string {
  const time = Date.parse(iso)
  const diff = Math.max(0, now - time) / 1000
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}일 전`
  const d = new Date(time)
  return `${d.getMonth() + 1}.${d.getDate()}`
}

/** 날짜만 있는 값("2026-11-06") → "11.6(금)" */
export function formatDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const day = new Date(y, m - 1, d).getDay()
  return `${m}.${d}(${WEEKDAYS[day]})`
}

/** 시작 ~ 끝 날짜. 끝이 없거나 같으면 하루 */
export function formatDayRange(start: string, end: string | null): string {
  return end && end !== start ? `${formatDay(start)} – ${formatDay(end)}` : formatDay(start)
}

/** 시각(ISO) → "12월 5일" (다음 변경 가능일 안내 등) */
export function formatMonthDay(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

/** 1분마다 바뀌는 현재 시각 — "N분 전" 표시가 저절로 갱신되게 */
export function useNowEveryMinute(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

/** 시각(ISO) → "2026.11.5" (운영 화면). 없으면 "-" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}
