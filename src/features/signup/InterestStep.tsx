import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { InterestPicker } from '@/features/member/TagPickers'
import { EMPTY_ANSWERABLE, SIGNUP_STEP_LABELS, type SignupDraft } from '@/features/signup/draft'
import { StepFooter, StepHeader } from '@/components/form/StepLayout'
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (info.interestTagIds.length > 0) onUpdate({ step: 'experiences' })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <StepHeader
        eyebrow={SIGNUP_STEP_LABELS.interests}
        title="어떤 분야에 관심 있나요?"
        description="여기 적은 내용으로 맞는 질문이 찾아와요. 귀찮아도 조금만 채워 주세요"
      />

      <TagsState tags={tags} />

      {tags.data && (
        <InterestPicker
          tags={tags.data}
          value={info}
          onChange={(next) => onUpdate({ answerable: { ...info, ...next } })}
        />
      )}

      <StepFooter>
        <Button type="submit" size="lg" className="h-12 w-full" disabled={info.interestTagIds.length === 0}>
          {info.interestTagIds.length === 0 ? '관심 분야를 하나 이상 골라 주세요' : '다음'}
        </Button>
      </StepFooter>
    </form>
  )
}
