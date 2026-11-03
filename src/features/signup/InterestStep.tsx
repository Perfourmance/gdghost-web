import { useMemo, type FormEvent } from 'react'
import { Chip } from '@/components/Chip'
import { Button } from '@/components/ui/button'
import { MAX_INTERESTS, MAX_SKILLS_PER_INTEREST, toggleId } from '@/features/signup/answerableRules'
import { EMPTY_ANSWERABLE, SIGNUP_STEP_LABELS, type AnswerableInfo, type SignupDraft } from '@/features/signup/draft'
import { FieldLabel, StepFooter, StepHeader } from '@/components/form/StepLayout'
import { TagsState } from '@/features/signup/TagsState'
import { useTags } from '@/features/tags/useTags'

interface Props {
  draft: SignupDraft
  onUpdate: (patch: Partial<SignupDraft>) => void
}

/** ③-2 (1/3) 관심 분야 1–4개 + 분야마다 세부 기술 3개까지 */
export function InterestStep({ draft, onUpdate }: Props) {
  const tags = useTags()
  const info = draft.answerable ?? EMPTY_ANSWERABLE
  const interests = useMemo(
    () => [...(tags.data?.interests ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [tags.data],
  )

  function set(patch: Partial<AnswerableInfo>) {
    onUpdate({ answerable: { ...info, ...patch } })
  }

  // 분야를 빼면 그 분야에서 고른 세부 기술도 같이 뺀다
  function toggleInterest(id: number) {
    if (info.interestTagIds.includes(id)) {
      const skillIds = new Set(interests.find((i) => i.id === id)?.skills.map((s) => s.id))
      set({
        interestTagIds: info.interestTagIds.filter((x) => x !== id),
        skillTagIds: info.skillTagIds.filter((x) => !skillIds.has(x)),
      })
    } else if (info.interestTagIds.length < MAX_INTERESTS) {
      set({ interestTagIds: [...info.interestTagIds, id] })
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (info.interestTagIds.length > 0) onUpdate({ step: 'experiences' })
  }

  const interestFull = info.interestTagIds.length >= MAX_INTERESTS
  const selectedInterests = interests.filter((i) => info.interestTagIds.includes(i.id))

  return (
    <form onSubmit={handleSubmit} noValidate>
      <StepHeader
        eyebrow={SIGNUP_STEP_LABELS.interests}
        title="어떤 분야에 관심 있나요?"
        description="여기 적은 내용으로 맞는 질문이 찾아와요. 귀찮아도 조금만 채워주세요"
      />

      <TagsState tags={tags} />

      {tags.data && (
        <div className="space-y-8">
          <section>
            <FieldLabel aside={`${info.interestTagIds.length} / ${MAX_INTERESTS}`}>관심 분야</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => {
                const selected = info.interestTagIds.includes(interest.id)
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
                <p className="mt-1 text-xs text-muted-foreground">다뤄본 것만 골라주세요. 고른 만큼 맞는 질문이 와요</p>
              </div>
              {selectedInterests.map((interest) => {
                const picked = interest.skills.filter((s) => info.skillTagIds.includes(s.id)).length
                return (
                  <div key={interest.id} className="rounded-xl bg-card p-4">
                    <FieldLabel aside={`${picked} / ${MAX_SKILLS_PER_INTEREST}`}>{interest.name}</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {interest.skills.map((skill) => {
                        const selected = info.skillTagIds.includes(skill.id)
                        return (
                          <Chip
                            key={skill.id}
                            selected={selected}
                            disabled={!selected && picked >= MAX_SKILLS_PER_INTEREST}
                            onClick={() => set({ skillTagIds: toggleId(info.skillTagIds, skill.id) })}
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
      )}

      <StepFooter>
        <Button type="submit" size="lg" className="h-12 w-full" disabled={info.interestTagIds.length === 0}>
          {info.interestTagIds.length === 0 ? '관심 분야를 하나 이상 골라 주세요' : '다음'}
        </Button>
      </StepFooter>
    </form>
  )
}
