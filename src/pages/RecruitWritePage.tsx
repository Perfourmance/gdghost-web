import { useState, type FormEvent, type ReactNode } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { Chip } from '@/components/Chip'
import { FieldLabel, StepFooter } from '@/components/form/StepLayout'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { recruitKindLabel } from '@/features/content/labels'
import {
  CAPACITY_MAX,
  CAPACITY_MIN,
  MAX_AHEAD_DAYS,
  MEMO_MAX,
  RECRUIT_KINDS,
  recruitErrorMessage,
  TITLE_MAX,
  TITLE_MIN,
  useCreateRecruit,
  type RecruitInput,
} from '@/features/recruits/api'
import { kstToIso } from '@/features/recruits/format'
import { useScheduleDetail } from '@/features/schedules/api'
import { todayKst } from '@/features/schedules/calendar'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'
import { toApiError } from '@/lib/api'
import { useNowEveryMinute } from '@/lib/time'

/** 오늘(한국)에서 며칠 뒤 "2026-11-05" */
function kstDatePlus(days: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(Date.now() + days * 86_400_000))
}

/** 모집 열기 (S34) — 종류 · 제목 · 날짜와 시간 · 인원 · 메모 (F5-03). 일정 상세에서 오면 그 일정에 연결한다 */
export function RecruitWritePage() {
  const { data: me } = useMe()
  const location = useLocation()

  if (!me) {
    return (
      <SubPageLayout fallback="/recruits">
        <LockPanel next={location.pathname + location.search} title="모집은 부원만 열 수 있어요" buttonText="로그인하고 모집 열기" />
      </SubPageLayout>
    )
  }
  return <RecruitForm />
}

function RecruitForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const create = useCreateRecruit()
  const keyFor = useIdempotencyKey()

  const [scheduleId, setScheduleId] = useState<number | null>(() => {
    const id = Number(params.get('scheduleId'))
    return Number.isInteger(id) && id > 0 ? id : null
  })
  const schedule = useScheduleDetail(scheduleId ?? 0, scheduleId != null)

  const [kind, setKind] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [capacity, setCapacity] = useState(4)
  const [memo, setMemo] = useState('')
  const [triedSubmit, setTriedSubmit] = useState(false)

  const pending = create.isPending
  const dirty = kind != null || title.trim() !== '' || date !== '' || time !== '' || memo.trim() !== ''
  const allowLeave = useLeaveGuard(dirty && !pending, '모집 열기를 그만둘까요? 입력한 내용은 사라져요.')

  const today = todayKst()
  const lastDay = kstDatePlus(MAX_AHEAD_DAYS)
  const meetAt = date && time ? kstToIso(date, time) : null
  const meetTime = meetAt ? Date.parse(meetAt) : null
  const now = useNowEveryMinute()
  const past = meetTime != null && meetTime <= now
  const tooFar = meetTime != null && meetTime > now + MAX_AHEAD_DAYS * 86_400_000

  const error = create.error ? toApiError(create.error) : null
  const kindError = (triedSubmit && kind == null ? '종류를 골라 주세요.' : null) ?? error?.fieldMessage('kind')
  const titleError =
    (triedSubmit && title.trim().length < TITLE_MIN ? `제목을 ${TITLE_MIN}자 이상 써 주세요.` : null) ??
    error?.fieldMessage('title')
  const timeError =
    (triedSubmit && (!date || !time) ? '만나는 날짜와 시간을 골라 주세요.' : null) ??
    (past ? '지난 시각은 고를 수 없어요.' : null) ??
    (tooFar ? `${MAX_AHEAD_DAYS}일 안으로 골라 주세요.` : null) ??
    error?.fieldMessage('meetAt')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTriedSubmit(true)
    if (kind == null || title.trim().length < TITLE_MIN || !meetAt || past || tooFar || pending) return
    const input: RecruitInput = {
      kind,
      title: title.trim(),
      meetAt,
      capacity,
      memo: memo.trim() === '' ? null : memo.trim(),
      scheduleId,
    }
    create.mutate(
      { input, key: keyFor(input) },
      {
        onSuccess: (created) => {
          allowLeave()
          navigate(`/recruits?open=${created.id}`, { replace: true })
        },
      },
    )
  }

  return (
    <SubPageLayout fallback={scheduleId ? `/schedules/${scheduleId}` : '/recruits'}>
      <form onSubmit={handleSubmit} noValidate>
        <h1 className="mb-8 text-[22px] leading-snug font-bold text-title">모집 열기</h1>

        {scheduleId != null && (
          <div className="-mt-4 mb-8 flex items-start justify-between gap-3 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-text">
            <p>
              {schedule.data ? (
                <>
                  <b className="font-bold">{schedule.data.title}</b> 일정에 연결돼요.
                </>
              ) : schedule.isError ? (
                '연결할 일정을 찾을 수 없어요.'
              ) : (
                '연결할 일정을 불러오는 중…'
              )}
              <span className="mt-0.5 block text-xs text-brand-text/80">일정 상세에서 이 모집이 보여요.</span>
            </p>
            <button
              type="button"
              aria-label="일정 연결 빼기"
              onClick={() => setScheduleId(null)}
              className="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-brand-text/10"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="space-y-8">
          <section>
            <FieldLabel>종류</FieldLabel>
            <div className="flex flex-wrap gap-2" role="group" aria-label="종류">
              {RECRUIT_KINDS.map((k) => (
                <Chip key={k} selected={kind === k} onClick={() => setKind(k)}>
                  {recruitKindLabel(k)}
                </Chip>
              ))}
            </div>
            {kindError && <FieldError>{kindError}</FieldError>}
          </section>

          <section>
            <FieldLabel htmlFor="title" aside={`${title.length} / ${TITLE_MAX}`}>
              제목
            </FieldLabel>
            <Input
              id="title"
              maxLength={TITLE_MAX}
              placeholder="예) 금요일 저녁 홍대입구역까지 택시 같이 타요"
              className="h-12 bg-card"
              aria-invalid={titleError ? true : undefined}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {titleError && <FieldError>{titleError}</FieldError>}
          </section>

          <section>
            <FieldLabel htmlFor="date">만나는 날짜와 시간</FieldLabel>
            <div className="grid grid-cols-[3fr_2fr] gap-2">
              <Input
                id="date"
                type="date"
                min={today}
                max={lastDay}
                className="h-12 bg-card"
                aria-invalid={timeError ? true : undefined}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Input
                id="time"
                type="time"
                aria-label="시간"
                className="h-12 bg-card"
                aria-invalid={timeError ? true : undefined}
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            {timeError && <FieldError>{timeError}</FieldError>}
            <p className="mt-2 text-xs text-muted-foreground">이 시각이 지나면 모집이 저절로 마감돼요.</p>
          </section>

          <section>
            <FieldLabel>인원 (나 포함)</FieldLabel>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="인원 줄이기"
                disabled={capacity <= CAPACITY_MIN}
                onClick={() => setCapacity((c) => Math.max(CAPACITY_MIN, c - 1))}
              >
                <Minus />
              </Button>
              <p className="w-14 text-center text-lg font-bold text-title tabular-nums" aria-live="polite">
                {capacity}명
              </p>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="인원 늘리기"
                disabled={capacity >= CAPACITY_MAX}
                onClick={() => setCapacity((c) => Math.min(CAPACITY_MAX, c + 1))}
              >
                <Plus />
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {CAPACITY_MIN}–{CAPACITY_MAX}명. 정원이 차면 저절로 마감돼요.
            </p>
            {error?.fieldMessage('capacity') && <FieldError>{error.fieldMessage('capacity')}</FieldError>}
          </section>

          <section>
            <FieldLabel htmlFor="memo" aside={`${memo.length} / ${MEMO_MAX}`}>
              메모 <span className="font-normal text-muted-foreground">(선택)</span>
            </FieldLabel>
            <textarea
              id="memo"
              maxLength={MEMO_MAX}
              rows={4}
              placeholder="만날 장소나 연락 방법(오픈채팅 링크 등)을 적어 주세요."
              className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
            <p className="mt-2 text-xs text-muted-foreground">참여해도 알림이 가지 않아서, 참여한 사람이 메모를 보고 연락해요.</p>
          </section>
        </div>

        <StepFooter>
          {recruitErrorMessage(error) && (
            <p className="mb-3 text-center text-sm text-destructive" role="alert">
              {recruitErrorMessage(error)}
            </p>
          )}
          <Button type="submit" size="lg" className="h-12 w-full" disabled={pending}>
            {pending ? '여는 중…' : '모집 열기'}
          </Button>
        </StepFooter>
      </form>
    </SubPageLayout>
  )
}

function FieldError({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-xs text-destructive" role="alert">
      {children}
    </p>
  )
}
