import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Chip } from '@/components/Chip'
import { LoadError } from '@/components/PageStates'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyCard } from '@/features/content/Cards'
import { questionCategoryLabel } from '@/features/content/labels'
import { authorName } from '@/features/member/author'
import { useRoutingLogs, useRoutingStats, useStaleQuestions, type RoutingLogState } from '@/features/ops/insights'
import { Pager, StatTile } from '@/features/ops/OpsBits'
import { todayKst } from '@/features/schedules/calendar'
import { toApiError } from '@/lib/api'
import { formatDate } from '@/lib/time'
import { cn } from '@/lib/utils'

const pct = (rate: number) => `${Math.round(rate * 100)}%`

/** "2026-11-05"에서 days일 전 */
function daysBefore(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

/** 운영 · 라우팅 현황 (S74) — 기간 집계 · 3일 넘게 답 없는 질문 · 발송 이력 */
export function OpsRoutingPage() {
  return (
    <div className="space-y-10">
      <StatsSection />
      <StaleSection />
      <LogsSection />
    </div>
  )
}

function StatsSection() {
  const today = todayKst()
  const [from, setFrom] = useState(daysBefore(today, 29))
  const [to, setTo] = useState(today)
  const stats = useRoutingStats(from, to)
  const s = stats.data

  return (
    <section>
      <h2 className="text-base font-bold text-title">추천 · 지목 집계</h2>
      <div className="mt-2 flex items-center gap-2">
        <Input type="date" aria-label="시작일" max={to} className="h-10 bg-card" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        <span className="text-muted-foreground">–</span>
        <Input type="date" aria-label="끝나는 날" min={from} max={today} className="h-10 bg-card" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">보낸 시각 기준, 최대 1년. 운영진 알림은 따로 세요.</p>
      {stats.isError && (
        <p className="mt-2 text-sm text-destructive">
          {toApiError(stats.error).code === 'VALIDATION_FAILED' ? '기간은 최대 1년까지 볼 수 있어요.' : '집계를 불러오지 못했어요.'}
        </p>
      )}
      {stats.isPending && <Skeleton className="mt-3 h-32 w-full rounded-xl" />}
      {s && (
        <div className={cn('mt-3', stats.isPlaceholderData && 'opacity-60')}>
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="보냄" value={s.sentCount} />
            <StatTile label="답변함" value={s.answeredCount} />
            <StatTile label="넘김" value={s.passedCount} />
            <StatTile label="답변율" value={pct(s.conversionRate)} strong />
            <StatTile label="넘김 비율" value={pct(s.passRate)} />
            <StatTile label="AI 대신 규칙" value={pct(s.fallbackRate)} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">1시간 운영진 알림 {s.staffFirstCount}건</p>
          {s.byVersion.length > 0 && (
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-normal">추천 방식</th>
                  <th className="py-1 font-normal">보냄</th>
                  <th className="py-1 font-normal">답변율</th>
                  <th className="py-1 font-normal">넘김</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {s.byVersion.map((v) => (
                  <tr key={v.version} className="border-t">
                    <td className="py-1.5">{v.version}</td>
                    <td>{v.sentCount}</td>
                    <td>{pct(v.conversionRate)}</td>
                    <td>{pct(v.passRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  )
}

function StaleSection() {
  const [page, setPage] = useState(0)
  const list = useStaleQuestions(page)
  return (
    <Block title="3일 넘게 답 없는 질문" count={list.data?.total}>
      {list.isPending && <Skeleton className="h-24 w-full rounded-xl" />}
      {list.isError && <LoadError text="질문을 불러오지 못했어요." onRetry={() => list.refetch()} />}
      {list.isSuccess && list.data.items.length === 0 && <EmptyCard>모든 질문에 3일 안에 답이 달렸어요.</EmptyCard>}
      {list.data?.items.map((q) => (
        <Link key={q.id} to={`/questions/${q.id}`} className="block rounded-xl bg-card px-4 py-3 transition-colors hover:bg-accent">
          <p className="text-xs font-bold text-brand-text">
            {questionCategoryLabel(q.category)} · {q.waitingDays}일째
          </p>
          <p className="mt-1 line-clamp-1 text-[15px] font-bold text-title">{q.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {authorName(q.author)} · 보낸 선배 {q.sentCount}명 · 넘김 {q.passedCount}
          </p>
        </Link>
      ))}
      {list.data && <Pager page={list.data.page} size={list.data.size} total={list.data.total} onChange={setPage} />}
    </Block>
  )
}

const LOG_STATES: { value: RoutingLogState; label: string }[] = [
  { value: 'SENT', label: '전달됨' },
  { value: 'ANSWERED', label: '답변함' },
  { value: 'PASSED', label: '넘김' },
  { value: 'CANCELED', label: '취소' },
]
const STAGES: Record<string, string> = { MEMBER: 'AI 추천', DIRECT: '지목' }

function LogsSection() {
  const [state, setState] = useState<RoutingLogState | null>(null)
  const [page, setPage] = useState(0)
  const logs = useRoutingLogs(state, page)
  return (
    <Block title="발송 이력" count={logs.data?.total}>
      <div className="flex flex-wrap gap-2">
        <Chip selected={state == null} onClick={() => { setState(null); setPage(0) }}>
          전체
        </Chip>
        {LOG_STATES.map((s) => (
          <Chip key={s.value} selected={state === s.value} onClick={() => { setState(s.value); setPage(0) }}>
            {s.label}
          </Chip>
        ))}
      </div>
      {logs.isPending && <Skeleton className="h-24 w-full rounded-xl" />}
      {logs.isError && <LoadError text="이력을 불러오지 못했어요." onRetry={() => logs.refetch()} />}
      {logs.isSuccess && logs.data.items.length === 0 && <EmptyCard>이력이 없어요.</EmptyCard>}
      <div className={cn('space-y-2', logs.isPlaceholderData && 'opacity-60')}>
        {logs.data?.items.map((l) => (
          <div key={l.id} className="rounded-xl bg-card px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {STAGES[l.stage] ?? l.stage}
                {l.rankNo != null && ` ${l.rankNo}순위`}
              </span>
              <b className="text-title">{l.member.nickname ?? '탈퇴한 부원'}</b>
              <span className={cn('ml-auto text-xs font-bold', l.state === 'ANSWERED' ? 'text-brand-text' : 'text-muted-foreground')}>
                {LOG_STATES.find((s) => s.value === l.state)?.label ?? '기타'}
              </span>
            </div>
            <Link to={`/questions/${l.questionId}`} className="mt-1 line-clamp-1 block text-foreground hover:underline">
              {l.questionTitle}
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              보냄 {formatDate(l.sentAt)}
              {l.respondedAt && ` · 응답 ${formatDate(l.respondedAt)}`}
            </p>
            {l.scoreDetail && (
              <details className="mt-1 text-xs text-muted-foreground">
                <summary className="cursor-pointer">점수 보기</summary>
                <pre className="mt-1 overflow-x-auto rounded bg-background p-2 text-[11px] whitespace-pre-wrap">
                  {JSON.stringify(l.scoreDetail, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
      {logs.data && <Pager page={logs.data.page} size={logs.data.size} total={logs.data.total} onChange={setPage} />}
    </Block>
  )
}

function Block({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-bold text-title">
        {title} {count != null && <span className="text-brand-text">{count}</span>}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}
