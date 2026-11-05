import { useMemo } from 'react'
import { Chip } from '@/components/Chip'
import { FieldLabel } from '@/components/form/StepLayout'
import { MAX_EXPERIENCES, MAX_INTERESTS, MAX_SKILLS_PER_INTEREST, toggleId } from '@/features/signup/answerableRules'
import type { TagsResponse } from '@/features/tags/useTags'

// 관심 분야 · 세부 기술 · 경험 고르기 — 가입(③-2)과 프로필 수정에서 같이 쓴다

export interface InterestSelection {
  interestTagIds: number[]
  skillTagIds: number[]
}

/** 관심 분야 1–4개 + 분야마다 세부 기술 3개까지. 분야를 빼면 그 분야의 세부 기술도 같이 뺀다 */
export function InterestPicker({
  tags,
  value,
  onChange,
}: {
  tags: TagsResponse
  value: InterestSelection
  onChange: (next: InterestSelection) => void
}) {
  const interests = useMemo(() => [...tags.interests].sort((a, b) => a.sortOrder - b.sortOrder), [tags])

  function toggleInterest(id: number) {
    if (value.interestTagIds.includes(id)) {
      const skillIds = new Set(interests.find((i) => i.id === id)?.skills.map((s) => s.id))
      onChange({
        interestTagIds: value.interestTagIds.filter((x) => x !== id),
        skillTagIds: value.skillTagIds.filter((x) => !skillIds.has(x)),
      })
    } else if (value.interestTagIds.length < MAX_INTERESTS) {
      onChange({ ...value, interestTagIds: [...value.interestTagIds, id] })
    }
  }

  const interestFull = value.interestTagIds.length >= MAX_INTERESTS
  const selectedInterests = interests.filter((i) => value.interestTagIds.includes(i.id))

  return (
    <div className="space-y-8">
      <section>
        <FieldLabel aside={`${value.interestTagIds.length} / ${MAX_INTERESTS}`}>관심 분야</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {interests.map((interest) => {
            const selected = value.interestTagIds.includes(interest.id)
            return (
              <Chip
                key={interest.id}
                selected={selected}
                disabled={!selected && interestFull}
                onClick={() => toggleInterest(interest.id)}
              >
                {interest.name}
              </Chip>
            )
          })}
        </div>
      </section>

      {selectedInterests.length > 0 && (
        <section className="space-y-3">
          <div>
            <p className="text-sm font-bold text-title">세부 기술 (선택)</p>
            <p className="mt-1 text-xs text-muted-foreground">다뤄본 것만 골라 주세요. 고른 만큼 맞는 질문이 와요</p>
          </div>
          {selectedInterests.map((interest) => {
            const picked = interest.skills.filter((s) => value.skillTagIds.includes(s.id)).length
            return (
              <div key={interest.id} className="rounded-xl bg-card p-4">
                <FieldLabel aside={`${picked} / ${MAX_SKILLS_PER_INTEREST}`}>{interest.name}</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {interest.skills.map((skill) => {
                    const selected = value.skillTagIds.includes(skill.id)
                    return (
                      <Chip
                        key={skill.id}
                        selected={selected}
                        disabled={!selected && picked >= MAX_SKILLS_PER_INTEREST}
                        onClick={() => onChange({ ...value, skillTagIds: toggleId(value.skillTagIds, skill.id) })}
                      >
                        {skill.name}
                      </Chip>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}

/** 경험 태그 0–6개. 묶음(취업·커리어 · 학업 · 활동)별로 */
export function ExperiencePicker({
  tags,
  value,
  onChange,
}: {
  tags: TagsResponse
  value: number[]
  onChange: (next: number[]) => void
}) {
  const groups = useMemo(() => {
    const map = new Map<string, TagsResponse['experiences']>()
    for (const tag of tags.experiences) map.set(tag.groupName, [...(map.get(tag.groupName) ?? []), tag])
    return [...map.entries()]
  }, [tags])
  const full = value.length >= MAX_EXPERIENCES

  return (
    <div className="space-y-3">
      <p className="text-right text-xs text-muted-foreground tabular-nums">
        {value.length} / {MAX_EXPERIENCES}
      </p>
      {groups.map(([group, items]) => (
        <section key={group} className="rounded-xl bg-card p-4">
          <FieldLabel>{group}</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {items.map((tag) => {
              const selected = value.includes(tag.id)
              return (
                <Chip
                  key={tag.id}
                  selected={selected}
                  disabled={!selected && full}
                  onClick={() => onChange(toggleId(value, tag.id))}
                >
                  {tag.name}
                </Chip>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
