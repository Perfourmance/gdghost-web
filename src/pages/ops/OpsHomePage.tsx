import { Link } from 'react-router'
import { Calm, EmptyState, IconFlag, IconSend, Lab, LampGrid, LampStat, Pill } from '@/components/story'
import { questionCategoryLabel } from '@/features/content/labels'
import { authorName } from '@/features/member/author'
import { useOpsDashboard } from '@/features/ops/api'
import { reportTargetLabel } from '@/features/ops/insights'
import { cn } from '@/lib/utils'

/** 운영 홈 (S70) — 시안 admin-final. 이번 주 등불(손볼 게 있는 칸만 켜짐) · 3일 넘게 답 없는 질문 · 미처리 신고 · 미확인 필독 */
export function OpsHomePage() {
  const dashboard = useOpsDashboard()

  if (dashboard.isPending) return <div className="gh-ops-skel" aria-label="불러오는 중" />
  if (dashboard.isError) {
    return (
      <div className="pt-6">
        <EmptyState
          row
          pose="shh"
          title="운영 홈을 불러오지 못했어요"
          action={
            <Pill soft className="mt-2" onClick={() => dashboard.refetch()}>
              다시 시도
            </Pill>
          }
        />
      </div>
    )
  }

  const d = dashboard.data
  return (
    <>
      <h2 className="gh-ops-sh">
        이번 주 등불<small>월요일부터</small>
      </h2>
      <div className="mt-4">
        <LampGrid>
          <LampStat label="새 질문" value={d.thisWeek.questionCount} />
          <LampStat label="답 없는 질문" value={d.thisWeek.unansweredCount} lit={d.thisWeek.unansweredCount > 0} />
          <LampStat label="추천 답변율" value={Math.round(d.thisWeek.routingConversionRate * 100)} unit="%" />
        </LampGrid>
        <div className="mt-2.5">
          <LampGrid columns={2}>
            <Link to="/ops/certifications">
              <LampStat label="확인 대기 인증" value={d.pendingCertifications} unit="건" lit={d.pendingCertifications > 0} />
            </Link>
            <Link to="/ops/reports">
              <LampStat label="미처리 신고" value={d.openReports.total} unit="건" lit={d.openReports.total > 0} />
            </Link>
          </LampGrid>
        </div>
      </div>

      <h2 className="gh-ops-sh">
        3일 넘게 답 없는 질문<em className={cn(d.staleQuestions.total === 0 && 'is-zero')}>{d.staleQuestions.total}</em>
        {d.staleQuestions.total > d.staleQuestions.items.length && <Link to="/ops/routing">더보기</Link>}
      </h2>
      {d.staleQuestions.items.length === 0 ? (
        <Calm>모든 질문에 3일 안에 답장이 닿았어요.</Calm>
      ) : (
        d.staleQuestions.items.map((q) => (
          <Link key={q.id} to={`/questions/${q.id}`} className="gh-oq">
            <div className="gh-t">
              <Lab>{questionCategoryLabel(q.category)}</Lab>
              <em>{q.waitingDays}일째</em>
            </div>
            <h3>{q.title}</h3>
            <div className="gh-m">
              {authorName(q.author)}
              <span>
                <IconSend />
                보낸 선배 {q.sentCount}
              </span>
              <span>넘김 {q.passedCount}</span>
            </div>
          </Link>
        ))
      )}

      <h2 className="gh-ops-sh">
        미처리 신고<em className={cn(d.openReports.total === 0 && 'is-zero')}>{d.openReports.total}</em>
      </h2>
      {d.openReports.items.length === 0 ? (
        <Calm>처리할 신고가 없어요.</Calm>
      ) : (
        <>
          {d.openReports.items.map((r) => {
            const body = (
              <>
                <div className="gh-t">
                  <Lab tone="amber">{reportTargetLabel(r.targetType)}</Lab>
                  {r.sameTargetCount > 1 && (
                    <em className="is-bad">
                      <IconFlag className="mr-1 inline size-3" />
                      신고 {r.sameTargetCount}건
                    </em>
                  )}
                </div>
                {r.targetPreview && <h3>{r.targetPreview}</h3>}
                <p>사유: {r.reason}</p>
              </>
            )
            return r.targetLink ? (
              <Link key={r.id} to={r.targetLink} className="gh-oq is-plain">
                {body}
              </Link>
            ) : (
              <div key={r.id} className="gh-oq is-plain">
                {body}
              </div>
            )
          })}
          <Link to="/ops/reports" className="gh-ops-go">
            신고 처리하러 가기 ›
          </Link>
        </>
      )}

      <h2 className="gh-ops-sh">확인이 덜 된 필독 공지</h2>
      {d.unconfirmedMustRead.length === 0 ? (
        <Calm>확인할 필독 공지가 없어요.</Calm>
      ) : (
        d.unconfirmedMustRead.map((n) => (
          <Link key={n.noticeId} to={`/notices/${n.noticeId}`} className="gh-oq is-plain">
            <h3 className="!mt-0">{n.title}</h3>
            <div className="gh-m">
              <span>
                {n.memberCount}명 중 <b>{n.confirmedCount}명</b> 확인
              </span>
            </div>
          </Link>
        ))
      )}
    </>
  )
}
