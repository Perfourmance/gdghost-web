// 모집 시각. 서버는 UTC 시각(Instant)을 주고받고, 화면은 한국 시각으로 보여 준다

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function kstParts(iso: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') }
}

/** "11.6(금) 오후 7:00" */
export function formatMeetAt(iso: string): string {
  const { year, month, day, hour, minute } = kstParts(iso)
  const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()]
  const half = hour < 12 ? '오전' : '오후'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${month}.${day}(${weekday}) ${half} ${hour12}:${String(minute).padStart(2, '0')}`
}

/** 날짜 칸 "2026-11-06" + 시간 칸 "19:00"(한국 시각) → ISO 시각 */
export function kstToIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00+09:00`).toISOString()
}
