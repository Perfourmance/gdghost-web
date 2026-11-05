import { useState, type FormEvent } from 'react'
import { FieldLabel, StepFooter } from '@/components/form/StepLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { EVENT_DESC_MAX, EVENT_NAME_MAX, EVENT_REQ_MAX, GUIDE_STEP_MAX, type EventInput } from '@/features/ops/content'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'

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
    period: !v.startDate || !v.endDate ? '기간을 골라 주세요.' : v.endDate < v.startDate ? '끝나는 날은 시작일 이후여야 해요.' : null,
    description: trimmed.description === '' ? '설명을 써 주세요.' : null,
    requirement: trimmed.requirement === '' ? '필요한 것을 써 주세요.' : null,
    steps: trimmed.guideSteps.some((s) => s === '') ? '안내 4단계를 모두 써 주세요.' : null,
  }
  const invalid = Object.values(errors).some(Boolean)
  const changed = JSON.stringify(trimmed) !== JSON.stringify(initial)
  const allowLeave = useLeaveGuard(changed && !pending, '작성을 그만둘까요? 입력한 내용은 사라져요.')

  function set(patch: Partial<EventInput>) {
    setV((prev) => ({ ...prev, ...patch }))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setTried(true)
    if (invalid || pending) return
    onSubmit(trimmed, allowLeave)
  }

  const area =
    'w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm'

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="mb-8 text-[22px] leading-snug font-bold text-title">{mode === 'create' ? '이벤트 만들기' : '이벤트 수정'}</h1>
      <div className="space-y-8">
        <section>
          <FieldLabel htmlFor="ev-name" aside={`${v.name.length} / ${EVENT_NAME_MAX}`}>
            이름
          </FieldLabel>
          <Input id="ev-name" maxLength={EVENT_NAME_MAX} className="h-12 bg-card" placeholder="예) 11월 알고리즘 챌린지" value={v.name} onChange={(e) => set({ name: e.target.value })} />
          {tried && errors.name && <FieldError>{errors.name}</FieldError>}
        </section>
        <section>
          <FieldLabel>기간</FieldLabel>
          <div className="flex items-center gap-2">
            <Input type="date" aria-label="시작일" className="h-11 bg-card" value={v.startDate} onChange={(e) => set({ startDate: e.target.value })} />
            <span className="text-muted-foreground">–</span>
            <Input type="date" aria-label="끝나는 날" min={v.startDate || undefined} className="h-11 bg-card" value={v.endDate} onChange={(e) => set({ endDate: e.target.value })} />
          </div>
          {tried && errors.period && <FieldError>{errors.period}</FieldError>}
          <p className="mt-1.5 text-xs text-muted-foreground">기간 동안만 인증을 올릴 수 있어요. 삭제는 없고, 기간이 지나면 끝나요.</p>
        </section>
        <section>
          <FieldLabel htmlFor="ev-desc" aside={`${v.description.length} / ${EVENT_DESC_MAX}`}>
            설명
          </FieldLabel>
          <textarea id="ev-desc" rows={5} maxLength={EVENT_DESC_MAX} className={area} placeholder="어떤 이벤트인지, 상품이 있다면 무엇인지" value={v.description} onChange={(e) => set({ description: e.target.value })} />
          {tried && errors.description && <FieldError>{errors.description}</FieldError>}
        </section>
        <section>
          <FieldLabel htmlFor="ev-req" aside={`${v.requirement.length} / ${EVENT_REQ_MAX}`}>
            필요한 것
          </FieldLabel>
          <Input id="ev-req" maxLength={EVENT_REQ_MAX} className="h-12 bg-card" placeholder="예) 푼 문제의 채점 결과 캡처" value={v.requirement} onChange={(e) => set({ requirement: e.target.value })} />
          {tried && errors.requirement && <FieldError>{errors.requirement}</FieldError>}
        </section>
        <section>
          <FieldLabel>인증 방법 4단계</FieldLabel>
          <ol className="space-y-2">
            {v.guideSteps.map((step, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-text">{i + 1}</span>
                <Input
                  aria-label={`${i + 1}단계`}
                  maxLength={GUIDE_STEP_MAX}
                  className="h-11 bg-card"
                  value={step}
                  onChange={(e) => set({ guideSteps: v.guideSteps.map((s, j) => (j === i ? e.target.value : s)) })}
                />
              </li>
            ))}
          </ol>
          {tried && errors.steps && <FieldError>{errors.steps}</FieldError>}
        </section>
        <section className="flex items-center justify-between gap-3">
          <div>
            <label htmlFor="ev-photo" className="text-sm font-bold text-title">
              사진 필수
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              끄면 한 줄만으로도 인증할 수 있어요.{mode === 'edit' && ' 이미 올라온 인증은 그대로예요.'}
            </p>
          </div>
          <Switch id="ev-photo" checked={v.photoRequired} onCheckedChange={(on) => set({ photoRequired: on })} />
        </section>
      </div>
      <StepFooter>
        {error && (
          <p className="mb-3 text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="h-12 w-full" disabled={pending || (mode === 'edit' && !changed)}>
          {pending ? '저장하는 중…' : mode === 'create' ? '이벤트 만들기' : '수정 완료'}
        </Button>
        {mode === 'create' && <p className="mt-2 text-center text-xs text-muted-foreground">만들어도 알림은 가지 않아요. 알리려면 공지로 발행해요.</p>}
      </StepFooter>
    </form>
  )
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-xs text-destructive" role="alert">
      {children}
    </p>
  )
}
