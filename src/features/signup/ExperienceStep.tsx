import { useMemo, type FormEvent } from 'react'
import { Chip } from '@/components/Chip'
import { Button } from '@/components/ui/button'
import { MAX_EXPERIENCES, toggleId } from '@/features/signup/answerableRules'
import { EMPTY_ANSWERABLE, SIGNUP_STEP_LABELS, type SignupDraft } from '@/features/signup/draft'
import { FieldLabel, StepFooter, StepHeader } from '@/components/form/StepLayout'
import { TagsState } from '@/features/signup/TagsState'
import { useTags, type TagsResponse } from '@/features/tags/useTags'

interface Props {
  draft: SignupDraft
  onUpdate: (patch: Partial<SignupDraft>) => void
}

/** ③-2 (2/3) 경험 태그 0–6개. 묶음(취업·커리어 · 학업 · 활동)별로 보여 준다 */
export function ExperienceStep({ draft, onUpdate }: Props) {
  const tags = useTags()
  const info = draft.answerable ?? EMPTY_ANSWERABLE
  const groups = useMemo(() => {
    const map = new Map<string, TagsResponse['experiences']>()
    for (const tag of tags.data?.experiences ?? []) map.set(tag.groupName, [...(map.get(tag.groupName) ?? []), tag])
    return [...map.entries()]
  }, [tags.data])

  const count = info.experienceTagIds.length
  const full = count >= MAX_EXPERIENCES

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onUpdate({ step: 'about' })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <StepHeader
        eyebrow={SIGNUP_STEP_LABELS.experiences}
        title="해 본 경험이 있나요?"
        description={`해본 것만 골라 주세요. ${MAX_EXPERIENCES}개까지 고를 수 있고, 없으면 건너뛰어도 돼요.`}
      />

      <TagsState tags={tags} />

      {tags.data && (
        <div className="space-y-3">
          <p className="text-right text-xs text-muted-foreground tabular-nums">
            {count} / {MAX_EXPERIENCES}
          </p>
          {groups.map(([group, items]) => (
            <section key={group} className="rounded-xl bg-card p-4">
              <FieldLabel>{group}</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {items.map((tag) => {
                  const selected = info.experienceTagIds.includes(tag.id)
                  return (
                    <Chip
                      key={tag.id}
                      selected={selected}
                      disabled={!selected && full}
                      onClick={() =>
                        onUpdate({ answerable: { ...info, experienceTagIds: toggleId(info.experienceTagIds, tag.id) } })
                      }
                    >
                      {tag.name}
                    </Chip>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <StepFooter>
        <Button type="submit" size="lg" variant={count === 0 ? 'secondary' : 'default'} className="h-12 w-full">
          {count === 0 ? '건너뛰기' : '다음'}
        </Button>
      </StepFooter>
    </form>
  )
}
