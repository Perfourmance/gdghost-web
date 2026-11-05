import { useState } from 'react'
import { MoreVertical, UsersRound } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button, buttonVariants } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { scheduleKindLabel } from '@/features/content/labels'
import { PersonName, RecruitStateBadge } from '@/features/recruits/RecruitBits'
import {
  scheduleErrorMessage,
  useDeleteSchedule,
  useScheduleDetail,
  type ScheduleDetail,
} from '@/features/schedules/api'
import { todayKst } from '@/features/schedules/calendar'
import { toApiError } from '@/lib/api'
import { formatDayRange } from '@/lib/time'

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
        <LockPanel next={location.pathname} title="일정 내용은 부원만 볼 수 있어요" buttonText="로그인하고 일정 보기" />
      </SubPageLayout>
    )
  }

  const notFound = !validId || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')
  const canEdit = detail.data != null && (detail.data.mine || me.role === 'STAFF')

  return (
    <SubPageLayout
      fallback="/schedules"
      actions={canEdit && <ScheduleOwnerMenu scheduleId={id} onError={setMenuError} />}
    >
      {notFound && (
        <div className="rounded-2xl bg-card px-6 py-10 text-center">
          <p className="text-lg font-bold text-title">일정을 찾을 수 없어요</p>
          <p className="mt-1 text-sm text-muted-foreground">삭제됐거나 없는 일정이에요.</p>
          <Link to="/schedules" replace className={buttonVariants({ size: 'lg', className: 'mt-6 h-12 w-full' })}>
            캘린더로
          </Link>
        </div>
      )}

      {!notFound && detail.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-4/5" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {!notFound && detail.isError && (
        <div className="space-y-3 rounded-xl bg-card p-5 text-center" role="alert">
          <p className="text-sm">일정을 불러오지 못했어요.</p>
          <Button variant="secondary" onClick={() => detail.refetch()}>
            다시 시도
          </Button>
        </div>
      )}

      {menuError && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {menuError}
        </p>
      )}

      {detail.data && <ScheduleBody schedule={detail.data} />}
    </SubPageLayout>
  )
}

function ScheduleBody({ schedule }: { schedule: ScheduleDetail }) {
  const ended = (schedule.endDate ?? schedule.startDate) < todayKst()
  return (
    <article>
      <p className="text-xs font-bold text-brand-text">
        {scheduleKindLabel(schedule.kind)}
        {schedule.isOfficial && <span className="ml-1.5 font-normal text-muted-foreground">공식</span>}
      </p>
      <h1 className="mt-1.5 text-[22px] leading-snug font-bold text-title">{schedule.title}</h1>

      <dl className="mt-5 space-y-2 rounded-xl bg-card px-4 py-3.5 text-sm">
        <div className="flex gap-3">
          <dt className="w-12 shrink-0 text-muted-foreground">날짜</dt>
          <dd className="font-bold text-title">
            {formatDayRange(schedule.startDate, schedule.endDate)}
            {ended && <span className="ml-1.5 font-normal text-muted-foreground">지난 일정</span>}
          </dd>
        </div>
        {schedule.place && (
          <div className="flex gap-3">
            <dt className="w-12 shrink-0 text-muted-foreground">장소</dt>
            <dd>{schedule.place}</dd>
          </div>
        )}
        <div className="flex gap-3">
          <dt className="w-12 shrink-0 text-muted-foreground">등록</dt>
          <dd>
            <PersonName person={schedule.author} />
            {schedule.updatedAt && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                {schedule.editedByStaff ? '· 운영진이 수정했어요' : '· 수정됨'}
              </span>
            )}
          </dd>
        </div>
      </dl>

      {schedule.memo && <LinkifiedText text={schedule.memo} className="mt-5 text-[15px] leading-relaxed" />}

      <section className="mt-8">
        <h2 className="text-base font-bold text-title">이 일정의 모집</h2>
        {schedule.relatedRecruits.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">아직 연결된 모집이 없어요. 함께 갈 사람을 모아 보세요.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {schedule.relatedRecruits.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/recruits?open=${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 hover:bg-accent"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-title">{r.title}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {r.joinedCount} / {r.capacity}명
                    </span>
                  </span>
                  <RecruitStateBadge state={r.state === 'OPEN' ? 'OPEN' : 'CLOSED'} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!ended && (
          <Link
            to={`/recruits/new?scheduleId=${schedule.id}`}
            className={buttonVariants({ variant: 'secondary', size: 'lg', className: 'mt-3 h-12 w-full' })}
          >
            <UsersRound aria-hidden />이 일정으로 모집 열기
          </Link>
        )}
      </section>
    </article>
  )
}

/** ⋮ 메뉴 — 수정 · 삭제. 지워도 연결된 모집은 남는다 */
function ScheduleOwnerMenu({ scheduleId, onError }: { scheduleId: number; onError: (message: string | null) => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const remove = useDeleteSchedule(scheduleId)

  function leave() {
    queryClient.invalidateQueries({ queryKey: ['schedules', 'detail', scheduleId], refetchType: 'none' })
    navigate('/schedules', { replace: true })
  }

  function handleDelete() {
    if (!window.confirm('일정을 삭제할까요? 연결된 모집은 그대로 남아요.')) return
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
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-10 items-center justify-center rounded-lg hover:bg-accent"
        aria-label="일정 메뉴 열기"
        disabled={remove.isPending}
      >
        <MoreVertical className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem onClick={() => navigate(`/schedules/${scheduleId}/edit`)}>수정</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
