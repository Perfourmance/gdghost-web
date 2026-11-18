import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import {
  FieldError,
  Hint,
  IconX,
  LinedTextarea,
  PaperChips,
  PaperInput,
  PaperLabel,
  StorySubPage,
  TitleInput,
  WriteForm,
} from '@/components/story'
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
        <LockPanel next={location.pathname + location.search} title="모집은 부원만 열 수 있어요." buttonText="로그인하고 모집 열기" />
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
  const allowLeave = useLeaveGuard(dirty && !pending, '모집 열기를 그만둘까요? 입력한 내용은 저장되지 않아요.')

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
    (triedSubmit && (!date || !time) ? '만날 날짜와 시간을 골라 주세요.' : null) ??
    (past ? '지금보다 늦은 시간을 골라 주세요.' : null) ??
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
    <StorySubPage fallback={scheduleId ? `/schedules/${scheduleId}` : '/recruits'} className="gh-qwrite">
      <WriteForm
        title="빈 자리 등불 켜기"
        description="같이 갈 사람을 모아요. 정원이 차거나 시간이 지나면 닫혀요."
        notice={
          scheduleId != null && (
            <div className="gh-link-note">
              <p>
                {schedule.data ? (
                  <>
                    <b>{schedule.data.title}</b> 일정에 이어져요.
                  </>
                ) : schedule.isError ? (
                  '이을 일정을 찾을 수 없어요.'
                ) : (
                  '이을 일정을 불러오는 중…'
                )}
                <small>모집을 열면 일정 상세에서도 보여요.</small>
              </p>
              <button type="button" aria-label="일정 연결 빼기" onClick={() => setScheduleId(null)}>
                <IconX />
              </button>
            </div>
          )
        }
        submitLabel="모집 열기"
        pendingLabel="여는 중…"
        pending={pending}
        error={recruitErrorMessage(error)}
        onSubmit={handleSubmit}
      >
        <PaperLabel aside="하나 골라 주세요">무엇을 모아요?</PaperLabel>
        <PaperChips
          label="종류"
          options={RECRUIT_KINDS.map((k) => ({ value: k, label: recruitKindLabel(k) }))}
          isOn={(k) => kind === k}
          onToggle={setKind}
        />
        <FieldError>{kindError}</FieldError>

        <PaperLabel htmlFor="title" aside={`${title.length} / ${TITLE_MAX}`}>
          제목
        </PaperLabel>
        <TitleInput
          id="title"
          rows={1}
          maxLength={TITLE_MAX}
          placeholder="예: 금요일 저녁 홍대입구역행 택시 동승"
          aria-invalid={titleError ? true : undefined}
          value={title}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
        />
        <FieldError>{titleError}</FieldError>

        <PaperLabel htmlFor="date">만나는 날짜와 시간</PaperLabel>
        <div className="gh-two-in">
          <PaperInput id="date" type="date" min={today} max={lastDay} aria-invalid={timeError ? true : undefined} value={date} onChange={(e) => setDate(e.target.value)} />
          <PaperInput id="time" type="time" aria-label="시간" aria-invalid={timeError ? true : undefined} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <FieldError>{timeError}</FieldError>
        <Hint>이 시간이 지나면 모집이 저절로 닫혀요.</Hint>

        <PaperLabel aside={`${CAPACITY_MIN}~${CAPACITY_MAX}명`}>자리 (나 포함)</PaperLabel>
        <div className="gh-stepper">
          <button
            type="button"
            aria-label="인원 줄이기"
            disabled={capacity <= CAPACITY_MIN}
            onClick={() => setCapacity((c) => Math.max(CAPACITY_MIN, c - 1))}
          >
            −
          </button>
          <b aria-live="polite">{capacity}명</b>
          <button
            type="button"
            aria-label="인원 늘리기"
            disabled={capacity >= CAPACITY_MAX}
            onClick={() => setCapacity((c) => Math.min(CAPACITY_MAX, c + 1))}
          >
            +
          </button>
        </div>
        <Hint>정원이 차면 저절로 닫혀요.</Hint>
        <FieldError>{error?.fieldMessage('capacity')}</FieldError>

        <PaperLabel htmlFor="memo" aside={`선택 · ${memo.length} / ${MEMO_MAX}`}>
          메모
        </PaperLabel>
        <LinedTextarea id="memo" maxLength={MEMO_MAX} placeholder="만날 장소나 연락 방법을 적어 주세요." value={memo} onChange={(e) => setMemo(e.target.value)} />
        <Hint>참여 알림은 따로 가지 않아요. 참여한 사람이 메모에 적힌 방법으로 연락해요.</Hint>
      </WriteForm>
    </StorySubPage>
  )
}
