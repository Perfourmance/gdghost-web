// ③-2 답할 수 있는 것의 개수 · 글자 제한 (백엔드 TagService · 기능명세 입력 규칙)
export const MAX_INTERESTS = 4
export const MAX_SKILLS_PER_INTEREST = 3
export const MAX_EXPERIENCES = 6
export const STATUS_NOTE_MAX = 60
export const BIO_MAX = 120

export function toggleId(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}
