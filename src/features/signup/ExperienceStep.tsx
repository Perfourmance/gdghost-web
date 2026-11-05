import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ExperiencePicker } from '@/features/member/TagPickers'
import { MAX_EXPERIENCES } from '@/features/signup/answerableRules'
import { EMPTY_ANSWERABLE, SIGNUP_STEP_LABELS, type SignupDraft } from '@/features/signup/draft'
import { StepFooter, StepHeader } from '@/components/form/StepLayout'
import { TagsState } from '@/features/signup/TagsState'
import { useTags } from '@/features/tags/useTags'

interface Props {
  draft: SignupDraft
  onUpdate: (patch: Partial<SignupDraft>) => void
}

/** ③-2 (2/3) 경험 태그 0–6개. 묶음(취업·커리어 · 학업 · 활동)별로 보여 준다 */
export function ExperienceStep({ draft, onUpdate }: Props) {
  const tags = useTags()
  const info = draft.answerable ?? EMPTY_ANSWERABLE
  const count = info.experienceTagIds.length

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onUpdate({ step: 'about' })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <StepHeader
        eyebrow={SIGNUP_STEP_LABELS.experiences}
        title="해 본 경험이 있나요?"
        description={`해 본 것만 골라 주세요. ${MAX_EXPERIENCES}개까지 고를 수 있고, 없으면 건너뛰어도 돼요.`}
      />

      <TagsState tags={tags} />

      {tags.data && (
        <ExperiencePicker
          tags={tags.data}
          value={info.experienceTagIds}
          onChange={(ids) => onUpdate({ answerable: { ...info, experienceTagIds: ids } })}
        />
      )}

      <StepFooter>
        <Button type="submit" size="lg" variant={count === 0 ? 'secondary' : 'default'} className="h-12 w-full">
          {count === 0 ? '건너뛰기' : '다음'}
        </Button>
      </StepFooter>
    </form>
  )
}
