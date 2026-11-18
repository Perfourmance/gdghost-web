import type { TagsResponse } from '@/features/tags/useTags'

// ③-2 답할 수 있는 것의 개수 · 글자 제한 (백엔드 TagService · 기능명세 입력 규칙)
export const MAX_INTERESTS = 4
export const MAX_SKILLS_PER_INTEREST = 3
export const MAX_EXPERIENCES = 6
export const STATUS_NOTE_MAX = 60
export const BIO_MAX = 120

/** 관심 분야 · 세부 기술 고른 것 */
export interface InterestSelection {
  interestTagIds: number[]
  skillTagIds: number[]
}

export function toggleId(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}

export function sortedInterests(tags: TagsResponse) {
  return [...tags.interests].sort((a, b) => a.sortOrder - b.sortOrder)
}

/** 분야 켜고 끄기 — 4개가 차면 더 켜지 않고, 끄면 그 분야의 세부 기술도 같이 뺀다 */
export function toggleInterestSelection(interests: TagsResponse['interests'], value: InterestSelection, id: number): InterestSelection {
  if (value.interestTagIds.includes(id)) {
    const skillIds = new Set(interests.find((i) => i.id === id)?.skills.map((s) => s.id))
    return {
      interestTagIds: value.interestTagIds.filter((x) => x !== id),
      skillTagIds: value.skillTagIds.filter((x) => !skillIds.has(x)),
    }
  }
  if (value.interestTagIds.length >= MAX_INTERESTS) return value
  return { ...value, interestTagIds: [...value.interestTagIds, id] }
}

/** 경험 태그를 묶음(취업·커리어 · 학업 · 활동)별로, 서버 순서대로 */
export function groupExperiences(tags: TagsResponse): [string, TagsResponse['experiences']][] {
  const map = new Map<string, TagsResponse['experiences']>()
  for (const tag of tags.experiences) map.set(tag.groupName, [...(map.get(tag.groupName) ?? []), tag])
  return [...map.entries()]
}
