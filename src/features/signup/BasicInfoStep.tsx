import type { FormEvent } from 'react'
import { DepartmentSelect } from '@/features/departments/DepartmentSelect'
import { isDepartment, useDepartments } from '@/features/departments/useDepartments'
import { MEMBER_STATUSES, POSITIONS } from '@/features/member/labels'
import { EMPTY_BASIC, SIGNUP_STEP_LABELS, type BasicInfo, type SignupDraft } from '@/features/signup/draft'
import { IconTick, SignupChips, SignupCta, SignupHead, SignupLabel } from '@/features/signup/SignupParts'
import { useNicknameCheck } from '@/features/signup/useNicknameCheck'
import { cn } from '@/lib/utils'

interface Props {
  draft: SignupDraft
  onUpdate: (patch: Partial<SignupDraft>) => void
}

/** ③-1 기본 정보 — 입력할 때마다 보관해 새로고침해도 남는다 */
export function BasicInfoStep({ draft, onUpdate }: Props) {
  const basic = draft.basic ?? EMPTY_BASIC
  const nicknameCheck = useNicknameCheck(basic.nickname)
  const departments = useDepartments()

  function set<K extends keyof BasicInfo>(key: K, value: BasicInfo[K]) {
    onUpdate({ basic: { ...basic, [key]: value } })
  }

  const studentNoValid = /^\d{2}$/.test(basic.studentNo)
  const canNext =
    basic.name.trim() !== '' &&
    nicknameCheck.state === 'available' &&
    basic.position != null &&
    studentNoValid &&
    isDepartment(departments.data, basic.department) &&
    basic.status != null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canNext) onUpdate({ step: 'interests' })
  }

  const nicknameMessage = {
    empty: <span className="gh-su-msg">2~12자로 입력해 주세요. 30일에 한 번 바꿀 수 있어요.</span>,
    checking: <span className="gh-su-msg">확인하는 중…</span>,
    available: (
      <span className="gh-su-msg is-good">
        <IconTick />
        쓸 수 있어요
      </span>
    ),
    invalid: <span className="gh-su-msg is-bad">{nicknameCheck.state === 'invalid' ? nicknameCheck.message : ''}</span>,
    error: <span className="gh-su-msg is-bad">확인하지 못했어요. 잠시 뒤 다시 입력해 주세요.</span>,
  }[nicknameCheck.state]

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SignupHead eye={SIGNUP_STEP_LABELS.profile} title="어떻게 불러 드릴까요?">
        게시글엔 닉네임만 보여요. 이름은 부원만 프로필에서 볼 수 있어요.
      </SignupHead>

      <div className="gh-su-two">
        <div className="gh-su-fl">
          <SignupLabel htmlFor="name">이름</SignupLabel>
          <input
            id="name"
            autoComplete="name"
            maxLength={20}
            className="gh-su-in"
            value={basic.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </div>
        <div className="gh-su-fl">
          <SignupLabel htmlFor="nickname">닉네임</SignupLabel>
          <input
            id="nickname"
            autoComplete="nickname"
            maxLength={12}
            className={cn('gh-su-in', nicknameCheck.state === 'available' && 'is-good')}
            aria-describedby="nickname-help"
            aria-invalid={nicknameCheck.state === 'invalid'}
            value={basic.nickname}
            onChange={(e) => set('nickname', e.target.value)}
          />
        </div>
      </div>
      <div id="nickname-help" aria-live="polite">
        {nicknameMessage}
      </div>

      <div className="gh-su-fl">
        <SignupLabel>
          <span id="position-label">포지션</span>
        </SignupLabel>
        <SignupChips
          seg={4}
          labelledBy="position-label"
          options={POSITIONS}
          isOn={(v) => basic.position === v}
          onToggle={(v) => set('position', v)}
        />
      </div>

      <div className="gh-su-two is-w">
        <div className="gh-su-fl">
          <SignupLabel htmlFor="studentNo">학번</SignupLabel>
          <input
            id="studentNo"
            inputMode="numeric"
            placeholder="25"
            maxLength={2}
            className="gh-su-in"
            aria-describedby="studentNo-help"
            value={basic.studentNo}
            onChange={(e) => set('studentNo', e.target.value.replace(/\D/g, ''))}
          />
          <span id="studentNo-help" className="gh-su-hint">
            입학 연도 끝 두 자리
          </span>
        </div>
        <div className="gh-su-fl">
          <SignupLabel htmlFor="department">학과</SignupLabel>
          <DepartmentSelect
            id="department"
            className="gh-su-in"
            value={basic.department}
            onChange={(name) => set('department', name)}
          />
        </div>
      </div>

      <div className="gh-su-fl">
        <SignupLabel>
          <span id="status-label">상태</span>
        </SignupLabel>
        <SignupChips
          seg={3}
          labelledBy="status-label"
          options={MEMBER_STATUSES}
          isOn={(v) => basic.status === v}
          onToggle={(v) => set('status', v)}
        />
      </div>

      <SignupCta disabled={!canNext}>관심 분야 고르기</SignupCta>
    </form>
  )
}
