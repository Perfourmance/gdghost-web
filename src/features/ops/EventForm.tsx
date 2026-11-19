import { useState, type FormEvent } from 'react'
import { FieldError, Hint, LinedTextarea, PaperInput, PaperLabel, TitleInput, Toggle, WriteForm } from '@/components/story'
import { EVENT_DESC_MAX, EVENT_NAME_MAX, EVENT_REQ_MAX, GUIDE_STEP_MAX, type EventInput } from '@/features/ops/content'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'
import '@/styles/feed.css'

/** 이벤트 만들기 · 수정 (S72) — 이름 · 기간 · 설명 · 필요한 것 · 4단계 안내 · 사진 필수 */
export function EventForm({
  mode,
  initial,
  pending,
  error,
  onSubmit,
}: {
  mode: 'create' | 'edit'
  initial: EventInput
  pending: boolean
  error: string | null
  onSubmit: (values: EventInput, allowLeave: () => void) => void
}) {
  const [v, setV] = useState(initial)
  const [tried, setTried] = useState(false)
  const trimmed: EventInput = {
    ...v,
    name: v.name.trim(),
    description: v.description.trim(),
    requirement: v.requirement.trim(),
    guideSteps: v.guideSteps.map((s) => s.trim()),
  }
  const errors = {
    name: trimmed.name.length < 2 ? '이름을 2자 이상 써 주세요.' : null,
    period: !v.startDate || !v.endDate ? '기간을 골라 주세요.' : v.endDate < v.startDate ? '종료일은 시작일보다 늦어야 해요.' : null,
    description: trimmed.description === '' ? '설명을 써 주세요.' : null,
    requirement: trimmed.requirement === '' ? '필요한 것을 써 주세요.' : null,
    steps: trimmed.guideSteps.some((s) => s === '') ? '안내 4단계를 모두 적어 주세요.' : null,
  }
  const invalid = Object.values(errors).some(Boolean)
  const changed = JSON.stringify(trimmed) !== JSON.stringify(initial)
  const allowLeave = useLeaveGuard(changed && !pending, '작성을 그만둘까요? 입력한 내용은 저장되지 않아요.')

  function set(patch: Partial<EventInput>) {
    setV((prev) => ({ ...prev, ...patch }))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setTried(true)
    if (invalid || pending) return
    onSubmit(trimmed, allowLeave)
  }

  return (
    <WriteForm
      title={mode === 'create' ? '별똥별 띄우기' : '이벤트 고치기'}
      description={mode === 'create' ? '만들 때는 알림이 가지 않아요. 알리려면 공지로 올려 주세요.' : undefined}
      submitLabel={mode === 'create' ? '이벤트 만들기' : '고친 이벤트 저장'}
      pendingLabel="저장하는 중…"
      pending={pending}
      disabled={mode === 'edit' && !changed}
      error={error}
      onSubmit={submit}
    >
      <PaperLabel htmlFor="ev-name" aside={`${v.name.length} / ${EVENT_NAME_MAX}`}>
        이름
      </PaperLabel>
      <TitleInput id="ev-name" rows={1} maxLength={EVENT_NAME_MAX} placeholder="예: 11월 알고리즘 챌린지" value={v.name} onChange={(e) => set({ name: e.target.value.replace(/\n/g, ' ') })} />
      {tried && <FieldError>{errors.name}</FieldError>}

      <PaperLabel>기간</PaperLabel>
      <div className="gh-two-in !grid-cols-2">
        <PaperInput type="date" aria-label="시작일" value={v.startDate} onChange={(e) => set({ startDate: e.target.value })} />
        <PaperInput type="date" aria-label="끝나는 날" min={v.startDate || undefined} value={v.endDate} onChange={(e) => set({ endDate: e.target.value })} />
      </div>
      {tried && <FieldError>{errors.period}</FieldError>}
      <Hint>이벤트 기간에만 인증할 수 있어요. 올라온 인증은 지울 수 없어요.</Hint>

      <PaperLabel htmlFor="ev-desc" aside={`${v.description.length} / ${EVENT_DESC_MAX}`}>
        설명
      </PaperLabel>
      <LinedTextarea id="ev-desc" maxLength={EVENT_DESC_MAX} placeholder="이벤트를 소개해 주세요. 상품이 있다면 함께 적어 주세요." value={v.description} onChange={(e) => set({ description: e.target.value })} />
      {tried && <FieldError>{errors.description}</FieldError>}

      <PaperLabel htmlFor="ev-req" aside={`${v.requirement.length} / ${EVENT_REQ_MAX}`}>
        필요한 것
      </PaperLabel>
      <PaperInput id="ev-req" maxLength={EVENT_REQ_MAX} placeholder="예: 푼 문제의 채점 결과 캡처" value={v.requirement} onChange={(e) => set({ requirement: e.target.value })} />
      {tried && <FieldError>{errors.requirement}</FieldError>}

      <PaperLabel>인증 방법 4단계</PaperLabel>
      <ol className="space-y-2">
        {v.guideSteps.map((step, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gh-night font-title text-xs text-gh-amber">{i + 1}</span>
            <PaperInput
              aria-label={`${i + 1}단계`}
              maxLength={GUIDE_STEP_MAX}
              value={step}
              onChange={(e) => set({ guideSteps: v.guideSteps.map((s, j) => (j === i ? e.target.value : s)) })}
            />
          </li>
        ))}
      </ol>
      {tried && <FieldError>{errors.steps}</FieldError>}

      <div className="gh-pswitch">
        <div>
          <b>사진 필수</b>
          <span>끄면 한 줄만으로도 인증할 수 있어요.{mode === 'edit' && ' 이미 올라온 인증은 그대로 남아요.'}</span>
        </div>
        <Toggle small label="사진 필수" checked={v.photoRequired} onChange={(on) => set({ photoRequired: on })} />
      </div>
    </WriteForm>
  )
}
