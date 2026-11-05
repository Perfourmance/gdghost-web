import type { NoticeAuthor } from '@/features/notices/api'
import { formatDay } from '@/lib/time'

/** 오늘(한국 날짜) "2026-11-05" — 마감일과 비교한다 */
function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
}

export function isOverdue(dueDate: string | null): boolean {
  return dueDate != null && dueDate < todayKst()
}

/** "11.6(금)까지", 지났으면 "마감 지남 · 11.6(금)" */
export function dueText(dueDate: string): string {
  return isOverdue(dueDate) ? `마감 지남 · ${formatDay(dueDate)}` : `${formatDay(dueDate)}까지`
}

/** "닉네임 · 직함" — 공지는 운영진이 쓰므로 직함을 붙인다 */
export function noticeAuthorText(author: NoticeAuthor): string {
  if (author.withdrawn) return '탈퇴한 부원'
  return author.staffTitle ? `${author.nickname} · ${author.staffTitle}` : author.nickname
}
