import { useState, type FormEvent, type ReactNode } from 'react'
import {
  FieldError,
  Hint,
  IconSend,
  LinedTextarea,
  Paper,
  PaperLabel,
  Segmented,
  StampPicker,
  TitleInput,
} from '@/components/story'
import { questionCategoryLabel } from '@/features/content/labels'
import { BODY_MAX, QUESTION_CATEGORIES, TITLE_MAX, TITLE_MIN } from '@/features/questions/write'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'
import type { ApiError } from '@/lib/api'
import '@/styles/questions.css'

export interface QuestionFormValues {
  category: string | null
  title: string
  body: string
  anonymous: boolean
}

interface Props {
  mode: 'create' | 'edit'
  initial: QuestionFormValues
  /** 보낸 사람 고르기에 보일 내 닉네임 */
  nickname: string
  pending: boolean
  /** 칸별 에러(errors[])는 칸 아래, 나머지는 formError로 */
  error: ApiError | null
  formError: string | null
  /** 저장에 성공해 화면을 옮기기 전에 allowLeave()를 부른다 */
  onSubmit: (values: QuestionFormValues, allowLeave: () => void) => void
  /** 제목 위 안내 (선배 지목 등) */
  notice?: ReactNode
}

/**
 * 질문 작성 · 수정 공통 — 시안 write-final '편지지'. 분류 우표 → 제목 → 본문 → 보낸 사람 (F2-02).
 * 익명 여부는 수정에서 바꿀 수 없다
 */
export function QuestionForm({ mode, initial, nickname, pending, error, formError, onSubmit, notice }: Props) {
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
    mode === 'create' ? '질문 작성을 그만둘까요? 입력한 내용은 저장되지 않아요.' : '수정을 그만둘까요? 변경 사항은 저장되지 않아요.',
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
    (triedSubmit && values.category == null ? '분류 우표를 하나 골라 주세요.' : null) ?? error?.fieldMessage('category')
  const titleError =
    (triedSubmit && titleInvalid ? `제목을 ${TITLE_MIN}자 이상 써 주세요.` : null) ?? error?.fieldMessage('title')
  const bodyError = error?.fieldMessage('body')
  const disabled = pending || (mode === 'edit' && !changed)

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="gh-wh">
        <h1>{mode === 'create' ? '오늘 밤 띄울 질문' : '편지 고치기'}</h1>
        <p>{mode === 'create' ? '작은 고민도 괜찮아요. 분류만 골라 주세요.' : '고친 내용은 바로 다시 띄워져요.'}</p>
      </div>
      {notice && <div className="px-4 pb-3">{notice}</div>}

      <Paper>
        <PaperLabel aside="하나 골라 주세요">어떤 이야기예요?</PaperLabel>
        <StampPicker
          label="분류"
          error={categoryError != null}
          value={values.category}
          onChange={(c) => set({ category: c })}
          options={QUESTION_CATEGORIES.map((c) => ({ value: c, label: questionCategoryLabel(c) }))}
        />
        <FieldError>{categoryError}</FieldError>

        <PaperLabel htmlFor="title" aside={`${values.title.length} / ${TITLE_MAX}`}>
          제목
        </PaperLabel>
        <TitleInput
          id="title"
          maxLength={TITLE_MAX}
          placeholder="예: 신입 이력서에 학점을 꼭 써야 하나요?"
          aria-invalid={titleError ? true : undefined}
          value={values.title}
          // 제목은 한 줄 — 엔터로 줄을 바꾸지 않는다
          onChange={(e) => set({ title: e.target.value.replace(/\n/g, ' ') })}
        />
        <FieldError>{titleError}</FieldError>

        <PaperLabel htmlFor="body" aside={`선택 · ${values.body.length} / ${BODY_MAX}`}>
          하고 싶은 이야기
        </PaperLabel>
        <LinedTextarea
          id="body"
          maxLength={BODY_MAX}
          placeholder="어떤 상황인지 구체적으로 적어 주세요."
          aria-invalid={bodyError ? true : undefined}
          value={values.body}
          onChange={(e) => set({ body: e.target.value })}
        />
        <FieldError>{bodyError}</FieldError>

        <div className="gh-wfrom">
          <PaperLabel>보낸 사람</PaperLabel>
          {mode === 'create' ? (
            <>
              <Segmented
                label="보낸 사람"
                value={values.anonymous ? 'anon' : 'me'}
                onChange={(v) => set({ anonymous: v === 'anon' })}
                options={[
                  { value: 'me', label: nickname },
                  { value: 'anon', label: '익명', ghost: true },
                ]}
              />
              {/* 기능명세 F2-05 고지 */}
              <Hint>
                {values.anonymous ? '운영진에게도 이름이 보이지 않고, 기록은 서버에만 남아요. ' : '닉네임으로 보내요. '}
                <b>올린 뒤에는 바꿀 수 없어요.</b>
              </Hint>
            </>
          ) : (
            <Hint>
              {values.anonymous ? '익명 질문이에요.' : `${nickname}(으)로 보낸 질문이에요.`} <b>보낸 사람은 바꿀 수 없어요.</b>
            </Hint>
          )}
        </div>

        <button type="submit" className="gh-send is-big" disabled={disabled} aria-label={mode === 'create' ? '질문 띄우기' : '고친 편지 저장'}>
          <IconSend />
        </button>
      </Paper>
      <p className={formError ? 'gh-sendcap is-err' : 'gh-sendcap'} role={formError ? 'alert' : undefined}>
        {formError ?? (pending ? '띄우는 중…' : mode === 'create' ? '질문 띄우기' : '고친 편지 저장')}
      </p>
    </form>
  )
}
