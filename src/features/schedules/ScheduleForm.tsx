import { useState, type FormEvent, type ReactNode } from 'react'
import { Chip } from '@/components/Chip'
import { FieldLabel, StepFooter } from '@/components/form/StepLayout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { scheduleKindLabel } from '@/features/content/labels'
import {
  MEMO_MAX,
  OFFICIAL_KINDS,
  PLACE_MAX,
  SCHEDULE_KINDS,
  TITLE_MAX,
  TITLE_MIN,
} from '@/features/schedules/api'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'
import type { ApiError } from '@/lib/api'

export interface ScheduleFormValues {
  kind: string | null
  title: string
  startDate: string
  /** 기간 일정이 아니면 '' */
  endDate: string
  place: string
  memo: string
}

interface Props {
  mode: 'create' | 'edit'
  initial: ScheduleFormValues
  /** 동아리 · 학사 분류는 운영진만 고를 수 있다 */
  staff: boolean
  pending: boolean
  error: ApiError | null
  formError: string | null
  onSubmit: (values: ScheduleFormValues, allowLeave: () => void) => void
}

/** 일정 등록 · 수정 공통 — 분류 · 제목 · 날짜(기간 가능) · 장소 · 메모 (F5-02) */
export function ScheduleForm({ mode, initial, staff, pending, error, formError, onSubmit }: Props) {
  const [values, setValues] = useState(initial)
  const [period, setPeriod] = useState(initial.endDate !== '')
  const [triedSubmit, setTriedSubmit] = useState(false)

  const kinds = SCHEDULE_KINDS.filter((k) => staff || !OFFICIAL_KINDS.includes(k))
  const title = values.title.trim()
  const endDate = period ? values.endDate : ''
  const changed =
    values.kind !== initial.kind ||
    title !== initial.title.trim() ||
    values.startDate !== initial.startDate ||
    endDate !== initial.endDate ||
    values.place.trim() !== initial.place.trim() ||
    values.memo.trim() !== initial.memo.trim()
  const allowLeave = useLeaveGuard(
    changed && !pending,
    mode === 'create' ? '일정 등록을 그만둘까요? 입력한 내용은 사라져요.' : '수정을 그만둘까요? 바꾼 내용은 사라져요.',
  )

  function set(patch: Partial<ScheduleFormValues>) {
    setValues((v) => ({ ...v, ...patch }))
  }

  const kindError = (triedSubmit && values.kind == null ? '분류를 골라 주세요.' : null) ?? error?.fieldMessage('kind')
  const titleError =
    (triedSubmit && title.length < TITLE_MIN ? `제목을 ${TITLE_MIN}자 이상 써 주세요.` : null) ??
    error?.fieldMessage('title')
  const startError = (triedSubmit && !values.startDate ? '날짜를 골라 주세요.' : null) ?? error?.fieldMessage('startDate')
  const endError =
    (triedSubmit && period && !values.endDate ? '끝나는 날을 골라 주세요.' : null) ??
    (period && values.endDate && values.startDate && values.endDate < values.startDate
      ? '끝나는 날은 시작하는 날과 같거나 뒤여야 해요.'
      : null) ??
    error?.fieldMessage('endDate') ??
    error?.fieldMessage('periodValid')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTriedSubmit(true)
    const invalid =
      values.kind == null ||
      title.length < TITLE_MIN ||
      !values.startDate ||
      (period && (!values.endDate || values.endDate < values.startDate))
    if (invalid || pending) return
    onSubmit({ ...values, endDate }, allowLeave)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 className="mb-8 text-[22px] leading-snug font-bold text-title">
        {mode === 'create' ? '일정 등록' : '일정 수정'}
      </h1>

      <div className="space-y-8">
        <section>
          <FieldLabel>분류</FieldLabel>
          <div className="flex flex-wrap gap-2" role="group" aria-label="분류">
            {kinds.map((k) => (
              <Chip key={k} selected={values.kind === k} onClick={() => set({ kind: k })}>
                {scheduleKindLabel(k)}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {staff
              ? '동아리 · 학사 일정은 공식 일정으로 표시돼요.'
              : '동아리 · 학사 일정은 운영진이 등록해요.'}
          </p>
          {kindError && <FieldError>{kindError}</FieldError>}
        </section>

        <section>
          <FieldLabel htmlFor="title" aside={`${values.title.length} / ${TITLE_MAX}`}>
            제목
          </FieldLabel>
          <Input
            id="title"
            maxLength={TITLE_MAX}
            placeholder="예) 교내 해커톤 참가 신청 마감"
            className="h-12 bg-card"
            aria-invalid={titleError ? true : undefined}
            value={values.title}
            onChange={(e) => set({ title: e.target.value })}
          />
          {titleError && <FieldError>{titleError}</FieldError>}
        </section>

        <section>
          <FieldLabel htmlFor="startDate">{period ? '시작하는 날' : '날짜'}</FieldLabel>
          <Input
            id="startDate"
            type="date"
            className="h-12 bg-card"
            aria-invalid={startError ? true : undefined}
            value={values.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
          />
          {startError && <FieldError>{startError}</FieldError>}

          <label className="mt-3 flex items-center gap-2.5 text-sm text-title">
            <Checkbox checked={period} onCheckedChange={(on) => setPeriod(on === true)} />
            며칠에 걸친 일정이에요
          </label>

          {period && (
            <div className="mt-4">
              <FieldLabel htmlFor="endDate">끝나는 날</FieldLabel>
              <Input
                id="endDate"
                type="date"
                min={values.startDate || undefined}
                className="h-12 bg-card"
                aria-invalid={endError ? true : undefined}
                value={values.endDate}
                onChange={(e) => set({ endDate: e.target.value })}
              />
            </div>
          )}
          {endError && <FieldError>{endError}</FieldError>}
          <p className="mt-2 text-xs text-muted-foreground">마감 3일 전부터 캘린더에서 강조돼요.</p>
        </section>

        <section>
          <FieldLabel htmlFor="place" aside={`${values.place.length} / ${PLACE_MAX}`}>
            장소 <span className="font-normal text-muted-foreground">(선택)</span>
          </FieldLabel>
          <Input
            id="place"
            maxLength={PLACE_MAX}
            placeholder="예) 학생회관 301호"
            className="h-12 bg-card"
            value={values.place}
            onChange={(e) => set({ place: e.target.value })}
          />
          <OptionalFieldError message={error?.fieldMessage('place')} />
        </section>

        <section>
          <FieldLabel htmlFor="memo" aside={`${values.memo.length} / ${MEMO_MAX}`}>
            메모 <span className="font-normal text-muted-foreground">(선택)</span>
          </FieldLabel>
          <textarea
            id="memo"
            maxLength={MEMO_MAX}
            rows={5}
            placeholder="신청 링크나 준비물을 적어 두면 좋아요."
            className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            value={values.memo}
            onChange={(e) => set({ memo: e.target.value })}
          />
          <OptionalFieldError message={error?.fieldMessage('memo')} />
        </section>
      </div>

      <StepFooter>
        {formError && (
          <p className="mb-3 text-center text-sm text-destructive" role="alert">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" className="h-12 w-full" disabled={pending || (mode === 'edit' && !changed)}>
          {pending ? '저장하는 중…' : mode === 'create' ? '일정 등록' : '수정 완료'}
        </Button>
      </StepFooter>
    </form>
  )
}

function FieldError({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-xs text-destructive" role="alert">
      {children}
    </p>
  )
}

function OptionalFieldError({ message }: { message: string | undefined }) {
  return message ? <FieldError>{message}</FieldError> : null
}
