import { useState, type FormEvent } from 'react'
import { BIO_MAX, STATUS_NOTE_MAX } from '@/features/signup/answerableRules'
import { EMPTY_ANSWERABLE, SIGNUP_STEP_LABELS, type AnswerableInfo, type SignupDraft } from '@/features/signup/draft'
import { SignupCta, SignupHead, SignupLabel } from '@/features/signup/SignupParts'

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
      <SignupHead eye={SIGNUP_STEP_LABELS.about} title="요즘 어떻게 지내세요?">
        둘 다 선택이에요. 프로필에서 나중에 바꿀 수 있어요.
      </SignupHead>

      <div className="gh-su-fl">
        <SignupLabel htmlFor="statusNote" count={`${info.statusNote.length} / ${STATUS_NOTE_MAX}`}>
          근황
        </SignupLabel>
        <p id="statusNote-help" className="gh-su-hint">
          지금 하는 일을 한 줄로. 재학생도 쓸 수 있어요.
        </p>
        <input
          id="statusNote"
          maxLength={STATUS_NOTE_MAX}
          placeholder={statusNotePlaceholder}
          className="gh-su-in"
          aria-describedby="statusNote-help"
          value={info.statusNote}
          onChange={(e) => set({ statusNote: e.target.value })}
        />
      </div>

      <div className="gh-su-fl">
        <SignupLabel htmlFor="bio" count={`${info.bio.length} / ${BIO_MAX}`}>
          자기소개
        </SignupLabel>
        <p id="bio-help" className="gh-su-hint">
          <b>어떤 질문에 답할 수 있는지</b> 적어 주세요. 후배에게 보여요.
        </p>
        <textarea
          id="bio"
          maxLength={BIO_MAX}
          placeholder={BIO_PLACEHOLDER}
          className="gh-su-in is-ta"
          aria-describedby="bio-help"
          value={info.bio}
          onChange={(e) => set({ bio: e.target.value })}
        />
      </div>

      <SignupCta skip={empty}>{empty ? '건너뛰기' : '아이디·비밀번호 만들기'}</SignupCta>
    </form>
  )
}
