import { useState, type CSSProperties } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { EmptyState, Ghost, IconPencil, IconPeople, IconTrash, Pill, PillLink, PopMenu, StorySubPage, useConfirm } from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { scheduleKindLabel } from '@/features/content/labels'
import { PersonName } from '@/features/recruits/RecruitBits'
import {
  scheduleErrorMessage,
  useDeleteSchedule,
  useScheduleDetail,
  type ScheduleDetail,
} from '@/features/schedules/api'
import { todayKst } from '@/features/schedules/calendar'
import { toApiError } from '@/lib/api'
import { formatDay } from '@/lib/time'
import { cn } from '@/lib/utils'
import '@/styles/schedules.css'

/** 일정 상세 (S31) — 메모 · 연결된 모집. 등록한 사람 · 운영진은 수정 · 삭제 */
export function ScheduleDetailPage() {
  const { scheduleId } = useParams()
  const id = Number(scheduleId)
  const validId = Number.isInteger(id) && id > 0
  const { data: me } = useMe()
  const location = useLocation()
  const detail = useScheduleDetail(id, validId && me != null)
  const [menuError, setMenuError] = useState<string | null>(null)

  if (!me) {
    return (
      <SubPageLayout fallback="/schedules">
        <LockPanel next={location.pathname} title="일정 내용은 부원만 볼 수 있어요." buttonText="로그인하고 일정 보기" />
      </SubPageLayout>
    )
  }

  const notFound = !validId || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')
  const canEdit = detail.data != null && (detail.data.mine || me.role === 'STAFF')

  return (
    <StorySubPage fallback="/schedules" right={canEdit && <ScheduleOwnerMenu scheduleId={id} onError={setMenuError} />}>
      {notFound && (
        <div className="px-4 pt-6">
          <EmptyState pose="shh" title="일정을 찾을 수 없어요" action={<PillLink to="/schedules" className="mt-3">캘린더로</PillLink>}>
            삭제됐거나 없는 일정이에요.
          </EmptyState>
        </div>
      )}

      {!notFound && detail.isPending && <div className="gh-sskel !h-60" aria-label="불러오는 중" />}

      {!notFound && detail.isError && (
        <div className="px-4 pt-4">
          <EmptyState
            row
            pose="shh"
            title="일정을 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => detail.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}

      {menuError && (
        <p className="mx-4 mb-2 text-sm text-gh-error-night" role="alert">
          {menuError}
        </p>
      )}

      {detail.data && <ScheduleBody schedule={detail.data} />}
    </StorySubPage>
  )
}

/** 분류별 별 색 — 가운데 · 밝은 쪽 · 어두운 쪽 */
const STAR_TONES: Record<string, [string, string, string]> = {
  CLUB: ['#A9C7FF', '#F2F6FF', '#6F95E0'],
  ACADEMIC: ['#7FD1C0', '#EFFFFA', '#3FA592'],
  CONTEST: ['#F2A7C3', '#FFF1F6', '#D9799E'],
  JOB: ['#C7B2FF', '#F6F1FF', '#9277E0'],
}

const dayIndex = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000)
const shortDay = (date: string) => `${Number(date.slice(5, 7))}.${Number(date.slice(8))}`

/** 기간 막대 — 점 최대 15개, 지난 날 = 분류 색, 오늘 = 앰버 */
function SpanBar({ start, end, today }: { start: string; end: string; today: string }) {
  const total = dayIndex(end) - dayIndex(start)
  const nowAt = dayIndex(today) - dayIndex(start)
  const count = Math.min(total + 1, 15)
  const dots = Array.from({ length: count }, (_, i) => (count === 1 ? 0 : Math.round((i * total) / (count - 1))))
  const nowDot = nowAt >= 0 && nowAt <= total ? dots.reduce((best, d, i) => (Math.abs(d - nowAt) < Math.abs(dots[best] - nowAt) ? i : best), 0) : -1
  const done = total === 0 ? 0 : Math.max(0, Math.min(1, nowAt / total)) * 100
  return (
    <>
      <div className="gh-sbar" style={{ '--done': `${done}%` } as CSSProperties} aria-hidden>
        {dots.map((d, i) => (
          <i key={i} className={cn(i === nowDot ? 'is-now' : d < nowAt ? 'is-p' : i === count - 1 && 'is-end')} />
        ))}
      </div>
      <div className="gh-ends">
        <span>{shortDay(start)} 시작</span>
        {nowDot >= 0 && <span className="is-now">오늘</span>}
        <span>{shortDay(end)} 마감</span>
      </div>
    </>
  )
}

function ScheduleBody({ schedule }: { schedule: ScheduleDetail }) {
  const today = todayKst()
  const end = schedule.endDate ?? schedule.startDate
  const ended = end < today
  const multi = end !== schedule.startDate
  const [c, c2, c3] = STAR_TONES[schedule.kind] ?? STAR_TONES.CLUB
  const startIn = dayIndex(schedule.startDate) - dayIndex(today)
  const status = ended
    ? '지난 일정'
    : startIn > 0
      ? `시작까지 D-${startIn}`
      : multi
        ? `오늘은 ${dayIndex(today) - dayIndex(schedule.startDate) + 1}일째`
        : '오늘이에요'
  const range = multi ? `${formatDay(schedule.startDate)} ~ ${formatDay(end)}` : formatDay(schedule.startDate)
  const authorName = schedule.author?.nickname

  return (
    <article className={cn('gh-sd', ended && 'is-ended')} style={{ '--c': c, '--c2': c2, '--c3': c3 } as CSSProperties}>
      <div className="gh-sd-top">
        <div className="gh-sd-hero">
          <div className="gh-bigstar" aria-hidden>
            <i />
          </div>
          <div className="gh-sd-tt">
            <span className="gh-lab">
              {scheduleKindLabel(schedule.kind)}
              {schedule.isOfficial && ' · ★ 공식'}
            </span>
            <h1>{schedule.title}</h1>
            <div className="gh-by">
              <b>
                <PersonName person={schedule.author} />
              </b>
              님이 띄운 별
              {schedule.updatedAt && (schedule.editedByStaff ? ' · 운영진이 고쳤어요' : ' · 고침')}
            </div>
          </div>
        </div>
      </div>

      <section className="gh-span">
        <div className="gh-span-top">
          <b>{range}</b>
          <small className={cn(ended && 'is-dim')}>{status}</small>
        </div>
        {multi && <SpanBar start={schedule.startDate} end={end} today={today} />}
        {schedule.place && (
          <div className="gh-span-place">
            <span className="font-title text-xs text-gh-sky">장소</span>
            {schedule.place}
          </div>
        )}
      </section>

      {schedule.memo && (
        <div className="gh-say">
          <small>{authorName ? `${authorName}님의 한마디` : '한마디'}</small>
          <LinkifiedText text={schedule.memo} />
        </div>
      )}

      <h2 className="gh-sd-sh">
        이 별에 이어진 모집
        {schedule.relatedRecruits.length === 0 && <small>아직 연결된 모집이 없어요</small>}
      </h2>
      {schedule.relatedRecruits.length === 0 ? (
        <div className="gh-con" aria-hidden>
          <svg viewBox="0 0 358 170" fill="none">
            <path d="M110 70 Q150 40 190 52 L262 30 L318 86 L236 120 Z" stroke="rgba(245,185,82,.5)" strokeWidth="1.6" strokeDasharray="4 6" />
            {[
              [190, 52],
              [262, 30],
              [318, 86],
              [236, 120],
            ].map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r="9" stroke="rgba(169,199,255,.5)" strokeWidth="1.6" strokeDasharray="3 3" />
            ))}
          </svg>
          <Ghost pose="thread" />
        </div>
      ) : (
        <div className="gh-rlist">
          {schedule.relatedRecruits.map((r) => (
            <Link key={r.id} to={`/recruits?open=${r.id}`}>
              <div>
                <b>{r.title}</b>
                <small>
                  {r.joinedCount} / {r.capacity}명
                </small>
              </div>
              <span className={cn('gh-rst', r.state === 'OPEN' && 'is-open')}>{r.state === 'OPEN' ? '모집 중' : '마감'}</span>
            </Link>
          ))}
        </div>
      )}
      {!ended && (
        <Link to={`/recruits/new?scheduleId=${schedule.id}`} className="gh-open">
          <IconPeople />이 일정으로 모집 열기
        </Link>
      )}
    </article>
  )
}

/** ⋮ 메뉴 — 수정 · 삭제. 지워도 연결된 모집은 남는다 */
function ScheduleOwnerMenu({ scheduleId, onError }: { scheduleId: number; onError: (message: string | null) => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const remove = useDeleteSchedule(scheduleId)
  const confirm = useConfirm()

  function leave() {
    queryClient.invalidateQueries({ queryKey: ['schedules', 'detail', scheduleId], refetchType: 'none' })
    navigate('/schedules', { replace: true })
  }

  async function handleDelete() {
    if (remove.isPending || !(await confirm({ title: '일정을 삭제할까요?', description: '연결된 모집은 남아요.', confirmLabel: '삭제', danger: true }))) return
    onError(null)
    remove.mutate(undefined, {
      onSuccess: leave,
      onError: (error) => {
        const apiError = toApiError(error)
        if (apiError.code === 'NOT_FOUND') leave()
        else onError(scheduleErrorMessage(apiError))
      },
    })
  }

  return (
    <PopMenu
      label="일정 메뉴 열기"
      actions={[
        { label: '고치기', icon: <IconPencil />, onSelect: () => navigate(`/schedules/${scheduleId}/edit`) },
        { label: '삭제', icon: <IconTrash />, danger: true, onSelect: handleDelete },
      ]}
    />
  )
}
