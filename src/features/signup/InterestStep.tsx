import { useMemo, type FormEvent } from 'react'
import {
  EMPTY_ANSWERABLE,
  SIGNUP_STEP_LABELS,
  type AnswerableInfo,
  type SignupDraft,
} from '@/features/signup/draft'
import {
  MAX_INTERESTS,
  MAX_SKILLS_PER_INTEREST,
  sortedInterests,
  toggleId,
  toggleInterestSelection,
} from '@/features/signup/answerableRules'
import { SignupChips, SignupCta, SignupHead, SignupLabel } from '@/features/signup/SignupParts'
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
  const interests = useMemo(() => (tags.data ? sortedInterests(tags.data) : []), [tags.data])
  const selected = interests.filter((i) => info.interestTagIds.includes(i.id))
  const full = info.interestTagIds.length >= MAX_INTERESTS

  function set(patch: Partial<AnswerableInfo>) {
    onUpdate({ answerable: { ...info, ...patch } })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (info.interestTagIds.length > 0) onUpdate({ step: 'experiences' })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SignupHead eye={SIGNUP_STEP_LABELS.interests} title="어떤 분야에 관심 있나요?">
        관심 분야에 맞는 질문을 받아요.
      </SignupHead>

      <TagsState tags={tags} />

      {tags.data && (
        <>
          <div className="gh-su-fl">
            <SignupLabel count={`${info.interestTagIds.length} / ${MAX_INTERESTS}`}>
              <span id="interest-label">관심 분야</span>
            </SignupLabel>
            <SignupChips
              labelledBy="interest-label"
              options={interests.map((i) => ({ value: i.id, label: i.name, disabled: full }))}
              isOn={(id) => info.interestTagIds.includes(id)}
              onToggle={(id) => set(toggleInterestSelection(interests, info, id))}
            />
          </div>

          {selected.map((interest, n) => {
            const picked = interest.skills.filter((s) => info.skillTagIds.includes(s.id)).length
            const labelId = `skills-${interest.id}`
            return (
              <section key={interest.id} className="gh-su-box">
                <SignupLabel small="선택" count={`${picked} / ${MAX_SKILLS_PER_INTEREST}`}>
                  <span id={labelId}>{interest.name} 세부 기술</span>
                </SignupLabel>
                {n === 0 && <p className="gh-su-hint">써 본 기술만 골라 주세요. 고른 기술에 맞는 질문을 받아요.</p>}
                <SignupChips
                  labelledBy={labelId}
                  options={interest.skills.map((s) => ({ value: s.id, label: s.name, disabled: picked >= MAX_SKILLS_PER_INTEREST }))}
                  isOn={(id) => info.skillTagIds.includes(id)}
                  onToggle={(id) => set({ skillTagIds: toggleId(info.skillTagIds, id) })}
                />
              </section>
            )
          })}
        </>
      )}

      <SignupCta disabled={info.interestTagIds.length === 0}>
        {info.interestTagIds.length === 0 ? '관심 분야를 하나 이상 골라 주세요' : '경험 고르기'}
      </SignupCta>
    </form>
  )
}
