import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Chip } from '@/components/Chip'
import { LoadError } from '@/components/PageStates'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyCard } from '@/features/content/Cards'
import {
  reportHandleErrorMessage,
  reportTargetLabel,
  useHandleReport,
  useOpsReports,
  type OpsReportItem,
  type ReportAction,
  type ReportState,
} from '@/features/ops/insights'
import { Pager } from '@/features/ops/OpsBits'
import { toApiError } from '@/lib/api'
import { formatDate } from '@/lib/time'
import { cn } from '@/lib/utils'

const STATES: { value: ReportState; label: string }[] = [
  { value: 'OPEN', label: '미처리' },
  { value: 'DISMISSED', label: '괜찮음' },
  { value: 'HIDDEN', label: '숨김' },
  { value: 'RESTORED', label: '되돌림' },
]
const stateLabel = (s: string) => STATES.find((x) => x.value === s)?.label ?? '기타'

/**
 * 운영 · 신고 처리 (S75) — 상태 필터, 같은 대상 신고 수, 대상 미리보기(숨긴 글도 보임).
 * 괜찮음 · 숨김 · 숨김 되돌리기(작성자가 지운 글은 없음). 남의 글을 지우는 길은 이것 하나
 */
export function OpsReportsPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('state')
  // 기본은 미처리, 'ALL'이면 전체
  const state = raw === 'ALL' ? null : ((STATES.find((s) => s.value === raw)?.value ?? 'OPEN') as ReportState)
  const page = Math.max(0, Number(params.get('page')) || 0)
  const list = useOpsReports(state, page)

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value == null) next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {STATES.map((s) => (
          <Chip key={s.value} selected={state === s.value} onClick={() => set('state', s.value === 'OPEN' ? null : s.value)}>
            {s.label}
          </Chip>
        ))}
        <Chip selected={state == null} onClick={() => set('state', 'ALL')}>
          전체
        </Chip>
      </div>
      {list.data && <p className="mt-3 text-xs text-muted-foreground">{list.data.total}건 · 작성자에게는 알리지 않아요</p>}
      <div className={cn('mt-2 space-y-2', list.isPlaceholderData && 'opacity-60')}>
        {list.isPending && [0, 1].map((i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
        {list.isError && <LoadError text="신고를 불러오지 못했어요." onRetry={() => list.refetch()} />}
        {list.isSuccess && list.data.items.length === 0 && (
          <EmptyCard>{state === 'OPEN' ? '처리할 신고가 없어요.' : '해당하는 신고가 없어요.'}</EmptyCard>
        )}
        {list.data?.items.map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </div>
      {list.data && <Pager page={list.data.page} size={list.data.size} total={list.data.total} onChange={(p) => set('page', String(p))} />}
    </div>
  )
}

function ReportCard({ report: r }: { report: OpsReportItem }) {
  const handle = useHandleReport()
  const [error, setError] = useState<string | null>(null)

  function act(action: ReportAction) {
    const confirmText: Record<ReportAction, string> = {
      DISMISS: '문제없는 글로 닫을까요? 같은 글의 다른 신고도 함께 닫혀요.',
      HIDE: '이 글을 숨길까요? 부원들에게 보이지 않게 돼요. 같은 글의 다른 신고도 함께 닫혀요.',
      RESTORE: '숨김을 되돌릴까요? 다시 부원들에게 보여요.',
    }
    if (!window.confirm(confirmText[action])) return
    setError(null)
    handle.mutate({ id: r.id, action }, { onError: (e) => setError(reportHandleErrorMessage(toApiError(e))) })
  }

  return (
    <article className="rounded-xl bg-card px-4 py-3.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-brand-text">{reportTargetLabel(r.targetType)}</span>
        {r.sameTargetCount > 1 && (
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] font-bold text-destructive">
            같은 글 신고 {r.sameTargetCount}건
          </span>
        )}
        <span
          className={cn(
            'ml-auto rounded px-1.5 py-0.5 text-[11px] font-bold',
            r.state === 'OPEN' ? 'bg-brand-soft text-brand-text' : 'bg-muted text-muted-foreground',
          )}
        >
          {stateLabel(r.state)}
        </span>
      </div>

      {/* 대상 미리보기 — 숨긴 글 · 지운 글도 운영진에게는 보인다 */}
      <div className="mt-2 rounded-lg bg-background px-3 py-2 text-sm">
        {r.targetPreview ? <p className="line-clamp-3 text-foreground">{r.targetPreview}</p> : <p className="text-muted-foreground">미리보기 없음</p>}
        {r.targetDeletedBy && (
          <p className="mt-1 text-xs text-muted-foreground">
            {r.targetDeletedBy === 'AUTHOR' ? '작성자가 지운 글이에요' : '운영진이 숨긴 글이에요'}
          </p>
        )}
        {r.targetLink && (
          <Link to={r.targetLink} className="mt-1 inline-block text-xs font-bold text-brand-text hover:underline">
            글 보러 가기
          </Link>
        )}
      </div>

      <p className="mt-2 text-sm">
        <span className="text-muted-foreground">사유</span> {r.reason}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {r.reporter.nickname ?? '탈퇴한 부원'} 신고 · {formatDate(r.createdAt)}
        {r.handledAt && ` · ${r.handledBy?.nickname ?? '탈퇴한 운영진'} 처리 ${formatDate(r.handledAt)}`}
      </p>

      {r.state === 'OPEN' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" className="h-10" disabled={handle.isPending} onClick={() => act('DISMISS')}>
            괜찮음
          </Button>
          <Button variant="destructive" className="h-10" disabled={handle.isPending} onClick={() => act('HIDE')}>
            숨기기
          </Button>
        </div>
      )}
      {r.state === 'HIDDEN' && r.targetDeletedBy !== 'AUTHOR' && (
        <Button variant="secondary" className="mt-3 h-10 w-full" disabled={handle.isPending} onClick={() => act('RESTORE')}>
          숨김 되돌리기
        </Button>
      )}
      {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
    </article>
  )
}
