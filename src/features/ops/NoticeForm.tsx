import { useState, type FormEvent } from 'react'
import { FieldLabel, StepFooter } from '@/components/form/StepLayout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { NOTICE_BODY_MAX, NOTICE_TITLE_MAX, NOTICE_TITLE_MIN, type NoticeInput } from '@/features/ops/content'
import { todayKst } from '@/features/schedules/calendar'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'

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
  const allowLeave = useLeaveGuard(changed && !pending, '작성을 그만둘까요? 입력한 내용은 사라져요.')

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
    <form onSubmit={submit} noValidate>
      <h1 className="mb-8 text-[22px] leading-snug font-bold text-title">{mode === 'create' ? '공지 쓰기' : '공지 수정'}</h1>
      <div className="space-y-8">
        <section>
          <FieldLabel htmlFor="notice-title" aside={`${values.title.length} / ${NOTICE_TITLE_MAX}`}>
            제목
          </FieldLabel>
          <Input
            id="notice-title"
            maxLength={NOTICE_TITLE_MAX}
            className="h-12 bg-card"
            placeholder="예) 11월 정기 세션 안내"
            value={values.title}
            onChange={(e) => set({ title: e.target.value })}
          />
          {tried && titleInvalid && <FieldError>제목을 {NOTICE_TITLE_MIN}자 이상 써 주세요.</FieldError>}
        </section>
        <section>
          <FieldLabel htmlFor="notice-body" aside={`${values.body.length} / ${NOTICE_BODY_MAX}`}>
            본문
          </FieldLabel>
          <textarea
            id="notice-body"
            rows={10}
            maxLength={NOTICE_BODY_MAX}
            placeholder="링크도 넣을 수 있어요."
            value={values.body}
            onChange={(e) => set({ body: e.target.value })}
            className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          />
          {tried && bodyInvalid && <FieldError>본문을 써 주세요.</FieldError>}
        </section>
        <section className="space-y-3">
          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox checked={values.isPinned} onCheckedChange={(on) => set({ isPinned: on === true })} className="mt-0.5" />
            <span>
              <b className="text-title">홈 위에 고정</b>
              <span className="block text-xs text-muted-foreground">홈 맨 위 `운영진 공지`에 보여요.</span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox checked={values.isMustRead} onCheckedChange={(on) => set({ isMustRead: on === true })} className="mt-0.5" />
            <span>
              <b className="text-title">필독</b>
              <span className="block text-xs text-muted-foreground">부원이 `확인했어요`를 누르게 하고, 누가 확인했는지 세요.</span>
            </span>
          </label>
        </section>
        <section>
          <FieldLabel htmlFor="notice-due">
            마감일 <span className="font-normal text-muted-foreground">(선택)</span>
          </FieldLabel>
          <div className="flex gap-2">
            <Input
              id="notice-due"
              type="date"
              min={mode === 'create' ? todayKst() : undefined}
              className="h-11 bg-card"
              value={values.dueDate ?? ''}
              onChange={(e) => set({ dueDate: e.target.value || null })}
            />
            {values.dueDate && (
              <Button type="button" variant="ghost" className="h-11" onClick={() => set({ dueDate: null })}>
                지우기
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">없으면 상시 공지예요.</p>
        </section>
      </div>
      <StepFooter>
        {error && (
          <p className="mb-3 text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="h-12 w-full" disabled={pending || (mode === 'edit' && !changed)}>
          {pending ? '저장하는 중…' : mode === 'create' ? '공지 올리기' : '수정 완료'}
        </Button>
        {mode === 'create' && (
          <p className="mt-2 text-center text-xs text-muted-foreground">올리면 부원 디스코드 채널에도 올라가요.</p>
        )}
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
