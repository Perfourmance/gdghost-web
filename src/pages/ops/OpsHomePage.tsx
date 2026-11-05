import { Link } from 'react-router'
import { LoadError } from '@/components/PageStates'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyCard } from '@/features/content/Cards'
import { questionCategoryLabel } from '@/features/content/labels'
import { authorName } from '@/features/member/author'
import { useOpsDashboard } from '@/features/ops/api'
import { StatTile } from '@/features/ops/OpsBits'
import { reportTargetLabel } from '@/features/ops/insights'
import type { ReactNode } from 'react'


/** 운영 홈 (S70) — 이번 주 숫자 · 3일 넘게 답 없는 질문 · 미처리 신고 · 확인 대기 인증 · 미확인 필독 */
export function OpsHomePage() {
  const dashboard = useOpsDashboard()

  if (dashboard.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }
  if (dashboard.isError) return <LoadError text="운영 홈을 불러오지 못했어요." onRetry={() => dashboard.refetch()} />

  const d = dashboard.data
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-2 text-sm font-bold text-muted-foreground">이번 주 (월요일부터)</h2>
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="새 질문" value={d.thisWeek.questionCount} />
          <StatTile label="답 없는 질문" value={d.thisWeek.unansweredCount} strong={d.thisWeek.unansweredCount > 0} />
          <StatTile label="추천 답변율" value={`${Math.round(d.thisWeek.routingConversionRate * 100)}%`} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <StatTile
            label="확인 대기 인증"
            value={`${d.pendingCertifications}건`}
            to="/ops/certifications"
            strong={d.pendingCertifications > 0}
          />
          <StatTile label="미처리 신고" value={`${d.openReports.total}건`} to="/ops/reports" strong={d.openReports.total > 0} />
        </div>
      </section>

      <Section title="3일 넘게 답 없는 질문" count={d.staleQuestions.total} moreTo={d.staleQuestions.total > d.staleQuestions.items.length ? '/ops/routing' : undefined}>
        {d.staleQuestions.items.length === 0 ? (
          <EmptyCard>모든 질문에 3일 안에 답이 달렸어요.</EmptyCard>
        ) : (
          d.staleQuestions.items.map((q) => (
            <Link key={q.id} to={`/questions/${q.id}`} className="block rounded-xl bg-card px-4 py-3 transition-colors hover:bg-accent">
              <p className="text-xs font-bold text-brand-text">
                {questionCategoryLabel(q.category)} · {q.waitingDays}일째
              </p>
              <p className="mt-1 line-clamp-1 text-[15px] font-bold text-title">{q.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {authorName(q.author)} · 보낸 선배 {q.sentCount}명 · 넘김 {q.passedCount}
              </p>
            </Link>
          ))
        )}
      </Section>

      <Section title="미처리 신고" count={d.openReports.total}>
        {d.openReports.items.length === 0 ? (
          <EmptyCard>처리할 신고가 없어요.</EmptyCard>
        ) : (
          d.openReports.items.map((r) => {
            const body = (
              <>
                <p className="text-xs font-bold text-brand-text">
                  {reportTargetLabel(r.targetType)}
                  {r.sameTargetCount > 1 && <span className="ml-1 text-destructive">신고 {r.sameTargetCount}건</span>}
                </p>
                {r.targetPreview && <p className="mt-1 line-clamp-1 text-sm text-foreground">{r.targetPreview}</p>}
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">사유: {r.reason}</p>
              </>
            )
            return r.targetLink ? (
              <Link key={r.id} to={r.targetLink} className="block rounded-xl bg-card px-4 py-3 transition-colors hover:bg-accent">
                {body}
              </Link>
            ) : (
              <div key={r.id} className="rounded-xl bg-card px-4 py-3">
                {body}
              </div>
            )
          })
        )}
        {d.openReports.total > 0 && (
          <Link to="/ops/reports" className="block text-center text-sm font-bold text-brand-text hover:underline">
            신고 처리하러 가기
          </Link>
        )}
      </Section>

      <Section title="확인이 덜 된 필독 공지">
        {d.unconfirmedMustRead.length === 0 ? (
          <EmptyCard>확인을 기다리는 필독 공지가 없어요.</EmptyCard>
        ) : (
          d.unconfirmedMustRead.map((n) => (
            <Link key={n.noticeId} to={`/notices/${n.noticeId}`} className="block rounded-xl bg-card px-4 py-3 transition-colors hover:bg-accent">
              <p className="line-clamp-1 text-[15px] font-bold text-title">{n.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {n.memberCount}명 중 <b className="text-brand-text">{n.confirmedCount}명</b> 확인
              </p>
            </Link>
          ))
        )}
      </Section>
    </div>
  )
}

function Section({ title, count, moreTo, children }: { title: string; count?: number; moreTo?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-title">
          {title} {count != null && <span className="text-brand-text">{count}</span>}
        </h2>
        {moreTo && (
          <Link to={moreTo} className="text-xs text-muted-foreground hover:text-foreground">
            더보기
          </Link>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}
