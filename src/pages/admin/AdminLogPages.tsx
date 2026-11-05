import { useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Chip } from '@/components/Chip'
import { LoadError } from '@/components/PageStates'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useAiLogs, useBatchLogs, useErrorLog, useErrorLogs, type AiKind, type AiState } from '@/features/admin/api'
import { EmptyCard } from '@/features/content/Cards'
import { StatTile } from '@/features/ops/OpsBits'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'

interface CursorList {
  isPending: boolean
  isError: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => unknown
  refetch: () => unknown
}

/** 로그 목록 공통 — 불러오는 중 · 실패 · 비었음 · 더보기 */
function LogList({ list, empty, count, children }: { list: CursorList; empty: string; count: number; children: ReactNode }) {
  return (
    <div className="mt-3 space-y-2">
      {list.isPending && [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      {list.isError && <LoadError text="로그를 불러오지 못했어요." onRetry={() => list.refetch()} />}
      {!list.isPending && !list.isError && count === 0 && <EmptyCard>{empty}</EmptyCard>}
      {children}
      {list.hasNextPage && (
        <Button variant="secondary" className="w-full" disabled={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
          {list.isFetchingNextPage ? '불러오는 중…' : '더보기'}
        </Button>
      )}
    </div>
  )
}

const SINCE: { label: string; hours: number | null }[] = [
  { label: '전체', hours: null },
  { label: '24시간', hours: 24 },
  { label: '7일', hours: 24 * 7 },
]

/** 에러 로그 — 같은 에러는 한 줄에 횟수로, 누르면 스택 */
export function AdminErrorsPage() {
  const [text, setText] = useState('')
  const q = useDebouncedValue(text.trim(), 400) || null
  const [sinceHours, setSinceHours] = useState<number | null>(null)
  // 고를 때 한 번 정한다 (렌더마다 바뀌면 다시 불러옴)
  const [since, setSince] = useState<string | null>(null)
  const list = useErrorLogs(q, since)
  const [openId, setOpenId] = useState<number | null>(null)
  const items = list.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          aria-label="에러 검색"
          maxLength={100}
          placeholder="메시지 · 경로"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-base outline-none placeholder:text-muted-foreground md:text-sm"
        />
      </div>
      <div className="mt-3 flex gap-2">
        {SINCE.map((s) => (
          <Chip
            key={s.label}
            selected={sinceHours === s.hours}
            onClick={() => {
              setSinceHours(s.hours)
              setSince(s.hours == null ? null : new Date(Date.now() - s.hours * 3600_000).toISOString())
            }}
          >
            {s.label}
          </Chip>
        ))}
      </div>
      <LogList list={list} empty="에러가 없어요." count={items.length}>
        {items.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setOpenId(e.id)}
            className="block w-full rounded-xl bg-card px-4 py-3 text-left transition-colors hover:bg-accent"
          >
            <div className="flex items-start gap-2">
              <p className="line-clamp-2 flex-1 text-sm font-bold break-all text-title">{e.message}</p>
              <span className="shrink-0 rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] font-bold text-destructive tabular-nums">
                {e.count}회
              </span>
            </div>
            <p className="mt-1 text-xs break-all text-muted-foreground">
              {e.path ?? '경로 없음'} · 마지막 {formatDateTime(e.lastAt)}
            </p>
          </button>
        ))}
      </LogList>
      <ErrorSheet id={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}

function ErrorSheet({ id, onClose }: { id: number | null; onClose: () => void }) {
  const detail = useErrorLog(id)
  const d = detail.data
  return (
    <Sheet open={id != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] max-w-md gap-0 overflow-y-auto rounded-t-2xl border-0 bg-card px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <SheetTitle className="pr-8 text-base font-bold break-all text-title">{d?.message ?? '에러'}</SheetTitle>
        <SheetDescription className="mt-1 text-xs break-all text-muted-foreground">
          {d ? `${d.path ?? '경로 없음'} · ${d.count}회 · 처음 ${formatDateTime(d.firstAt)} · 마지막 ${formatDateTime(d.lastAt)}` : ' '}
        </SheetDescription>
        {detail.isPending && <Skeleton className="mt-4 h-40 w-full" />}
        {detail.isError && <p className="mt-4 text-sm text-destructive">불러오지 못했어요.</p>}
        {d && (
          <>
            <p className="mt-3 text-xs text-muted-foreground">fingerprint {d.fingerprint}</p>
            <pre className="mt-2 max-h-[55dvh] overflow-auto rounded-lg bg-background p-3 text-[11px] leading-relaxed">
              {d.stack ?? '스택 없음'}
            </pre>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

/** 배치 로그 — 최근 24시간 실패 수, 작업 이름 · 결과로 거르기 */
export function AdminBatchesPage() {
  const [text, setText] = useState('')
  const jobName = useDebouncedValue(text.trim(), 400) || null
  const [state, setState] = useState<'SUCCESS' | 'FAILED' | null>(null)
  const list = useBatchLogs(jobName, state)
  const items = list.data?.pages.flatMap((p) => p.items) ?? []
  const failed = list.data?.pages[0]?.summary.last24hFailed

  return (
    <div>
      <StatTile label="최근 24시간 실패" value={failed ?? '-'} strong={(failed ?? 0) > 0} />
      <input
        aria-label="작업 이름"
        maxLength={50}
        placeholder="작업 이름 (예: upload_cleanup_nightly)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-3 h-10 w-full rounded-lg border border-input bg-card px-3 text-base outline-none placeholder:text-muted-foreground md:text-sm"
      />
      <div className="mt-3 flex gap-2">
        <Chip selected={state == null} onClick={() => setState(null)}>
          전체
        </Chip>
        <Chip selected={state === 'SUCCESS'} onClick={() => setState('SUCCESS')}>
          성공
        </Chip>
        <Chip selected={state === 'FAILED'} onClick={() => setState('FAILED')}>
          실패
        </Chip>
      </div>
      <LogList list={list} empty="배치 기록이 없어요." count={items.length}>
        {items.map((b) => (
          <div key={b.id} className="rounded-xl bg-card px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <b className="min-w-0 truncate text-title">{b.jobName}</b>
              <StateTag ok={b.state === 'SUCCESS'}>{b.state === 'SUCCESS' ? '성공' : b.state === 'FAILED' ? '실패' : b.state}</StateTag>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(b.startedAt)}
              {b.durationMs != null && ` · ${b.durationMs < 1000 ? `${b.durationMs}ms` : `${(b.durationMs / 1000).toFixed(1)}초`}`}
              {b.endedAt == null && ' · 끝나지 않음'}
            </p>
            {b.message && <p className="mt-1 text-xs break-all text-foreground">{b.message}</p>}
          </div>
        ))}
      </LogList>
    </div>
  )
}

const AI_KINDS: { value: AiKind; label: string }[] = [
  { value: 'EMBED_QUESTION', label: '질문 임베딩' },
  { value: 'EMBED_MEMBER', label: '부원 임베딩' },
  { value: 'FIND_SENIOR', label: '선배 찾기' },
]
const AI_STATES: { value: AiState; label: string }[] = [
  { value: 'SUCCESS', label: '성공' },
  { value: 'FALLBACK', label: '규칙으로 대신' },
  { value: 'FAILED', label: '실패' },
]

/** AI 로그 — 최근 7일 요약(성공률 · 대신 쓴 비율 · p95), 종류 · 결과로 거르기 */
export function AdminAiPage() {
  const [kind, setKind] = useState<AiKind | null>(null)
  const [state, setState] = useState<AiState | null>(null)
  const list = useAiLogs(kind, state)
  const items = list.data?.pages.flatMap((p) => p.items) ?? []
  const s = list.data?.pages[0]?.summary.last7d

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">최근 7일 (거르기와 상관없이)</p>
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="호출" value={s?.total ?? '-'} />
        <StatTile label="성공률" value={s ? `${Math.round(s.successRate * 100)}%` : '-'} strong />
        <StatTile label="규칙으로 대신" value={s ? `${Math.round(s.fallbackRate * 100)}%` : '-'} />
        <StatTile label="p95 응답" value={s?.p95LatencyMs != null ? `${s.p95LatencyMs}ms` : '-'} />
      </div>
      <div className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex w-max gap-2">
          <Chip selected={kind == null} onClick={() => setKind(null)}>
            모든 종류
          </Chip>
          {AI_KINDS.map((k) => (
            <Chip key={k.value} selected={kind === k.value} onClick={() => setKind(kind === k.value ? null : k.value)}>
              {k.label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Chip selected={state == null} onClick={() => setState(null)}>
          모든 결과
        </Chip>
        {AI_STATES.map((k) => (
          <Chip key={k.value} selected={state === k.value} onClick={() => setState(state === k.value ? null : k.value)}>
            {k.label}
          </Chip>
        ))}
      </div>
      <LogList list={list} empty="AI 호출 기록이 없어요." count={items.length}>
        {items.map((a) => (
          <div key={a.id} className="rounded-xl bg-card px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <b className="text-title">{AI_KINDS.find((k) => k.value === a.kind)?.label ?? a.kind}</b>
              {a.targetId != null && <span className="text-xs text-muted-foreground">#{a.targetId}</span>}
              <StateTag ok={a.state === 'SUCCESS'}>{AI_STATES.find((k) => k.value === a.state)?.label ?? a.state}</StateTag>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(a.createdAt)}
              {a.model && ` · ${a.model}`}
              {a.latencyMs != null && ` · ${a.latencyMs}ms`}
            </p>
          </div>
        ))}
      </LogList>
    </div>
  )
}

function StateTag({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'ml-auto shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold',
        ok ? 'bg-brand-soft text-brand-text' : 'bg-destructive/10 text-destructive',
      )}
    >
      {children}
    </span>
  )
}
