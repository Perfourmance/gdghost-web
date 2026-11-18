import { useMemo, type FormEvent } from 'react'
import { groupExperiences, MAX_EXPERIENCES, toggleId } from '@/features/signup/answerableRules'
import { EMPTY_ANSWERABLE, SIGNUP_STEP_LABELS, type SignupDraft } from '@/features/signup/draft'
import { SignupChips, SignupCta, SignupHead, SignupLabel } from '@/features/signup/SignupParts'
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
  const ids = info.experienceTagIds
  const count = ids.length
  const groups = useMemo(() => (tags.data ? groupExperiences(tags.data) : []), [tags.data])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onUpdate({ step: 'about' })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SignupHead eye={SIGNUP_STEP_LABELS.experiences} title="해 본 경험이 있나요?">
        {MAX_EXPERIENCES}개까지 골라 주세요. 없으면 건너뛰어도 돼요.
      </SignupHead>

      <TagsState tags={tags} />

      {tags.data && (
        <>
          <p className="gh-su-cnt" aria-live="polite">
            {count} / {MAX_EXPERIENCES}
          </p>
          {groups.map(([group, items], n) => (
            <section key={group} className="gh-su-box">
              <SignupLabel>
                <span id={`exp-${n}`}>{group}</span>
              </SignupLabel>
              <SignupChips
                labelledBy={`exp-${n}`}
                options={items.map((t) => ({ value: t.id, label: t.name, disabled: count >= MAX_EXPERIENCES }))}
                isOn={(id) => ids.includes(id)}
                onToggle={(id) => onUpdate({ answerable: { ...info, experienceTagIds: toggleId(ids, id) } })}
              />
            </section>
          ))}
        </>
      )}

      <SignupCta skip={count === 0}>{count === 0 ? '건너뛰기' : '소개 쓰기'}</SignupCta>
    </form>
  )
}
