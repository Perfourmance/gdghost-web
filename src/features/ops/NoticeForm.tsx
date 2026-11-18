import { useState, type FormEvent } from 'react'
import { FieldError, Hint, LinedTextarea, PaperInput, PaperLabel, TitleInput, Toggle, WriteForm } from '@/components/story'
import { NOTICE_BODY_MAX, NOTICE_TITLE_MAX, NOTICE_TITLE_MIN, type NoticeInput } from '@/features/ops/content'
import { todayKst } from '@/features/schedules/calendar'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'
import '@/styles/feed.css'

/** 공지 작성 · 수정 공통 (S71) — 제목 · 본문 · 상단 고정 · 필독 · 마감일 */
export function NoticeForm({
  mode,
  initial,
  pending,
  error,
  onSubmit,
}: {
  mode: 'create' | 'edit'
  initial: NoticeInput
  pending: boolean
  error: string | null
  onSubmit: (values: NoticeInput, allowLeave: () => void) => void
}) {
  const [values, setValues] = useState(initial)
  const [tried, setTried] = useState(false)
  const title = values.title.trim()
  const body = values.body.trim()
  const titleInvalid = title.length < NOTICE_TITLE_MIN
  const bodyInvalid = body.length === 0
  const changed = JSON.stringify({ ...values, title, body }) !== JSON.stringify({ ...initial, title: initial.title.trim(), body: initial.body.trim() })
  const allowLeave = useLeaveGuard(changed && !pending, '작성을 그만둘까요? 입력한 내용은 저장되지 않아요.')

  function set(patch: Partial<NoticeInput>) {
    setValues((v) => ({ ...v, ...patch }))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setTried(true)
    if (titleInvalid || bodyInvalid || pending) return
    onSubmit({ ...values, title, body }, allowLeave)
  }

  return (
    <WriteForm
      title={mode === 'create' ? '게시판에 공지 붙이기' : '공지 고치기'}
      description={mode === 'create' ? '공지로 올리면 부원 디스코드 채널에도 올라가요.' : undefined}
      submitLabel={mode === 'create' ? '공지 올리기' : '고친 공지 저장'}
      pendingLabel="저장하는 중…"
      pending={pending}
      disabled={mode === 'edit' && !changed}
      error={error}
      onSubmit={submit}
    >
      <PaperLabel htmlFor="notice-title" aside={`${values.title.length} / ${NOTICE_TITLE_MAX}`}>
        제목
      </PaperLabel>
      <TitleInput
        id="notice-title"
        rows={1}
        maxLength={NOTICE_TITLE_MAX}
        placeholder="예: 11월 정기 세션 안내"
        value={values.title}
        onChange={(e) => set({ title: e.target.value.replace(/\n/g, ' ') })}
      />
      {tried && titleInvalid && <FieldError>제목을 {NOTICE_TITLE_MIN}자 이상 써 주세요.</FieldError>}

      <PaperLabel htmlFor="notice-body" aside={`${values.body.length} / ${NOTICE_BODY_MAX}`}>
        본문
      </PaperLabel>
      <LinedTextarea id="notice-body" rows={10} maxLength={NOTICE_BODY_MAX} placeholder="링크도 넣을 수 있어요." value={values.body} onChange={(e) => set({ body: e.target.value })} />
      {tried && bodyInvalid && <FieldError>본문을 써 주세요.</FieldError>}

      <PaperLabel>붙이는 방법</PaperLabel>
      <div className="gh-pswitch">
        <div>
          <b>홈 위에 고정</b>
          <span>홈 ‘마을 게시판’ 맨 위에 보여요.</span>
        </div>
        <Toggle small label="홈 위에 고정" checked={values.isPinned} onChange={(on) => set({ isPinned: on })} />
      </div>
      <div className="gh-pswitch">
        <div>
          <b>필독</b>
          <span>‘확인했어요’ 버튼이 생기고 확인한 부원 수를 세요.</span>
        </div>
        <Toggle small label="필독" checked={values.isMustRead} onChange={(on) => set({ isMustRead: on })} />
      </div>

      <PaperLabel htmlFor="notice-due" aside="선택">
        확인 마감일
      </PaperLabel>
      <div className="gh-tag-row">
        <PaperInput
          id="notice-due"
          type="date"
          min={mode === 'create' ? todayKst() : undefined}
          value={values.dueDate ?? ''}
          onChange={(e) => set({ dueDate: e.target.value || null })}
        />
        {values.dueDate && (
          <button type="button" onClick={() => set({ dueDate: null })}>
            지우기
          </button>
        )}
      </div>
      <Hint>비워 두면 상시 공지로 올라가요.</Hint>
    </WriteForm>
  )
}
