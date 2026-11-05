// 캘린더 날짜 계산. 날짜는 모두 한국 날짜 문자열("2026-11-05")로 다룬다 (서버도 한국 날짜)

/** 오늘(한국) "2026-11-05" */
export function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
}

const pad = (n: number) => String(n).padStart(2, '0')

export function ymd(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

/** "2026-11" → { year, month } (잘못된 값이면 null) */
export function parseMonth(value: string | null): { year: number; month: number } | null {
  const match = value?.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  return month >= 1 && month <= 12 ? { year, month } : null
}

export function monthKey(year: number, month: number): string {
  return `${year}-${pad(month)}`
}

export function addMonths(year: number, month: number, diff: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + diff
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** 달력 칸 — 앞뒤 달의 날짜는 null (일요일 시작) */
export function monthCells(year: number, month: number): (string | null)[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const count = daysInMonth(year, month)
  const cells: (string | null)[] = Array.from({ length: firstWeekday }, () => null)
  for (let day = 1; day <= count; day++) cells.push(ymd(year, month, day))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** 그 날짜에 걸치는 일정인지 (기간 일정 포함) */
export function coversDay(item: { startDate: string; endDate: string | null }, day: string): boolean {
  return item.startDate <= day && (item.endDate ?? item.startDate) >= day
}
