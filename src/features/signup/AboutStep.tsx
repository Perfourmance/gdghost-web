import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BIO_MAX, STATUS_NOTE_MAX } from '@/features/signup/answerableRules'
import { EMPTY_ANSWERABLE, SIGNUP_STEP_LABELS, type AnswerableInfo, type SignupDraft } from '@/features/signup/draft'
import { FieldLabel, StepFooter, StepHeader } from '@/components/form/StepLayout'

// 노션 AI 매칭 설계 부록 C
const STATUS_NOTE_PLACEHOLDERS = [
  '예: OO기업 백엔드 인턴 근무 중',
  '예: 핀테크 스타트업 프론트엔드 2년차',
  '예: 졸업 프로젝트로 추천 시스템 개발 중',
  '예: 정보처리기사 준비 · 하반기 공채 지원',
]
const BIO_PLACEHOLDER = '예: 백엔드 취업 준비, 포트폴리오, 휴학 중 인턴'

interface Props {
  draft: SignupDraft
  onUpdate: (patch: Partial<SignupDraft>) => void
}

/** ③-2 (3/3) 근황 60자 · 자기소개 120자, 둘 다 선택 */
export function AboutStep({ draft, onUpdate }: Props) {
  const info = draft.answerable ?? EMPTY_ANSWERABLE
  const [statusNotePlaceholder] = useState(
    () => STATUS_NOTE_PLACEHOLDERS[Math.floor(Math.random() * STATUS_NOTE_PLACEHOLDERS.length)],
  )

  function set(patch: Partial<AnswerableInfo>) {
    onUpdate({ answerable: { ...info, ...patch } })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onUpdate({ step: 'account' })
  }

  const empty = info.statusNote.trim() === '' && info.bio.trim() === ''

  return (
    <form onSubmit={handleSubmit} noValidate>
      <StepHeader
        eyebrow={SIGNUP_STEP_LABELS.about}
        title="요즘 어떻게 지내세요?"
        description="두 항목 모두 선택이에요. 프로필에서 나중에 바꿀 수 있어요."
      />

      <div className="space-y-8">
        <section>
          <FieldLabel htmlFor="statusNote" aside={`${info.statusNote.length} / ${STATUS_NOTE_MAX}`}>
            근황
          </FieldLabel>
          <p className="mb-3 text-xs text-muted-foreground">지금 하는 일을 한 줄로 적어 주세요. 재학생도 쓸 수 있어요.</p>
          <Input
            id="statusNote"
            maxLength={STATUS_NOTE_MAX}
            placeholder={statusNotePlaceholder}
            className="h-12 bg-card"
            value={info.statusNote}
            onChange={(e) => set({ statusNote: e.target.value })}
          />
        </section>

        <section>
          <FieldLabel htmlFor="bio" aside={`${info.bio.length} / ${BIO_MAX}`}>
            자기소개
          </FieldLabel>
          <p className="mb-3 text-xs text-muted-foreground">
            <b className="font-bold text-brand-text">어떤 질문에 답할 수 있는지</b> 적어 주세요. 후배에게 보여요.
          </p>
          <textarea
            id="bio"
            maxLength={BIO_MAX}
            rows={4}
            placeholder={BIO_PLACEHOLDER}
            className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            value={info.bio}
            onChange={(e) => set({ bio: e.target.value })}
          />
        </section>
      </div>

      <StepFooter>
        <Button type="submit" size="lg" variant={empty ? 'secondary' : 'default'} className="h-12 w-full">
          {empty ? '건너뛰기' : '아이디·비밀번호 설정'}
        </Button>
      </StepFooter>
    </form>
  )
}
