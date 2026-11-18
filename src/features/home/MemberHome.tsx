import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { EmptyState, Ghost, IconCalendar, Lab, Pill, StoryTopBar } from '@/components/story'
import type { Me } from '@/features/auth/session'
import { questionCategoryLabel, scheduleKindLabel, shareCategoryLabel } from '@/features/content/labels'
import { useHome, type HomeSchedule } from '@/features/home/useHome'
import { authorName } from '@/features/member/author'
import { colorOf, SHARE_COLORS } from '@/lib/categoryColors'
import { formatDay, formatRelative, useNowEveryMinute } from '@/lib/time'
import { cn } from '@/lib/utils'
import '@/styles/home.css'

const pct = (px: number) => `${(px / 390) * 100}%`

function dDayText(s: HomeSchedule): string | null {
  if (s.dDay == null) return null
  return s.dDay < 0 ? '지남' : s.dDay === 0 ? 'D-DAY' : `D-${s.dDay}`
}

/** "11.21(토) ~ 11.22(일)" (제목 글꼴에 en dash가 없어 ~) */
function dayRange(s: HomeSchedule): string {
  return s.endDate && s.endDate !== s.startDate ? `${formatDay(s.startDate)} ~ ${formatDay(s.endDate)}` : formatDay(s.startDate)
}

function IconPlace() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  )
}

/**
 * 회원 홈 (S10) — 시안 home-final '오늘 밤 별자리'.
 * 밤하늘 별자리(필독 공지 · 가장 가까운 일정 · 새 질문) → 서랍: 다가오는 날 · 마을 게시판 · 새로 온 질문 · 많이 담아 간 공유
 */
export function MemberHome({ me }: { me: Me }) {
  const home = useHome()
  const now = useNowEveryMinute()
  const data = home.data
  const mustRead = data?.unconfirmedMustReadCount ?? me.unconfirmedMustReadCount
  const next = data?.upcomingSchedules[0]
  const notices = data ? [...data.pinnedNotices].sort((a, b) => Number(!!b.isMustRead) - Number(!!a.isMustRead)) : []

  return (
    <div className="gh-home">
      <section className="gh-home-sky">
        <StoryTopBar unread={me.unreadNotificationCount} />
        <div className="gh-home-hi">
          <p>GDGoC SMU</p>
          <h1>
            안녕하세요,
            <br />
            {me.nickname}님
          </h1>
          <p>오늘 밤 마을 소식을 모아 왔어요</p>
        </div>
        <span className="gh-home-glow" aria-hidden />
        <Ghost pose="star" className="gh-home-float" />
        <Ghost pose="thread" className="gh-home-thread" />

        <nav className="gh-cons" aria-label="오늘 밤 소식">
          <svg viewBox="0 0 390 250" preserveAspectRatio="none" fill="none" stroke="rgba(245,185,82,.45)" strokeWidth="1.2" strokeDasharray="3 5" aria-hidden>
            <path d="M123 197 C 140 150, 66 128, 84 60 L205 140 L312 92" />
          </svg>
          <Link to="/notices" className={cn(mustRead === 0 && 'is-dim')} style={{ left: pct(84), top: 60 }}>
            <i aria-hidden />
            {mustRead > 0 ? (
              <b>
                <span>필독 공지</span> <em>{mustRead}</em>
              </b>
            ) : (
              <b>
                <span>마을 게시판</span>
              </b>
            )}
          </Link>
          <Link
            to={next ? `/schedules/${next.id}` : '/schedules'}
            className={cn('is-big', !next && 'is-dim')}
            style={{ left: pct(205), top: 140 }}
          >
            <i aria-hidden />
            <b>
              <span>{next ? next.title : '다가오는 날'}</span>
              {next && dDayText(next) && <em>{dDayText(next)}</em>}
            </b>
          </Link>
          <Link
            to="/questions"
            className={cn(data && data.recentQuestions.length === 0 && 'is-dim')}
            style={{ left: pct(312), top: 92 }}
          >
            <i aria-hidden />
            <b>
              <span>새로 온 질문</span>
            </b>
          </Link>
        </nav>
      </section>

      <main className="gh-drawer">
        {home.isPending && (
          <div aria-label="불러오는 중">
            {[0, 1, 2].map((i) => (
              <div key={i} className="gh-home-skel" />
            ))}
          </div>
        )}
        {home.isError && (
          <EmptyState
            row
            pose="shh"
            title="마을 소식을 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => home.refetch()}>
                다시 시도
              </Pill>
            }
          />
        )}

        {data && (
          <>
            <div className="gh-hsh">
              <h2>다가오는 날</h2>
              <Link to="/schedules">더보기</Link>
            </div>
            {next ? (
              <Link to={`/schedules/${next.id}`} className="gh-lantern">
                {dDayText(next) && <span className="gh-dd">{dDayText(next)}</span>}
                <Lab>
                  {scheduleKindLabel(next.kind)}
                  {next.isOfficial && ' · 공식'}
                </Lab>
                <h3>{next.title}</h3>
                <div className="gh-row">
                  <span>
                    <IconCalendar />
                    {dayRange(next)}
                  </span>
                  {next.place && (
                    <span>
                      <IconPlace />
                      {next.place}
                    </span>
                  )}
                </div>
              </Link>
            ) : (
              <EmptyState row pose="star" title="다가오는 날이 없어요">
                새 일정이 뜨면 여기 밝혀 둘게요.
              </EmptyState>
            )}

            {notices.length > 0 && (
              <>
                <div className="gh-hsh">
                  <h2>마을 게시판</h2>
                  <Link to="/notices">더보기</Link>
                </div>
                {notices.map((n) => (
                  <Link key={n.id} to={`/notices/${n.id}`} className={cn('gh-env', n.isMustRead && 'is-must', n.read === false && 'is-unread')}>
                    <span className="gh-seal">{n.isMustRead ? '필독' : '공지'}</span>
                    <p>{n.title}</p>
                    {n.read === false && <span className="sr-only">읽지 않음</span>}
                    <span className="gh-ch" aria-hidden>
                      ›
                    </span>
                  </Link>
                ))}
              </>
            )}

            <div className="gh-hsh">
              <h2>새로 온 질문</h2>
              <Link to="/questions">더보기</Link>
            </div>
            {data.recentQuestions.length === 0 ? (
              <EmptyState row pose="glass" title="아직 질문이 없어요">
                첫 질문이 오면 여기 띄워 둘게요.
              </EmptyState>
            ) : (
              <div className="gh-rail">
                {data.recentQuestions.map((q) => (
                  <Link key={q.id} to={`/questions/${q.id}`} className="gh-qc">
                    <Lab>{questionCategoryLabel(q.category)}</Lab>
                    <h3>{q.title}</h3>
                    <div className="gh-m">
                      {authorName(q.author)} · {formatRelative(q.createdAt, now)}
                      <b className={cn(q.answerCount === 0 && 'is-none')}>{q.answerCount === 0 ? '답변 대기' : `답변 ${q.answerCount}`}</b>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="gh-hsh">
              <h2>많이 담아 간 공유</h2>
              <Link to="/shares">더보기</Link>
            </div>
            {data.popularShares.length === 0 ? (
              <EmptyState row pose="glass" title="이번 주엔 아직 없어요">
                저장된 글이 생기면 여기 꽂아 둘게요.
              </EmptyState>
            ) : (
              <div className="gh-marks">
                {data.popularShares.map((s) => (
                  <Link
                    key={s.id}
                    to={`/shares/${s.id}`}
                    className="gh-mk"
                    style={{ '--c': colorOf(SHARE_COLORS, s.category) } as CSSProperties}
                  >
                    <Lab>{shareCategoryLabel(s.category)}</Lab>
                    <h4>{s.title}</h4>
                    <div className="gh-m">
                      <span>{s.tags?.length ? s.tags.map((t) => `#${t}`).join(' ') : ''}</span>
                      {s.saveCount != null && <b>★ {s.saveCount}</b>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
