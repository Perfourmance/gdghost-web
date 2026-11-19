import { useState, type FormEvent } from 'react'
import { FieldError, Hint, LinedTextarea, PaperChips, PaperInput, PaperLabel, TitleInput, WriteForm } from '@/components/story'
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
    mode === 'create' ? '일정 등록을 그만둘까요? 입력한 내용은 저장되지 않아요.' : '수정을 그만둘까요? 변경 사항은 저장되지 않아요.',
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
      ? '종료일은 시작일과 같거나 늦어야 해요.'
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
    <WriteForm
      title={mode === 'create' ? '날 하나 띄우기' : '일정 고치기'}
      description={staff ? '동아리와 학사 일정은 공식 별로 떠요.' : '동아리와 학사 일정은 운영진이 띄워요.'}
      submitLabel={mode === 'create' ? '하늘에 띄우기' : '고친 일정 저장'}
      pendingLabel="저장하는 중…"
      pending={pending}
      disabled={mode === 'edit' && !changed}
      error={formError}
      onSubmit={handleSubmit}
    >
      <PaperLabel aside="하나 골라 주세요">어떤 날이에요?</PaperLabel>
      <PaperChips
        label="분류"
        options={kinds.map((k) => ({ value: k, label: scheduleKindLabel(k) }))}
        isOn={(k) => values.kind === k}
        onToggle={(k) => set({ kind: k })}
      />
      <FieldError>{kindError}</FieldError>

      <PaperLabel htmlFor="title" aside={`${values.title.length} / ${TITLE_MAX}`}>
        제목
      </PaperLabel>
      <TitleInput
        id="title"
        rows={1}
        maxLength={TITLE_MAX}
        placeholder="예: 교내 해커톤 참가 신청 마감"
        aria-invalid={titleError ? true : undefined}
        value={values.title}
        onChange={(e) => set({ title: e.target.value.replace(/\n/g, ' ') })}
      />
      <FieldError>{titleError}</FieldError>

      <PaperLabel>기간</PaperLabel>
      <PaperChips
        label="기간"
        options={[
          { value: 'one', label: '하루' },
          { value: 'many', label: '며칠에 걸쳐' },
        ]}
        isOn={(v) => (v === 'many') === period}
        onToggle={(v) => setPeriod(v === 'many')}
      />
      <PaperLabel htmlFor="startDate">{period ? '시작하는 날' : '날짜'}</PaperLabel>
      <PaperInput
        id="startDate"
        type="date"
        aria-invalid={startError ? true : undefined}
        value={values.startDate}
        onChange={(e) => set({ startDate: e.target.value })}
      />
      <FieldError>{startError}</FieldError>
      {period && (
        <>
          <PaperLabel htmlFor="endDate">끝나는 날</PaperLabel>
          <PaperInput
            id="endDate"
            type="date"
            min={values.startDate || undefined}
            aria-invalid={endError ? true : undefined}
            value={values.endDate}
            onChange={(e) => set({ endDate: e.target.value })}
          />
        </>
      )}
      <FieldError>{endError}</FieldError>
      <Hint>마감 3일 전부터 캘린더에서 강조해요.</Hint>

      <PaperLabel htmlFor="place" aside={`선택 · ${values.place.length} / ${PLACE_MAX}`}>
        장소
      </PaperLabel>
      <PaperInput
        id="place"
        maxLength={PLACE_MAX}
        placeholder="예: 학생회관 301호"
        value={values.place}
        onChange={(e) => set({ place: e.target.value })}
      />
      <FieldError>{error?.fieldMessage('place')}</FieldError>

      <PaperLabel htmlFor="memo" aside={`선택 · ${values.memo.length} / ${MEMO_MAX}`}>
        한마디
      </PaperLabel>
      <LinedTextarea id="memo" maxLength={MEMO_MAX} placeholder="신청 링크 · 준비물" value={values.memo} onChange={(e) => set({ memo: e.target.value })} />
      <FieldError>{error?.fieldMessage('memo')}</FieldError>
    </WriteForm>
  )
}
