// 백엔드 enum → 화면 이름. 모르는 값은 '기타' (인계 문서 5장)

export type Position = 'DEV' | 'AI' | 'DESIGN' | 'ETC'
export type MemberStatus = 'ENROLLED' | 'LEAVE' | 'GRADUATED'

// 포지션은 영어로 보여 준다 (2026-11-03 사용자 결정). ETC는 화면에서 OTHER
export const POSITIONS: { value: Position; label: string }[] = [
  { value: 'DEV', label: 'DEV' },
  { value: 'AI', label: 'AI' },
  { value: 'DESIGN', label: 'DESIGN' },
  { value: 'ETC', label: 'OTHER' },
]

export const MEMBER_STATUSES: { value: MemberStatus; label: string }[] = [
  { value: 'ENROLLED', label: '재학' },
  { value: 'LEAVE', label: '휴학' },
  { value: 'GRADUATED', label: '졸업' },
]

export function positionLabel(value: string): string {
  return POSITIONS.find((p) => p.value === value)?.label ?? 'OTHER'
}

export function memberStatusLabel(value: string): string {
  return MEMBER_STATUSES.find((s) => s.value === value)?.label ?? '기타'
}
