import type { FormEvent } from 'react'
import { Chip } from '@/components/Chip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MEMBER_STATUSES, POSITIONS } from '@/features/member/labels'
import { EMPTY_BASIC, SIGNUP_STEP_LABELS, type BasicInfo, type SignupDraft } from '@/features/signup/draft'
import { StepFooter, StepHeader } from '@/features/signup/StepLayout'
import { useNicknameCheck } from '@/features/signup/useNicknameCheck'

interface Props {
  draft: SignupDraft
  onUpdate: (patch: Partial<SignupDraft>) => void
}

/** ③-1 기본 정보 — 입력할 때마다 보관해 새로고침해도 남는다 */
export function BasicInfoStep({ draft, onUpdate }: Props) {
  const basic = draft.basic ?? EMPTY_BASIC
  const nicknameCheck = useNicknameCheck(basic.nickname)

  function set<K extends keyof BasicInfo>(key: K, value: BasicInfo[K]) {
    onUpdate({ basic: { ...basic, [key]: value } })
  }

  const studentNoValid = /^\d{2}$/.test(basic.studentNo)
  const canNext =
    basic.name.trim() !== '' &&
    nicknameCheck.state === 'available' &&
    basic.position != null &&
    studentNoValid &&
    basic.department.trim() !== '' &&
    basic.status != null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canNext) onUpdate({ step: 'interests' })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <StepHeader
        eyebrow={SIGNUP_STEP_LABELS.profile}
        title="기본 정보를 알려 주세요"
        description="글에는 닉네임만 보이고, 이름은 프로필에서 부원에게만 보여요."
      />
      <div className="space-y-6">

      <div className="space-y-2">
        <Label className="font-bold text-title" htmlFor="name">이름</Label>
        <Input
          id="name"
          autoComplete="name"
          maxLength={20}
          className="h-12 bg-card"
          value={basic.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="font-bold text-title" htmlFor="nickname">닉네임</Label>
        <Input
          id="nickname"
          autoComplete="nickname"
          maxLength={12}
          className="h-12 bg-card"
          aria-describedby="nickname-help"
          aria-invalid={nicknameCheck.state === 'invalid'}
          value={basic.nickname}
          onChange={(e) => set('nickname', e.target.value)}
        />
        <p id="nickname-help" className="text-sm" aria-live="polite">
          {nicknameCheck.state === 'empty' && <span className="text-muted-foreground">2–12자. 30일에 한 번 바꿀 수 있어요.</span>}
          {nicknameCheck.state === 'checking' && <span className="text-muted-foreground">확인 중…</span>}
          {nicknameCheck.state === 'available' && <span className="text-brand-text">사용할 수 있어요.</span>}
          {nicknameCheck.state === 'invalid' && <span className="text-destructive">{nicknameCheck.message}</span>}
          {nicknameCheck.state === 'error' && (
            <span className="text-destructive">확인하지 못했어요. 잠시 뒤 다시 입력해 주세요.</span>
          )}
        </p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-bold text-title">포지션</legend>
        <div className="flex flex-wrap gap-2">
          {POSITIONS.map((p) => (
            <Chip key={p.value} selected={basic.position === p.value} onClick={() => set('position', p.value)}>
              {p.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-[6rem_1fr] gap-3">
        <div className="space-y-2">
          <Label className="font-bold text-title" htmlFor="studentNo">학번</Label>
          <Input
            id="studentNo"
            inputMode="numeric"
            placeholder="23"
            maxLength={2}
            className="h-12 bg-card"
            aria-describedby="studentNo-help"
            value={basic.studentNo}
            onChange={(e) => set('studentNo', e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <div className="space-y-2">
          <Label className="font-bold text-title" htmlFor="department">학과</Label>
          <Input
            id="department"
            maxLength={30}
            className="h-12 bg-card"
            value={basic.department}
            onChange={(e) => set('department', e.target.value)}
          />
        </div>
      </div>
      <p id="studentNo-help" className="-mt-4 text-xs text-muted-foreground">
        학번은 입학 연도 두 자리예요.
      </p>

      <fieldset>
        <legend className="mb-2 text-sm font-bold text-title">상태</legend>
        <div className="flex flex-wrap gap-2">
          {MEMBER_STATUSES.map((s) => (
            <Chip key={s.value} selected={basic.status === s.value} onClick={() => set('status', s.value)}>
              {s.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      </div>

      <StepFooter>
        <Button type="submit" size="lg" className="h-12 w-full" disabled={!canNext}>
          다음
        </Button>
      </StepFooter>
    </form>
  )
}
