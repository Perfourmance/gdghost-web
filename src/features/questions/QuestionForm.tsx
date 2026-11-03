import { useState, type FormEvent } from 'react'
import { Chip } from '@/components/Chip'
import { FieldLabel, StepFooter } from '@/components/form/StepLayout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { questionCategoryLabel } from '@/features/content/labels'
import { BODY_MAX, QUESTION_CATEGORIES, TITLE_MAX, TITLE_MIN } from '@/features/questions/write'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'
import type { ApiError } from '@/lib/api'

export interface QuestionFormValues {
  category: string | null
  title: string
  body: string
  anonymous: boolean
}

interface Props {
  mode: 'create' | 'edit'
  initial: QuestionFormValues
  pending: boolean
  /** 칸별 에러(errors[])는 칸 아래, 나머지는 formError로 */
  error: ApiError | null
  formError: string | null
  /** 저장에 성공해 화면을 옮기기 전에 allowLeave()를 부른다 */
  onSubmit: (values: QuestionFormValues, allowLeave: () => void) => void
}

/** 질문 작성 · 수정 공통 — 분류 → 제목 → 본문 → 익명 여부 (F2-02). 익명 여부는 수정에서 바꿀 수 없다 */
export function QuestionForm({ mode, initial, pending, error, formError, onSubmit }: Props) {
  const [values, setValues] = useState(initial)
  const [triedSubmit, setTriedSubmit] = useState(false)

  const title = values.title.trim()
  const titleInvalid = title.length < TITLE_MIN
  const changed =
    values.category !== initial.category ||
    title !== initial.title.trim() ||
    values.body.trim() !== initial.body.trim() ||
    values.anonymous !== initial.anonymous
  const allowLeave = useLeaveGuard(
    changed && !pending,
    mode === 'create' ? '질문 작성을 그만둘까요? 입력한 내용은 사라져요.' : '수정을 그만둘까요? 바꾼 내용은 사라져요.',
  )

  function set(patch: Partial<QuestionFormValues>) {
    setValues((v) => ({ ...v, ...patch }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTriedSubmit(true)
    if (values.category == null || titleInvalid || pending) return
    onSubmit(values, allowLeave)
  }

  const categoryError =
    (triedSubmit && values.category == null ? '분류를 골라 주세요.' : null) ?? error?.fieldMessage('category')
  const titleError =
    (triedSubmit && titleInvalid ? `제목을 ${TITLE_MIN}자 이상 써 주세요.` : null) ?? error?.fieldMessage('title')
  const bodyError = error?.fieldMessage('body')

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 className="mb-8 text-[22px] leading-snug font-bold text-title">
        {mode === 'create' ? '선배에게 물어보기' : '질문 수정'}
      </h1>

      <div className="space-y-8">
        <section>
          <FieldLabel>분류</FieldLabel>
          <div className="flex flex-wrap gap-2" role="group" aria-label="분류">
            {QUESTION_CATEGORIES.map((c) => (
              <Chip key={c} selected={values.category === c} onClick={() => set({ category: c })}>
                {questionCategoryLabel(c)}
              </Chip>
            ))}
          </div>
          {categoryError && <FieldError>{categoryError}</FieldError>}
        </section>

        <section>
          <FieldLabel htmlFor="title" aside={`${values.title.length} / ${TITLE_MAX}`}>
            제목
          </FieldLabel>
          <Input
            id="title"
            maxLength={TITLE_MAX}
            placeholder="예) 신입 이력서에 학점 쓰는 게 맞나요?"
            className="h-12 bg-card"
            aria-invalid={titleError ? true : undefined}
            value={values.title}
            onChange={(e) => set({ title: e.target.value })}
          />
          {titleError && <FieldError>{titleError}</FieldError>}
        </section>

        <section>
          <FieldLabel htmlFor="body" aside={`${values.body.length} / ${BODY_MAX}`}>
            본문 <span className="font-normal text-muted-foreground">(선택)</span>
          </FieldLabel>
          <textarea
            id="body"
            maxLength={BODY_MAX}
            rows={8}
            placeholder="상황을 자세히 적을수록 맞는 선배가 답하기 쉬워요."
            aria-invalid={bodyError ? true : undefined}
            className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
            value={values.body}
            onChange={(e) => set({ body: e.target.value })}
          />
          {bodyError && <FieldError>{bodyError}</FieldError>}
        </section>

        <section>
          {mode === 'create' ? (
            <>
              <label className="flex items-center gap-2.5 text-sm font-bold text-title">
                <Checkbox checked={values.anonymous} onCheckedChange={(on) => set({ anonymous: on === true })} />
                익명으로 올리기
              </label>
              {/* 기능명세 F2-05 고지 문구 */}
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                익명이어도 작성자 정보는 서버에 저장됩니다. 운영진을 포함해 누구도 화면에서 볼 수 없습니다.
                <br />
                익명 여부는 올린 뒤에 바꿀 수 없어요.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {values.anonymous ? '익명 질문이에요.' : '닉네임으로 올린 질문이에요.'} 익명 여부는 바꿀 수 없어요.
            </p>
          )}
        </section>
      </div>

      <StepFooter>
        {formError && (
          <p className="mb-3 text-center text-sm text-destructive" role="alert">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" className="h-12 w-full" disabled={pending || (mode === 'edit' && !changed)}>
          {pending ? '저장하는 중…' : mode === 'create' ? '질문 올리기' : '수정 완료'}
        </Button>
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
